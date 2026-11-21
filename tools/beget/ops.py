#!/usr/bin/env python3
"""Админка сервера «Вектора» — https://<домен>/ops/
Ключ для Бипыча, перенос данных из облака, обновление, бэкап, состояние и журналы — без консоли.

Безопасность:
  • первый вход — по одноразовому коду из итога установки (действует 2 часа), затем свой пароль;
  • пароль хранится как PBKDF2-хэш (/opt/vektor/ops-pass, права 600), сессия — cookie HttpOnly+Secure+SameSite=Strict;
  • 5 неверных паролей с одного адреса — блокировка на 15 минут;
  • POST только с заголовком X-Ops и своего домена; ключи и строки подключения не пишутся в журналы и не отдаются обратно.
Слушает только 127.0.0.1 — снаружи доступна через Caddy по пути /ops.
"""
import hashlib, hmac, json, os, re, secrets, shutil, subprocess, threading, time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.environ.get('VEKTOR_ROOT', '/opt/vektor')
PORT = int(os.environ.get('VEKTOR_OPS_PORT', '8099'))
PASS, SETUP, JOBLOG = f'{ROOT}/ops-pass', f'{ROOT}/ops-setup', f'{ROOT}/ops-job.log'
SESS, FAILS, LOCK = {}, {}, threading.Lock()
JOB = {'name': None, 'proc': None, 'started': 0, 'ended': 0, 'rc': None}
JOBS = {  # имя → аргументы install.sh; value уходит в stdin и больше никуда
    'ai_proxyapi': ['ai-set', 'proxyapi'], 'ai_beget': ['ai-set', 'beget'],
    'data': ['data-set'], 'update': ['install'], 'backup': ['backup-now'], 'check': ['status'], 'rootpw': ['rootpw-set'],
}
TITLES = {'ai_proxyapi': 'Подключение Бипыча через ProxyAPI', 'ai_beget': 'Подключение Бипыча через ИИ-шлюз Beget',
          'data': 'Перенос данных из облака', 'update': 'Обновление сервера', 'backup': 'Бэкап', 'check': 'Проверка', 'rootpw': 'Смена пароля root'}


def read(p, default=''):
    try:
        with open(p, encoding='utf-8', errors='replace') as f: return f.read()
    except OSError: return default


def write600(p, text):
    fd = os.open(p, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(fd, 'w') as f: f.write(text)


SECRET = re.compile(r'(postgres(ql)?://\S+|sk-[A-Za-z0-9_-]{8,}|(?i:(key|token|password|secret)\s*[=:]\s*)\S+)')
def scrub(t): return SECRET.sub('•••', t)
def tail(p, n=40): return scrub('\n'.join(read(p).splitlines()[-n:]))


def hpw(pw, salt): return hashlib.pbkdf2_hmac('sha256', pw.encode(), salt, 300_000).hex()
def pw_ok(pw):
    try: d = json.loads(read(PASS))
    except ValueError: return False
    return hmac.compare_digest(hpw(pw, bytes.fromhex(d['salt'])), d['hash'])
def pw_set(pw):
    salt = secrets.token_bytes(16); write600(PASS, json.dumps({'salt': salt.hex(), 'hash': hpw(pw, salt)}))


def setup_code():
    try: d = json.loads(read(SETUP))
    except ValueError: return None
    return d if d.get('until', 0) > time.time() else None


def sh(*args, timeout=10):
    try: return subprocess.run(args, capture_output=True, text=True, timeout=timeout).stdout
    except Exception: return ''


def provider():
    env = read(f'{ROOT}/functions.env')
    if re.search(r'^AI_URL=', env, re.M): return 'ИИ-шлюз Beget'
    if re.search(r'^OPENROUTER_URL=https://api\.proxyapi', env, re.M): return 'ProxyAPI'
    if re.search(r'^OPENROUTER_API_KEY=.+', env, re.M): return 'OpenRouter'
    return ''


def status():
    mem = dict(re.findall(r'^(\w+):\s+(\d+)', read('/proc/meminfo'), re.M))
    du = shutil.disk_usage('/')
    rows = [l.split('\t') for l in sh('docker', 'ps', '-a', '--format', '{{.Names}}\t{{.Status}}').splitlines() if '\t' in l]
    backups = sorted((f for f in os.listdir(f'{ROOT}/backups') if f.endswith('.dump')), reverse=True) if os.path.isdir(f'{ROOT}/backups') else []
    last = backups[0] if backups else ''
    with LOCK:
        job = {'name': JOB['name'], 'title': TITLES.get(JOB['name'] or '', ''), 'running': bool(JOB['proc'] and JOB['proc'].poll() is None),
               'rc': JOB['rc'], 'started': JOB['started'], 'ended': JOB['ended']}
    return {
        'domain': read(f'{ROOT}/domain').strip(), 'provider': provider(),
        'data': os.path.exists(f'{ROOT}/.data-copied'), 'autoupdate': os.path.exists('/etc/cron.d/vektor-update'),
        'mem': {'total': int(mem.get('MemTotal', 0)) // 1024, 'free': int(mem.get('MemAvailable', 0)) // 1024},
        'disk': {'total': du.total // 2**30, 'free': du.free // 2**30},
        'containers': [{'name': n, 'status': s, 'ok': s.startswith('Up') and 'unhealthy' not in s and 'starting' not in s} for n, s in rows],
        'backup': {'last': last, 'size': os.path.getsize(f'{ROOT}/backups/{last}') // 1024 if last else 0, 'count': len(backups)},
        'job': job, 'joblog': tail(JOBLOG, 60), 'updatelog': tail(f'{ROOT}/update.log', 12), 'backuplog': tail(f'{ROOT}/backup.log', 5),
    }


def start_job(name, value):
    with LOCK:
        if JOB['proc'] and JOB['proc'].poll() is None: return 'Уже выполняется: ' + TITLES.get(JOB['name'], '')
        script = f'{ROOT}/install.sh'
        if not os.path.exists(script): return 'Нет /opt/vektor/install.sh — запустите установку'
        log = open(JOBLOG, 'w')
        env = {'PATH': '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin', 'HOME': '/root', 'LANG': 'C.UTF-8'}
        p = subprocess.Popen(['bash', script, *JOBS[name]], stdin=subprocess.PIPE, stdout=log, stderr=subprocess.STDOUT, env=env, cwd=ROOT, start_new_session=True)
        try: p.stdin.write((value or '').encode()); p.stdin.close()
        except OSError: pass
        JOB.update(name=name, proc=p, started=int(time.time()), ended=0, rc=None)
    def wait():
        rc = p.wait()
        with LOCK: JOB.update(rc=rc, ended=int(time.time()))
    threading.Thread(target=wait, daemon=True).start()
    return None


class H(BaseHTTPRequestHandler):
    server_version = 'vektor-ops'
    def log_message(self, *a): pass  # без журналов запросов: в них не должно оказаться ничего лишнего

    def ip(self): return (self.headers.get('X-Forwarded-For') or self.client_address[0]).split(',')[0].strip()
    def sid(self):
        m = re.search(r'(?:^|;\s*)ops=([A-Za-z0-9_-]{20,})', self.headers.get('Cookie', ''))
        if not m: return None
        s = m.group(1)
        with LOCK:
            if SESS.get(s, 0) > time.time(): return s
            SESS.pop(s, None)
        return None

    def send(self, code, body, ctype='application/json; charset=utf-8', cookie=None):
        data = body if isinstance(body, bytes) else (json.dumps(body, ensure_ascii=False) if not isinstance(body, str) else body).encode()
        self.send_response(code)
        self.send_header('Content-Type', ctype); self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Frame-Options', 'DENY'); self.send_header('Referrer-Policy', 'no-referrer')
        if cookie: self.send_header('Set-Cookie', cookie)
        self.send_header('Content-Length', str(len(data))); self.end_headers(); self.wfile.write(data)

    def login(self):
        s = secrets.token_urlsafe(32)
        with LOCK: SESS[s] = time.time() + 12 * 3600
        return f'ops={s}; Path=/ops; HttpOnly; Secure; SameSite=Strict; Max-Age=43200'

    def do_GET(self):
        path = self.path.split('?')[0]
        if path in ('/ops', '/ops/'): return self.send(200, PAGE, 'text/html; charset=utf-8')
        if path == '/ops/api/state': return self.send(200, {'authed': bool(self.sid()), 'setup': not os.path.exists(PASS), 'code': bool(setup_code())})
        if path == '/ops/api/status':
            return self.send(200, status()) if self.sid() else self.send(401, {'error': 'Нужно войти'})
        self.send(404, {'error': 'нет такого адреса'})

    def do_POST(self):
        path = self.path.split('?')[0]
        dom = read(f'{ROOT}/domain').strip()
        origin = self.headers.get('Origin')
        if self.headers.get('X-Ops') != '1' or (origin and dom and origin != f'https://{dom}'):
            return self.send(403, {'error': 'Запрос не из админки'})
        try:
            n = int(self.headers.get('Content-Length') or 0)
            body = json.loads(self.rfile.read(min(n, 20000)) or b'{}')
        except ValueError: return self.send(400, {'error': 'Плохой запрос'})
        ip = self.ip()
        if path in ('/ops/api/login', '/ops/api/setup'):
            with LOCK:
                c, until = FAILS.get(ip, (0, 0))
                if until > time.time(): return self.send(429, {'error': 'Слишком много попыток. Подождите 15 минут.'})
            if path == '/ops/api/setup':
                d, code, pw = setup_code(), str(body.get('code', '')).strip().upper(), str(body.get('password', ''))
                if os.path.exists(PASS): return self.send(409, {'error': 'Пароль уже задан — войдите'})
                if not d or not hmac.compare_digest(code, d['code']): ok = False
                elif len(pw) < 10: return self.send(400, {'error': 'Пароль — не короче 10 символов'})
                else:
                    pw_set(pw); os.remove(SETUP); ok = True
            else:
                ok = os.path.exists(PASS) and pw_ok(str(body.get('password', '')))
            if not ok:
                with LOCK:
                    c = FAILS.get(ip, (0, 0))[0] + 1
                    FAILS[ip] = (c, time.time() + 900 if c >= 5 else 0)
                return self.send(401, {'error': 'Неверный код или пароль'})
            with LOCK: FAILS.pop(ip, None)
            return self.send(200, {'ok': True}, cookie=self.login())
        s = self.sid()
        if not s: return self.send(401, {'error': 'Нужно войти'})
        if path == '/ops/api/logout':
            with LOCK: SESS.pop(s, None)
            return self.send(200, {'ok': True}, cookie='ops=; Path=/ops; HttpOnly; Secure; SameSite=Strict; Max-Age=0')
        if path == '/ops/api/job':
            name, value = body.get('name'), str(body.get('value') or '').strip()
            if name not in JOBS: return self.send(400, {'error': 'Неизвестное действие'})
            if name.startswith('ai_') and not re.fullmatch(r'[A-Za-z0-9._:-]{10,400}', value): return self.send(400, {'error': 'Похоже, это не ключ: вставьте ключ целиком'})
            if name == 'rootpw' and not (12 <= len(value) <= 200 and ':' not in value and '\n' not in value): return self.send(400, {'error': 'Пароль root — не короче 12 символов, без двоеточия'})
            if name == 'data' and not re.fullmatch(r'postgres(ql)?://\S{10,1000}', value): return self.send(400, {'error': 'Строка должна начинаться с postgresql://'})
            err = start_job(name, value)
            return self.send(409, {'error': err}) if err else self.send(200, {'ok': True})
        self.send(404, {'error': 'нет такого адреса'})


PAGE = r'''<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex"><title>Вектор — сервер</title><style>
:root{--ink:#1d1d1f;--mute:#6e6e73;--line:#e5e5ea;--bg:#f5f5f7;--ok:#1e7358;--bad:#c4372c;--card:#fff}
*{box-sizing:border-box}body{margin:0;font:16px/1.45 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;background:var(--bg);color:var(--ink)}
main{max-width:760px;margin:0 auto;padding:28px 16px 60px}h1{font-size:28px;margin:0 0 4px}h2{font-size:19px;margin:0 0 12px}
.sub{color:var(--mute);margin:0 0 24px}.card{background:var(--card);border-radius:18px;padding:20px;margin-bottom:16px;box-shadow:0 1px 2px rgba(0,0,0,.04)}
label{display:block;font-size:14px;color:var(--mute);margin:12px 0 6px}input,select,textarea{width:100%;font:inherit;padding:11px 13px;border:1px solid var(--line);border-radius:12px;background:#fff}
textarea{min-height:70px;resize:vertical}button{font:inherit;font-weight:600;border:0;border-radius:12px;padding:11px 18px;background:var(--ink);color:#fff;cursor:pointer;margin-top:14px}
button.ghost{background:#e8e8ed;color:var(--ink)}button:disabled{opacity:.45;cursor:default}.row{display:flex;gap:10px;flex-wrap:wrap}
.pill{display:inline-block;padding:3px 10px;border-radius:99px;font-size:13px;background:#e8e8ed}.ok{color:var(--ok)}.bad{color:var(--bad)}
.pill.ok{background:#e3f2ec}.pill.bad{background:#fbe7e5}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:8px 14px;font-size:14px}
pre{background:#1d1d1f;color:#e8e8ed;border-radius:12px;padding:12px;font-size:12.5px;white-space:pre-wrap;word-break:break-word;max-height:360px;overflow:auto}
.msg{margin-top:10px;font-size:14px}.hide{display:none}small{color:var(--mute)}
</style></head><body><main>
<h1>Сервер Вектора</h1><p class="sub" id="dom">Админка: ключи, данные, обновления и журналы</p>
<section class="card hide" id="auth"><h2 id="auth-t">Вход</h2>
 <div id="setup-f" class="hide"><label>Одноразовый код из итога установки</label><input id="code" autocomplete="one-time-code" maxlength="12"></div>
 <label>Пароль<span id="pw-hint"></span></label><input id="pw" type="password" autocomplete="current-password">
 <button id="go">Войти</button><div class="msg" id="auth-m"></div></section>
<div id="app" class="hide">
<section class="card"><h2>Бипыч <span class="pill" id="prov"></span></h2>
 <label>Через что подключать</label><select id="pv"><option value="ai_proxyapi">ProxyAPI — OpenRouter за рубли</option><option value="ai_beget">ИИ-шлюз Beget</option></select>
 <label>Ключ (после сохранения нигде не показывается)</label><input id="key" type="password" autocomplete="off" spellcheck="false">
 <button data-job="ai">Сохранить и проверить</button><div class="msg" id="m-ai"></div></section>
<section class="card"><h2>Данные учеников <span class="pill" id="data"></span></h2>
 <small>Копия из облачного Supabase: Connect → Session pooler → URI, вместо [YOUR-PASSWORD] — пароль базы. Строка нигде не сохраняется.</small>
 <label>Строка подключения</label><textarea id="src" spellcheck="false" autocomplete="off"></textarea>
 <button data-job="data">Перенести данные</button><div class="msg" id="m-data"></div></section>
<section class="card"><h2>Пароль root</h2><small>Для входа на сервер по SSH и в консоль Бегета. Старый был в переписке — смените.</small>
 <label>Новый пароль (не короче 12 символов)</label><input id="rpw" type="password" autocomplete="new-password">
 <button data-job="rootpw">Сменить пароль root</button><div class="msg" id="m-rootpw"></div></section>
<section class="card"><h2>Состояние</h2><div class="grid" id="st"></div>
 <div class="row"><button class="ghost" data-job="update">Обновить сейчас</button><button class="ghost" data-job="backup">Сделать бэкап</button><button class="ghost" data-job="check">Проверить всё</button><button class="ghost" id="out">Выйти</button></div>
 <div class="msg" id="m-ops"></div></section>
<section class="card"><h2>Журнал <span class="pill" id="job"></span></h2><pre id="log">—</pre>
 <details><summary><small>Автообновление и бэкапы</small></summary><pre id="ulog"></pre></details></section>
</div></main><script>
const $=id=>document.getElementById(id);let mode='login',timer=null;
const api=async(p,b)=>{const r=await fetch('/ops/api/'+p,b===undefined?{cache:'no-store'}:{method:'POST',headers:{'Content-Type':'application/json','X-Ops':'1'},body:JSON.stringify(b)});let j={};try{j=await r.json()}catch(e){}if(!r.ok)throw Object.assign(new Error(j.error||('Ошибка '+r.status)),{code:r.status});return j};
const esc=s=>String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
async function boot(){const s=await api('state');if(s.authed)return show();$('auth').classList.remove('hide');
 if(s.setup){mode='setup';$('auth-t').textContent='Первый вход';$('setup-f').classList.remove('hide');$('pw-hint').textContent=' — придумайте, не короче 10 символов';$('go').textContent='Задать пароль и войти';
  const h=location.hash.match(/code=([A-Z0-9]+)/i);if(h){$('code').value=h[1].toUpperCase();history.replaceState(null,'',location.pathname)}
  if(!s.code)$('auth-m').textContent='Код истёк. Откройте консоль сервера и выполните: bash /opt/vektor/install.sh ops-code';}}
$('go').onclick=async()=>{$('go').disabled=true;$('auth-m').textContent='';try{await api(mode,mode==='setup'?{code:$('code').value,password:$('pw').value}:{password:$('pw').value});$('pw').value='';show()}catch(e){$('auth-m').innerHTML='<span class="bad">'+esc(e.message)+'</span>'}$('go').disabled=false};
$('pw').onkeydown=e=>{if(e.key==='Enter')$('go').click()};
async function show(){$('auth').classList.add('hide');$('app').classList.remove('hide');await refresh()}
async function refresh(){let s;try{s=await api('status')}catch(e){if(e.code===401)return location.reload();return}
 $('dom').textContent=s.domain?('https://'+s.domain):'';$('prov').textContent=s.provider||'не подключён';$('prov').className='pill '+(s.provider?'ok':'bad');
 $('data').textContent=s.data?'перенесены':'ещё в облаке';$('data').className='pill '+(s.data?'ok':'');
 const bad=s.containers.filter(c=>!c.ok);
 $('st').innerHTML=[['Сервисы',bad.length?'<span class="bad">не работают: '+esc(bad.map(c=>c.name).join(', '))+'</span>':'<span class="ok">все '+s.containers.length+' работают</span>'],
  ['Память','свободно '+s.mem.free+' из '+s.mem.total+' МБ'],['Диск','свободно '+s.disk.free+' из '+s.disk.total+' ГБ'],
  ['Бэкап',s.backup.last?esc(s.backup.last.replace(/^vektor-|\.dump$/g,''))+' · '+s.backup.size+' КБ':'ещё не было'],
  ['Автообновление',s.autoupdate?'<span class="ok">включено</span>':'<span class="bad">выключено</span>']].map(([a,b])=>'<div><small>'+a+'</small><br>'+b+'</div>').join('');
 const j=s.job;$('job').textContent=j.name?(j.title+': '+(j.running?'идёт…':j.rc===0?'готово':'ошибка')):'';$('job').className='pill '+(j.running?'':j.rc===0?'ok':j.name?'bad':'');
 $('log').textContent=s.joblog||'—';$('log').scrollTop=1e9;$('ulog').textContent=(s.updatelog||'')+'\n\n'+(s.backuplog||'');
 document.querySelectorAll('[data-job]').forEach(b=>b.disabled=j.running);clearTimeout(timer);timer=setTimeout(refresh,j.running?2000:15000)}
document.querySelectorAll('[data-job]').forEach(b=>b.onclick=async()=>{const k=b.dataset.job;let name=k,value='',out='m-ops';
 if(k==='ai'){name=$('pv').value;value=$('key').value.trim();out='m-ai';if(!value)return $(out).textContent='Вставьте ключ'}
 if(k==='data'){value=$('src').value.trim();out='m-data';if(!value)return $(out).textContent='Вставьте строку подключения'}
 if(k==='rootpw'){value=$('rpw').value;out='m-rootpw';if(value.length<12)return $(out).textContent='Не короче 12 символов'}
 if(k==='update'&&!confirm('Обновить сервер сейчас? Сайт может мигнуть на минуту.'))return;
 try{await api('job',{name,value});$('key').value='';$('src').value='';$('rpw').value='';$(out).textContent='Запущено — ход виден в журнале ниже.';refresh()}catch(e){$(out).innerHTML='<span class="bad">'+esc(e.message)+'</span>'}});
$('out').onclick=async()=>{await api('logout',{}).catch(()=>{});location.reload()};
boot();
</script></body></html>'''

if __name__ == '__main__':
    os.makedirs(ROOT, exist_ok=True)
    ThreadingHTTPServer(('127.0.0.1', PORT), H).serve_forever()

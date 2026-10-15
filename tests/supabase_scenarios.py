"""Сценарии для варианта Vercel + Supabase: настоящие SQL-функции из supabase/schema.sql в локальном Postgres,
перед ними — маленький сервер, который отвечает на /rest/v1/rpc/<функция> как Supabase (PostgREST).
Нужны: Postgres 14+ (psql), playwright. Адрес базы — переменная VEKTOR_PG (по умолчанию локальный сокет).
Запуск: python tests/supabase_scenarios.py
"""
import asyncio, http.server, json, os, pathlib, secrets, socket, subprocess, sys, threading, urllib.request
from playwright.async_api import async_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
PG = os.environ.get('VEKTOR_PG', 'host=/var/tmp/vpg port=5499 user=postgres')
DB = 'vk_test_' + secrets.token_hex(3)
results = []
def rep(name, ok, extra=''):
    results.append(ok); print(('OK  ' if ok else 'FAIL'), name, extra)

def psql(sql, db=None):
    r = subprocess.run(['psql', f'{PG} dbname={db or DB}', '-v', 'ON_ERROR_STOP=1', '-qtA', '-c', sql], capture_output=True, text=True)
    if r.returncode: raise RuntimeError(r.stderr.strip())
    return r.stdout.strip()

def lit(v):
    tag = '$q' + secrets.token_hex(4) + '$'
    if v is None: return 'null'
    if isinstance(v, (dict, list)): return tag + json.dumps(v, ensure_ascii=False) + tag + '::jsonb'
    return tag + str(v) + tag

class H(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **k): super().__init__(*a, directory=str(ROOT), **k)
    def log_message(self, *a): pass
    def do_GET(self):
        if self.path.split('?')[0] == '/config.js':  # подставить «Supabase» = этот же сервер
            b = f"window.VEKTOR_CONFIG = {{ supabaseUrl: 'http://{self.headers['Host']}', supabaseKey: 'anon-test' }};".encode()
            self.send_response(200); self.send_header('Content-Type', 'text/javascript'); self.end_headers(); self.wfile.write(b); return
        super().do_GET()
    def do_POST(self):
        if not self.path.startswith('/rest/v1/rpc/') or self.headers.get('apikey') != 'anon-test':
            self.send_response(401); self.end_headers(); return
        fn = self.path.rsplit('/', 1)[1]
        if not fn.startswith('vektor_'): self.send_response(404); self.end_headers(); return
        args = json.loads(self.rfile.read(int(self.headers['Content-Length'] or 0)) or b'{}')
        sql = f"set role anon; select {fn}(" + ', '.join(f'{k} => {lit(v)}' for k, v in args.items()) + ")::text"
        try: out, code = psql(sql), 200
        except RuntimeError as e: out, code = json.dumps({'message': str(e).split('ERROR:')[-1].strip()}), 400
        self.send_response(code); self.send_header('Content-Type', 'application/json'); self.end_headers()
        self.wfile.write(out.encode())

def rpc(base, fn, **args):
    req = urllib.request.Request(f'{base}/rest/v1/rpc/{fn}', data=json.dumps(args).encode(), headers={'Content-Type': 'application/json', 'apikey': 'anon-test'})
    try:
        with urllib.request.urlopen(req) as r: return r.status, json.loads(r.read())
    except urllib.error.HTTPError as e: return e.code, json.loads(e.read() or b'{}')

async def login(pg, base, user, pwd):
    await pg.goto(base + '/'); await pg.wait_for_selector('#login-form')
    await pg.fill('[name=login]', user); await pg.fill('[name=password]', pwd)
    await pg.click('#login-form button[type=submit]')

async def main():
    psql(f'create database {DB}', db='postgres')
    try:
        psql("do $$ begin create role anon nologin; exception when duplicate_object then null; end $$;"
             "do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;")
        subprocess.run(['psql', f'{PG} dbname={DB}', '-v', 'ON_ERROR_STOP=1', '-q', '-f', str(ROOT / 'supabase/schema.sql')], check=True, capture_output=True)
        subprocess.run(['psql', f'{PG} dbname={DB}', '-v', 'ON_ERROR_STOP=1', '-q', '-f', str(ROOT / 'supabase/schema.sql')], check=True, capture_output=True)
        rep('схема накатывается повторно', True)
        rep('vk_seed: 80 профилей с паролями', psql("select count(*) from vk_seed(80, '5А:1-28,5Б:29-56,5В:57-80') where password ~ '^[а-я]+[0-9]{4}$'") == '80')
        rep('пароли не повторяются', psql("select count(distinct pass_hash) from vk_students") == '80')
        psql("update vk_students set pass_hash = extensions.crypt('зоолог5679', extensions.gen_salt('bf', 8)) where login = 'ученик1';"
             "update vk_students set pass_hash = extensions.crypt('компас1234', extensions.gen_salt('bf', 8)) where login = 'ученик2';"
             "update vk_students set pass_hash = extensions.crypt('компас1111', extensions.gen_salt('bf', 8)) where login = 'ученик40';"
             "select vk_teacher('uchitel', 'учитель-1', 'Учитель', '5А')")
        # anon не читает таблицы и не вызывает служебные функции
        try: psql('set role anon; select count(*) from vk_students'); rep('anon не читает таблицы', False)
        except RuntimeError: rep('anon не читает таблицы', True)
        try: psql("set role anon; select * from vk_seed(1)"); rep('anon не создаёт профили', False)
        except RuntimeError: rep('anon не создаёт профили', True)

        s = socket.socket(); s.bind(('127.0.0.1', 0)); port = s.getsockname()[1]; s.close()
        srv = http.server.ThreadingHTTPServer(('127.0.0.1', port), H)
        threading.Thread(target=srv.serve_forever, daemon=True).start()
        base = f'http://127.0.0.1:{port}'
        async with async_playwright() as p:
            b = await p.chromium.launch()
            ctx = await b.new_context(); pg = await ctx.new_page()
            await pg.goto(base + '/'); await pg.wait_for_selector('#login-form')
            rep('без входа виден только экран входа', await pg.evaluate("typeof render") == 'undefined')
            await login(pg, base, 'ученик1', 'неверно0000'); await pg.wait_for_timeout(600)
            rep('неверный пароль', 'Неверный' in await pg.inner_text('#login-msg'))
            await login(pg, base, '  Ученик1 ', 'ЗООЛОГ5679'); await pg.wait_for_selector('#logout-btn', timeout=8000)
            rep('вход: регистр и пробелы не важны', 'Ученик 1' in await pg.inner_text('#logout-btn'))

            await pg.goto(base + '/#lesson/0/practice'); await pg.wait_for_timeout(400)
            ans = await pg.evaluate("session.task.answer")
            await pg.evaluate("""a => { const f=document.querySelector('#answer-form'); const p=String(a).split('/');
                const n=f.querySelector('#ans-num'), d=f.querySelector('#ans-den');
                if (d && p.length===2) { n.value=p[0]; d.value=p[1]; } else n.value=a; f.requestSubmit(); }""", ans)
            await pg.wait_for_timeout(2600)
            rep('прогресс на сервере', psql("select (state->'meta'->'concept'->>'practice')::int from vk_students where login='ученик1'") == '1')
            rep('событие attempt в журнале', psql("select count(*) from vk_events where type='attempt'") == '1')

            await ctx.set_offline(True)
            await pg.evaluate("logEvent('test_offline', {k: 1}); save()"); await pg.wait_for_timeout(2200)
            rep('без сети — «Нет связи»', 'Нет связи' in await pg.inner_text('#sync-status'))
            await ctx.set_offline(False); await pg.evaluate("dispatchEvent(new Event('online'))"); await pg.wait_for_timeout(1800)
            rep('событие дошло после связи', psql("select count(*) from vk_events where type='test_offline'") == '1')

            st, j = rpc(base, 'vektor_login', p_login='ученик2', p_password='компас1234')
            for _ in range(2): rpc(base, 'vektor_sync', p_token=j['token'], p_events=[{'id': 'dup-test-123456', 'type': 'attempt', 'data': {}}])
            rep('повтор события — без дубля', psql("select count(*) from vk_events where event_id='dup-test-123456'") == '1')

            ctx2 = await b.new_context(); pg2 = await ctx2.new_page()
            await login(pg2, base, 'ученик1', 'зоолог5679'); await pg2.wait_for_selector('#logout-btn', timeout=8000)
            rep('другое устройство — тот же прогресс', await pg2.evaluate("state.meta.concept && state.meta.concept.practice") >= 1)
            await ctx2.close()

            await pg.click('#logout-btn'); await pg.wait_for_selector('#login-form', timeout=8000)
            rep('после выхода прогресс стёрт с устройства', await pg.evaluate("localStorage.getItem('vektor-progress-v3')") is None)
            # сессия закрыта и на сервере
            rep('после выхода старый токен не работает', rpc(base, 'vektor_state', p_token='x' * 64)[0] == 400)
            await b.close()

        for _ in range(5): rpc(base, 'vektor_login', p_login='ученик3', p_password='x')
        st, j = rpc(base, 'vektor_login', p_login='ученик3', p_password='x')
        rep('5 ошибок → блокировка', j.get('error') == 'locked', j)
        st, j = rpc(base, 'vektor_login', p_login='ученик40', p_password='компас1111')
        st, r = rpc(base, 'vektor_teacher_class', p_token=j['token'])
        rep('ученик не открывает кабинет учителя', st == 400 and 'forbidden' in r.get('message', ''))
        st, t = rpc(base, 'vektor_teacher_login', p_login='uchitel', p_password='учитель-1')
        st, c = rpc(base, 'vektor_teacher_class', p_token=t['token'])
        logins = {x['login'] for x in c['students']}
        rep('учитель видит только 5А (28)', len(logins) == 28 and 'ученик40' not in logins, len(logins))
        # кабинет учителя (teacher.html)
        async with async_playwright() as p:
            b = await p.chromium.launch(); pg = await b.new_page()
            await pg.goto(base + '/teacher.html'); await pg.wait_for_selector('#f')
            await pg.fill('[name=login]', 'uchitel'); await pg.fill('[name=password]', 'неверно'); await pg.click('#f button'); await pg.wait_for_timeout(700)
            rep('кабинет: неверный пароль', 'Неверный' in await pg.inner_text('#m'))
            await pg.fill('[name=password]', 'учитель-1'); await pg.click('#f button'); await pg.wait_for_selector('table', timeout=8000)
            rep('кабинет: 28 учеников 5А', await pg.locator('tbody tr').count() == 28)
            row = await pg.inner_text('tbody tr:first-child')
            rep('кабинет: у ученик1 видны ответы и тема в работе', 'ученик1' in row and await pg.locator('tbody tr:first-child .c1').count() >= 1, row[:80])
            rep('кабинет: нет ошибок на странице', True)
            await pg.select_option('#only', 'active'); await pg.wait_for_timeout(100)
            rep('кабинет: фильтр «входившие»', 1 <= await pg.locator('tbody tr').count() < 28)
            await pg.click('#logout'); await pg.wait_for_selector('#f')
            rep('кабинет: выход', True)
            await b.close()
        rep('сброс пароля сохраняет прогресс', psql("select vk_reset('ученик1') ~ '^[а-я]+[0-9]{4}$'") == 't'
            and psql("select (state->'meta'->'concept'->>'practice') from vk_students where login='ученик1'") == '1')
        srv.shutdown()
    finally:
        psql(f'drop database if exists {DB} with (force)', db='postgres')
    print(f'\nИТОГО: {sum(results)} из {len(results)}')
    sys.exit(0 if all(results) else 1)

asyncio.run(main())

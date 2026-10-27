"""Сценарии для варианта Vercel + Supabase: настоящие SQL-функции из supabase/schema.sql в локальном Postgres,
перед ними — маленький сервер, который отвечает на /rest/v1/rpc/<функция> как Supabase (PostgREST).
Нужны: Postgres 14+ (psql), playwright. Адрес базы — переменная VEKTOR_PG (по умолчанию локальный сокет).
Запуск: python tests/supabase_scenarios.py
"""
import re, asyncio, http.server, json, os, pathlib, secrets, socket, subprocess, sys, threading, urllib.request
from playwright.async_api import async_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
PG = os.environ.get('VEKTOR_PG', 'host=/var/tmp/vpg port=5499 user=postgres')
DB = 'vk_test_' + secrets.token_hex(3)
results = []
FN_PORT = FAKE_PORT = 0
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
        if self.path.startswith('/functions/v1/tutor'):
            data = self.rfile.read(int(self.headers['Content-Length'] or 0))
            req = urllib.request.Request(f'http://127.0.0.1:{FN_PORT}/', data=data, headers={'Content-Type': 'application/json'})
            try: res = urllib.request.urlopen(req); code, out, ct = res.status, res.read(), res.headers.get('Content-Type')
            except urllib.error.HTTPError as e: code, out, ct = e.code, e.read(), 'application/json'
            self.send_response(code); self.send_header('Content-Type', ct); self.end_headers(); self.wfile.write(out); return
        if self.path == '/rest/v1/vk_events' and self.headers.get('apikey') == 'service-test':
            e = json.loads(self.rfile.read(int(self.headers['Content-Length'] or 0)))
            psql(f"insert into vk_events (event_id, student_id, type, data) values ({lit(e['event_id'])}, {int(e['student_id'])}, {lit(e['type'])}, {lit(e['data'])})")
            self.send_response(201); self.end_headers(); return
        if self.path.startswith('/rest/v1/rpc/vk_ai_') and self.headers.get('apikey') == 'service-test':
            fn = self.path.rsplit('/', 1)[1]
            if not re.fullmatch(r'vk_ai_(take|cache_get|cache_put|spend)', fn): self.send_response(404); self.end_headers(); return
            args = json.loads(self.rfile.read(int(self.headers['Content-Length'] or 0)) or b'{}')
            casts = {'p_in': 'int', 'p_out': 'int', 'p_student': 'int', 'p_usd': 'numeric'}
            call = f"{fn}(" + ', '.join(f"{k} => {lit(v)}" + (f'::{casts[k]}' if k in casts else '') for k, v in args.items()) + ")"
            out = 'null' if fn in ('vk_ai_cache_put', 'vk_ai_spend') and psql(f"select {call}") is not None else psql(f"select {call}::text")
            self.send_response(200); self.send_header('Content-Type', 'application/json'); self.end_headers(); self.wfile.write(out.encode()); return
        if not self.path.startswith('/rest/v1/rpc/') or self.headers.get('apikey') != 'anon-test':
            self.send_response(401); self.end_headers(); return
        fn = self.path.rsplit('/', 1)[1]
        if not fn.startswith('vektor_'): self.send_response(404); self.end_headers(); return
        args = json.loads(self.rfile.read(int(self.headers['Content-Length'] or 0)) or b'{}')
        sql = f"set role anon; select {fn}(" + ', '.join(f'{k} => {lit(v)}' for k, v in args.items()) + ")::text"
        try: out, code = psql(sql), 200
        except RuntimeError as e: out, code = json.dumps({'message': str(e).split('ERROR:')[-1].strip()}), 400
        try:
            self.send_response(code); self.send_header('Content-Type', 'application/json'); self.end_headers()
            self.wfile.write(out.encode())
        except (BrokenPipeError, ConnectionResetError): pass  # клиент (бот) уже ушёл

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
        for f in ('test.sql', 'admin.sql', 'teacher.sql', 'pulse.sql', 'ai.sql'):
            subprocess.run(['psql', f'{PG} dbname={DB}', '-v', 'ON_ERROR_STOP=1', '-q', '-f', str(ROOT / 'supabase' / f)], check=True, capture_output=True)
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
        global FN_PORT, FAKE_PORT
        def fp():
            q = socket.socket(); q.bind(('127.0.0.1', 0)); n = q.getsockname()[1]; q.close(); return n
        FN_PORT, FAKE_PORT = fp(), fp()
        fn = subprocess.Popen(['bun', str(ROOT / 'tests/tutor_fn_shim.ts')], env={**os.environ, 'FN_PORT': str(FN_PORT), 'FAKE_PORT': str(FAKE_PORT), 'SB_URL': base},
                              stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
        fn.stdout.readline()
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

            # ИИ-наставник через серверную функцию (этап 3)
            psql("update vk_settings set value = '{\"enabled\": true, \"per_student_day\": 2, \"total_day\": 100}' where key = 'ai'")
            rep('наставник: режим «сервер Вектора»', await pg.evaluate("ai.mode") == 'vektor' and await pg.evaluate("isOnline()"))
            await pg.goto(base + '/#lesson/1/practice'); await pg.wait_for_timeout(400)
            await pg.fill('#chat-in-task', 'мой телефон 8 916 123-45-67, помоги'); await pg.click('.chat-task .chat-form button[type=submit]'); await pg.wait_for_timeout(1500)
            rep('наставник ответил через сервер', 'на сколько частей' in await pg.inner_text('.chat-task .chat-log'))
            last = json.loads(urllib.request.urlopen(f'http://127.0.0.1:{FAKE_PORT}/last').read())
            user_txt = ' '.join(m['content'] for m in last['body']['messages'] if m['role'] == 'user')
            sys_txt = ' '.join(m['content'] for m in last['body']['messages'] if m['role'] == 'system')
            rep('ключ модели — только на сервере', last['auth'] == 'Bearer sk-test' and 'token' not in last['body'])
            rep('телефон вырезан из текста ребёнка', '916' not in user_txt and 'номер скрыт' in user_txt, user_txt[:80])
            rep('имя ученика не уходит в модель', 'Ученик 1' not in sys_txt and 'зовут' not in sys_txt)
            await pg.fill('#chat-in-task', 'ты сука тупая'); await pg.click('.chat-task .chat-form button[type=submit]'); await pg.wait_for_timeout(1500)
            _log = await pg.inner_text('.chat-task .chat-log'); rep('модерация: мягкий ответ ребёнку', 'вернёмся к математике' in _log, _log[-200:])
            rep('модерация: сигнал учителю записан', psql("select count(*) from vk_events where type='ai_flag'") == '1')
            await pg.fill('#chat-in-task', 'ещё подсказку'); await pg.click('.chat-task .chat-form button[type=submit]'); await pg.wait_for_timeout(1200)
            await pg.fill('#chat-in-task', 'и ещё'); await pg.click('.chat-task .chat-form button[type=submit]'); await pg.wait_for_timeout(1500)
            rep('лимит в день: понятное сообщение и урок не ломается', '30 вопросов' in await pg.inner_text('.chat-task') or 'конспект' in await pg.inner_text('.chat-task'))
            psql("update vk_settings set value = '{\"enabled\": false, \"per_student_day\": 30, \"total_day\": 100}' where key = 'ai'")
            await pg.fill('#chat-in-task', 'а как дальше?'); await pg.click('.chat-task .chat-form button[type=submit]'); await pg.wait_for_timeout(1500)
            log = await pg.inner_text('.chat-task')
            rep('ИИ выключен на сервере: урок молча идёт по конспекту (П-03)', 'не отвечает' not in log and 'выключен' not in log and 'без ИИ' in log, log[-120:])
            # профиль на сервере: без настроек ИИ, имя не редактируется, «Для взрослых» скрыто (П-04)
            await pg.goto(base + '/#settings'); await pg.wait_for_timeout(300)
            rep('профиль: нет ключей ИИ и поля имени', await pg.locator('#ai-form').count() == 0 and await pg.locator('#set-name').count() == 0 and 'OpenRouter' not in await pg.inner_text('#app'))
            rep('«Для взрослых» и «5 класс»', not await pg.is_visible('.adult-links') and '5 класс' in await pg.inner_text('.profile'))
            st_, _ = rpc(base, 'vektor_sync', p_token=await pg.evaluate("JSON.parse(localStorage.getItem('vektor-session')).token"), p_state={'settings': {'name': 'Маша Иванова'}, 'answers': 1}, p_events=[])
            rep('имя из состояния на сервер не пишется', psql("select coalesce(state->'settings'->>'name', 'нет') from vk_students where login='ученик1'") == 'нет')
            psql("update vk_settings set value = '{\"enabled\": true, \"per_student_day\": 30, \"total_day\": 100}' where key = 'ai'")
            st, j = rpc(base, 'vektor_login', p_login='ученик2', p_password='компас1234')
            r = urllib.request.Request(base + '/functions/v1/tutor', data=json.dumps({'token': 'x' * 64, 'messages': [{'role': 'user', 'content': 'hi'}]}).encode(), headers={'Content-Type': 'application/json'})
            try: urllib.request.urlopen(r); code = 200
            except urllib.error.HTTPError as e: code = e.code
            rep('без входа наставник не отвечает (401)', code == 401, code)
            # ---------- ИИ-режимы (CL-8) ----------
            tok2 = j['token']
            def fn_call(payload):
                r = urllib.request.Request(base + '/functions/v1/tutor', data=json.dumps(payload).encode(), headers={'Content-Type': 'application/json'})
                try:
                    with urllib.request.urlopen(r) as x: return x.status, x.read().decode()
                except urllib.error.HTTPError as e: return e.code, e.read().decode()
            BUGS = [{'id': 'add-denominators', 'title': 'Складывает числители и знаменатели'}, {'id': 'forgot-scale-numerators', 'title': 'Не домножил числители'}]
            used0 = int(psql("select coalesce(sum(n),0) from vk_ai_usage") or 0)
            code, out = fn_call({'mode': 'classify', 'token': tok2, 'data': {'topic': 'add-diff', 'cond': '1/2 + 1/3', 'answer': '5/6', 'lines': [{'t': '= 4/6', 'v': '2/3'}], 'bugs': BUGS}})
            c1 = json.loads(out) if code == 200 else {}
            last = json.loads(urllib.request.urlopen(f'http://127.0.0.1:{FAKE_PORT}/last').read())['body']
            rep('classify: ИИ узнал ошибку из каталога', c1.get('bug') == 'add-denominators' and c1.get('confidence', 0) >= 0.7, out[:120])
            rep('classify: JSON-режим, температура 0, дешёвый провайдер и запасная модель', last.get('response_format', {}).get('type') == 'json_object' and last.get('temperature') == 0
                and last.get('provider', {}).get('sort') == 'price' and 'google/gemini-2.5-flash-lite' in last.get('models', []) and last.get('max_tokens', 999) <= 120 + 600)
            used1 = int(psql("select coalesce(sum(n),0) from vk_ai_usage"))
            code, out = fn_call({'mode': 'classify', 'token': tok2, 'data': {'topic': 'add-diff', 'cond': '1/2 + 1/3', 'answer': '5/6', 'lines': [{'t': '=  4/6 ', 'v': '2/3'}], 'bugs': BUGS}})
            rep('кэш: та же ошибка второй раз — без вызова модели и без траты лимита', json.loads(out).get('cached') is True and int(psql("select coalesce(sum(n),0) from vk_ai_usage")) == used1 == used0 + 1)
            code, out = fn_call({'mode': 'classify', 'token': tok2, 'data': {'topic': 'add-diff', 'cond': '2/3 + 1/4', 'answer': '11/12', 'lines': [{'t': '= 3/7', 'v': '3/7'}], 'bugs': BUGS}})
            rep('classify: id не из каталога → other', json.loads(out).get('bug') == 'other', out[:80])
            code, out = fn_call({'mode': 'classify', 'token': 'x' * 64, 'data': {'topic': 'add-diff', 'cond': '1/2 + 1/3', 'lines': [{'t': '= 4/6'}], 'bugs': BUGS}})
            rep('classify: без входа нельзя даже из кэша', code == 401)
            rep('учёт: токены и доллары пишутся', float(psql("select coalesce(sum(usd),0) from vk_ai_usage")) > 0 and int(psql("select coalesce(sum(tokens_in),0) from vk_ai_usage")) >= 2400)
            code, out = fn_call({'mode': 'explain_more', 'token': tok2, 'data': {'title': 'Складывает числители и знаменатели', 'fix': 'общий знаменатель', 'step': 'контрпример', 'task': '1/2 + 1/3'}})
            last = json.loads(urllib.request.urlopen(f'http://127.0.0.1:{FAKE_PORT}/last').read())['body']
            rep('«объясни иначе»: поток, потолок 300 токенов, промпт собран сервером', code == 200 and 'data:' in out and last.get('stream') is True
                and last.get('max_tokens', 0) <= 300 and 'иначе' in last['messages'][0]['content'])
            await_spend = float(psql("select coalesce(sum(usd),0) from vk_ai_usage"))
            rep('поток: расход из usage записан', await_spend >= 0.00014 * 3 - 1e-9, str(await_spend))
            psql("update vk_settings set value = value || '{\"usd_day\": 0}' where key = 'ai'")
            code, out = fn_call({'token': tok2, 'messages': [{'role': 'user', 'content': 'помоги'}]})
            rep('дневной бюджет в $ исчерпан → тихий режим (503)', code == 503 and 'budget' in out, out[:100])
            psql("update vk_settings set value = value || '{\"usd_day\": 3}' where key = 'ai'")
            try: psql("set role anon; select vk_ai_cache_put('k', '{}')"); rep('служебные ИИ-функции закрыты', False)
            except RuntimeError: rep('служебные ИИ-функции закрыты', True)
            psql("update vk_settings set value = '{\"enabled\": true, \"per_student_day\": 30, \"total_day\": 100, \"usd_day\": 3}' where key = 'ai'")
            await pg.goto(base + '/#lesson/4/practice'); await pg.wait_for_timeout(500)
            await pg.evaluate("""() => { const f=(a,b)=>`<span class="frac"><span>${a}</span><span>${b}</span></span>`;
              Object.assign(session.task, { question: `${f(1,2)} + ${f(1,3)} = ?`, answer: '5/6', accept: 'equivalent', misc: () => null }); }""")
            await pg.evaluate("v => fillAnswer(v)", '4/6'); await pg.click('form.answer button[type=submit]'); await pg.wait_for_timeout(200)
            await pg.click('#xray-open'); await pg.locator('.xr-in').first.fill('4/6'); await pg.click('[data-xr="done"]')
            await pg.wait_for_selector('.xr-found', timeout=8000)
            rep('черновик: незнакомую ошибку нашёл ИИ (уровень 3)', 'Складыватель' in await pg.inner_text('.xr-result') and await pg.evaluate("session.xray && session.xray.level") == 3)
            await pg.click('#review-open'); await pg.wait_for_timeout(200)
            await pg.click('.rv-more'); await pg.wait_for_timeout(1500)
            rep('разбор: «Не понимаю» — ИИ объясняет иначе', 'на сколько частей' in await pg.inner_text('.rv-more-out'))
            await pg.goto(base + '/#lesson/1/practice'); await pg.wait_for_timeout(400)
            has_sr = await pg.evaluate("!!(window.SpeechRecognition || window.webkitSpeechRecognition)")
            rep('голосовой ввод: микрофон в чате, если браузер умеет', (await pg.locator('.chat-task .chat-mic').count() == 1) == has_sr, f'распознавание в браузере: {has_sr}')
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
            ph = await b.new_page(viewport={'width': 390, 'height': 844})
            await ph.goto(base + '/'); await ph.wait_for_selector('#login-form')
            box = await ph.evaluate("(r => [r.left, r.right])(document.querySelector('.login').getBoundingClientRect())")
            rep('телефон: карточка входа целиком в экране (П-01)', box[0] >= 0 and box[1] <= 390 and await ph.evaluate('document.documentElement.scrollWidth') <= 390, box)
            await login(ph, base, 'ученик2', 'компас1234'); await ph.wait_for_selector('#m-logout', state='visible', timeout=8000)
            rep('телефон: «Выйти» на виду (П-02)', await ph.is_visible('#m-logout'))
            await ph.click('#m-logout'); await ph.wait_for_selector('#login-form', timeout=8000)
            rep('телефон: выход за одно нажатие', True)
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
            b = await p.chromium.launch(); pg = await b.new_page(viewport={'width': 1280, 'height': 720}); errs = []
            pg.on('pageerror', lambda e: errs.append(str(e)))
            await pg.goto(base + '/teacher.html'); await pg.wait_for_selector('#f')
            await pg.fill('[name=login]', 'uchitel'); await pg.fill('[name=password]', 'неверно'); await pg.click('#f button'); await pg.wait_for_timeout(700)
            rep('кабинет: неверный пароль', 'Неверный' in await pg.inner_text('#m'))
            await pg.fill('[name=password]', 'учитель-1'); await pg.click('#f button'); await pg.wait_for_selector('#tbody tr', timeout=8000)
            rep('кабинет: 28 учеников 5А', await pg.locator('#tbody tr').count() == 28)
            row = await pg.inner_text('#tbody tr:first-child')
            rep('кабинет: у ученик1 тема в работе', 'ученик1' in row and await pg.locator('#tbody tr:first-child .c1').count() >= 1, row[:80])
            rep('кабинет: нет ★ и «Ответов», есть «Решено сегодня» (К-11)', '★' not in await pg.inner_text('#thead') and 'Ответов' not in await pg.inner_text('#thead') and 'Решено сегодня' in await pg.inner_text('#thead'))
            rep('кабинет: строка «Освоили тему» (К-05)', 'Освоили тему' in await pg.inner_text('#thead'))
            await pg.click('[data-only=never]'); await pg.wait_for_timeout(100)
            rep('кабинет: фильтр «Не входили» одним нажатием (К-08)', 1 <= await pg.locator('#tbody tr').count() < 28)
            await pg.click('[data-only=never]'); await pg.click('th[data-sort=seen]'); await pg.wait_for_timeout(100)
            rep('кабинет: сортировка по входу', 'ученик' in await pg.inner_text('#tbody tr:first-child') and (await pg.inner_text('#tbody tr:first-child')).count('не входил') == 0)
            # застрявший ученик: 4 ошибки подряд с типичной ошибкой (К-01)
            for j in range(4):
                psql(f"insert into vk_events (event_id, student_id, type, data, ts_server) select 'stuck-{j}', id, 'attempt', "
                     f"jsonb_build_object('topic','concept','mode','practice','question','Какая часть закрашена {j}','answer','5/3','ok',false,'hints',1,'mistake','flipped'), now() - interval '{8-j} minutes' from vk_students where login='ученик5'")
            await pg.evaluate("document.dispatchEvent(new Event('visibilitychange'))"); await pg.reload(); await pg.wait_for_selector('#tbody tr', state='attached', timeout=8000)
            help_ = await pg.inner_text('#help')
            rep('кабинет: «Нужна помощь сейчас» — кто, тема, ошибка, минуты', 'ученик5' in help_ and 'Тема 1' in help_ and 'перепутаны' in help_ and 'мин' in help_, help_[:160])
            # обновление без перерисовки: строка-элемент та же после повторной загрузки (К-09)
            await pg.evaluate("window.__row = document.querySelector('#tbody tr')")
            await pg.click('[data-only=on]'); await pg.click('[data-only=on]'); await pg.wait_for_timeout(100)
            rep('кабинет: строки не пересоздаются при обновлении', await pg.evaluate("window.__row === document.querySelector('#tbody tr')"))
            # карточка ученика (К-07) и новый пароль
            await pg.click('#help .card'); await pg.wait_for_selector('#d-reset', timeout=8000)
            dr = await pg.inner_text('.drawer')
            rep('карточка: частые ошибки и последние ответы', 'перепутаны' in dr and 'Какая часть закрашена' in dr, dr[:120])
            await pg.click('#d-reset'); await pg.click('#d-reset-go'); await pg.wait_for_selector('#d-newpass', timeout=8000)
            newp = await pg.inner_text('#d-newpass')
            st_, j_ = rpc(base, 'vektor_login', p_login='ученик5', p_password=newp)
            rep('карточка: новый пароль работает (К-12)', bool(j_.get('token')), newp)
            await pg.keyboard.press('Escape')
            # подписи только в браузере (К-02)
            await pg.click('#tabs [data-tab=logins]'); await pg.fill('[data-lab="ученик5"]', 'Аня С.'); await pg.press('[data-lab="ученик5"]', 'Tab')
            await pg.click('#tabs [data-tab=class]'); await pg.wait_for_timeout(100)
            rep('подпись видна в кабинете', 'Аня С.' in await pg.inner_text('#tbody') and 'Аня С.' in await pg.inner_text('#help'))
            rep('подпись не уходит на сервер', psql("select count(*) from vk_students where label is not null or state::text like '%Аня%'") == '0')
            st_, j_ = rpc(base, 'vektor_teacher_student', p_token=await pg.evaluate("JSON.parse(sessionStorage.getItem('vektor-teacher')).token"), p_login='ученик40')
            rep('учитель не открывает карточку чужого класса', j_.get('error') == 'forbidden' or st_ != 200)
            await pg.set_viewport_size({'width': 390, 'height': 844}); await pg.wait_for_timeout(200)
            rep('кабинет на телефоне: карточки, без прокрутки вбок (К-10)', await pg.is_visible('#mlist') and not await pg.is_visible('#wrap') and await pg.evaluate('document.documentElement.scrollWidth') <= 390)
            await pg.set_viewport_size({'width': 1280, 'height': 720})
            rep('кабинет: нет ошибок на странице', not errs, errs)
            await pg.click('#logout'); await pg.wait_for_selector('#f')
            rep('кабинет: выход', True)
            await b.close()
        # Тест до/после: учитель открывает, ученик решает, сервер проверяет (Ф-27–Ф-29)
        async with async_playwright() as p:
            b = await p.chromium.launch()
            tp = await b.new_page(); await tp.goto(base + '/teacher.html'); await tp.wait_for_selector('#f')
            await tp.fill('[name=login]', 'uchitel'); await tp.fill('[name=password]', 'учитель-1'); await tp.click('#f button'); await tp.wait_for_selector('#tbody tr', state='attached', timeout=8000)
            await tp.click('#tabs [data-tab=tests]')
            rep('кабинет: тест не открывается одним нажатием (К-03)', await tp.locator('[data-test="5А|pre|1"]').count() == 0 and await tp.locator('[data-arm="open|5А|pre"]').count() == 1)
            await tp.click('[data-arm="open|5А|pre"]')
            rep('кабинет: подтверждение открытия', 'Ученики сразу увидят тест' in await tp.inner_text('#tests'))
            await tp.click('[data-test="5А|pre|1"]'); await tp.wait_for_timeout(1200)
            rep('кабинет: тест идёт, счётчик «сдали / пишут / не начали»', 'Идёт' in await tp.inner_text('#tests') and 'не начали' in await tp.inner_text('#tests'))
            form = psql("select form from vk_tests where phase='pre'")
            sp = await b.new_page(); await login(sp, base, 'ученик2', 'компас1234'); await sp.wait_for_selector('.test', timeout=8000)
            rep('ученик видит тест без подсказок и меню', await sp.locator('.test-list li').count() == 18 and not await sp.locator('#hint-btn').count())
            rep('в браузер не пришли правильные ответы', await sp.evaluate("document.documentElement.innerHTML.includes('data-answer')") is False)
            ans = dict(x.split('|', 1) for x in psql(f"select n || '|' || answer from vk_test_items where form='{form}' order by n").splitlines())
            for li in await sp.locator('.test-list li').all():
                n = await li.get_attribute('data-n')
                if int(n) > 15: continue  # три последних оставим пустыми
                a_ = ans[n]
                if a_ in '<=>': await li.locator(f'[data-sign="{a_}"]').click()
                else:
                    v = a_ if int(n) != 2 else '4/6'; m_ = re.match(r'^(?:(\d+) )?(\d+)/(\d+)$', v)
                    w, nn, dd = (m_.group(1) or '', m_.group(2), m_.group(3)) if m_ else (v, '', '')
                    if w: await li.locator('[data-part=w]').fill(w)
                    if nn: await li.locator('[data-part=n]').fill(nn); await li.locator('[data-part=d]').fill(dd)
                    await li.locator('[data-part=d]' if nn else '[data-part=w]').dispatch_event('change')
            await sp.wait_for_timeout(1500)
            rep('тест: дроби в условии «этажом», ответ клеточками (П-06)', await sp.locator('.test-list .frac').count() > 10 and await sp.locator('.test-box').count() == 15)
            st_, tt = rpc(base, 'vektor_teacher_tests', p_token=await tp.evaluate("JSON.parse(sessionStorage.getItem('vektor-teacher')).token"))
            c5 = [c for c in tt['classes'] if c['name'] == '5А'][0]
            rep('кабинет: ученик в списке «пишут»', 'ученик2' in c5['tests']['pre']['writing'] and c5['total'] == 28)
            await sp.click('#test-finish'); rep('предупреждение о пустых ответах', 'Не отвечено 3' in await sp.inner_text('#test-finish'))
            await sp.click('#test-finish'); await sp.wait_for_selector('text=Тест сдан', timeout=8000)
            rep('сервер посчитал балл (14 из 18: несокращённая дробь не засчитана)', psql("select score || '/' || total from vk_test_done where phase='pre'") == '14/18',
                psql("select score || '/' || total from vk_test_done"))
            await tp.reload(); await tp.wait_for_selector('#tbody tr', state='attached', timeout=8000)
            rep('кабинет: балл ученика виден', '14/18' in await tp.inner_text('#wrap'))
            # контрольная группа: только тест
            psql("select vk_class_group('5Б', 'control')")
            cp = await b.new_page(); await login(cp, base, 'ученик40', 'компас1111'); await cp.wait_for_timeout(1500)
            rep('контрольная группа видит только ожидание теста', 'только тест' in await cp.inner_text('#app') and await cp.evaluate("typeof render") == 'undefined')
            # CSV
            async with tp.expect_download() as dl: await tp.click('#csv')
            path = await (await dl.value).path(); txt = open(path, encoding='utf-8-sig').read()
            rep('кабинет: CSV скачивается с кириллицей', txt.startswith('"Логин"') and 'ученик2' in txt)
            # новые бумажки для класса (К-12)
            await tp.click('#tabs [data-tab=logins]'); await tp.click('[data-arm=slips]'); await tp.click('#slips-go'); await tp.wait_for_selector('#print', timeout=8000)
            rep('бумажки для класса: 28 штук с новыми паролями', await tp.locator('.slip').count() == 28)
            slip = await tp.inner_text('.slip >> nth=0'); pw = re.search(r'Пароль:\s*(\S+)', slip).group(1)
            rep('пароль с бумажки работает', bool(rpc(base, 'vektor_login', p_login='ученик1', p_password=pw)[1].get('token')), slip)
            await b.close()

        # ---------- Пульс класса (CL-6) ----------
        psql("update vk_tests set closes_at = now() - interval '1 minute' where closes_at > now()")
        psql("delete from vk_events where type = 'bug_found'")  # чистый Пульс: ошибки из прошлых шагов не считаем
        psql("update vk_students set pass_hash = extensions.crypt('пульс1234', extensions.gen_salt('bf', 8)) where login in ('ученик3','ученик4','ученик5','ученик6','ученик7','ученик8')")
        for k in range(3, 9):
            psql(f"insert into vk_events (event_id, student_id, type, data) select 'pulse{k}aaaaaa', id, 'bug_found', '{{\"bug\":\"add-diff:add-denominators\",\"topic\":\"add-diff\",\"level\":2}}' from vk_students where login='ученик{k}'")
        psql("insert into vk_events (event_id, student_id, type, data) select 'pulse40aaaaaa', id, 'bug_found', '{\"bug\":\"add-diff:add-denominators\"}' from vk_students where login='ученик40'")
        psql("update vk_students set state = jsonb_set(coalesce(state,'{}'), '{bugs}', '{\"add-diff:add-denominators\":{\"status\":\"healing\"}}') where login='ученик3'")
        tt = rpc(base, 'vektor_teacher_login', p_login='uchitel', p_password='учитель-1')[1]['token']
        pl = rpc(base, 'vektor_teacher_pulse', p_token=tt, p_class='5А')[1]
        top = (pl.get('bugs') or [{}])[0]
        rep('пульс: 6 учеников со «складывает знаменатели», чужой класс не виден', top.get('bug') == 'add-diff:add-denominators' and top.get('n') == 6 and 'ученик40' not in top.get('logins', []), str(top)[:120])
        rep('пульс: «у 1 уже лечится»', top.get('healing') == 1)
        try: psql("set role anon; select vk_teacher_sids(1, null)"); rep('пульс: служебная функция закрыта', False)
        except RuntimeError: rep('пульс: служебная функция закрыта', True)
        code, r = rpc(base, 'vektor_teacher_push', p_token=tt, p_logins=['ученик40'], p_bug='add-diff:add-denominators', p_payload={})
        rep('задача группе: чужим ученикам не отправить', r.get('error') == 'forbidden', str(r))
        code, r = rpc(base, 'vektor_teacher_pulse', p_token='bad', p_class=None)
        rep('пульс: без сессии нельзя', code != 200)
        async with async_playwright() as p:
            b = await p.chromium.launch()
            tp = await (await b.new_context(viewport={'width': 1280, 'height': 800})).new_page(); terrs = []; tp.on('pageerror', lambda e: terrs.append(str(e)))
            await tp.goto(base + '/teacher.html'); await tp.wait_for_selector('#f')
            await tp.fill('[name=login]', 'uchitel'); await tp.fill('[name=password]', 'учитель-1'); await tp.click('#f button'); await tp.wait_for_selector('.pulse-row', timeout=8000)
            row = await tp.inner_text('.pulse-row')
            rep('кабинет: блок «Пульс» над «Нужна помощь»', 'Складывает числители и знаменатели' in row and '6 учеников' in row and 'лечится' in row, row[:140])
            async with tp.expect_popup() as pop: await tp.click('[data-board="add-diff:add-denominators"]')
            bp = await pop.value; await bp.wait_for_load_state(); await bp.wait_for_timeout(200)
            rep('мини-урок: доска открылась, 3 слайда, «Бипыч думает»', 'Бипыч думает' in await bp.inner_text('body') and await bp.evaluate("JSON.parse(localStorage.getItem('vektor-board')).slides.length") == 3)
            await bp.click('body'); await bp.wait_for_timeout(100)
            rep('мини-урок: на слайде-контрпримере картинка', await bp.locator('svg').count() >= 1)
            await bp.close()
            sp = await (await b.new_context(viewport={'width': 390, 'height': 844})).new_page(); serrs = []; sp.on('pageerror', lambda e: serrs.append(str(e)))
            await login(sp, base, 'ученик4', 'пульс1234')
            await sp.wait_for_selector('#logout-btn', state='attached', timeout=8000)
            import time; t0 = time.time()
            await tp.click('[data-push="add-diff:add-denominators"]'); await tp.wait_for_timeout(600)
            await sp.wait_for_selector('#push-card', timeout=25000); dt = time.time() - t0
            rep('задача от учителя у ученика быстрее 25 с', dt < 25, f'{dt:.1f} c')
            rep('карточка: контрпример и задача-двойник', 'Задача от учителя' in await sp.inner_text('#push-card') and await sp.locator('#push-card .xr-in, #push-card input').count() >= 1)
            ans = await sp.evaluate("() => { const R=VEKTOR_RATIONAL; return R.str(R.evalLine(document.querySelector('#push-card .rv-task').dataset.expr).value); }")
            await sp.locator('#push-card .xr-in').first.fill(ans); await sp.click('#push-card [data-xr="done"]'); await sp.wait_for_timeout(2500)
            rep('ученик решил — событие push_done на сервере', psql("select count(*) from vk_events e join vk_students s on s.id=e.student_id where s.login='ученик4' and e.type='push_done' and (e.data->>'ok')::boolean") == '1')
            await sp.click('[data-pc="close"]'); await sp.wait_for_timeout(3500)
            rep('решённая задача больше не всплывает', await sp.locator('#push-card').count() == 0)
            await tp.reload(); await tp.wait_for_selector('.pulse-row', timeout=8000)
            rep('учитель видит «решили 1 из 6» и ✓ у имени', 'решили 1 из 6' in await tp.inner_text('.pulse-row') and 'ученик4' in await tp.inner_text('.pr-push'))
            await tp.click('[data-summary]'); await tp.wait_for_timeout(100)
            sm = await tp.inner_text('.summary')
            rep('сводка урока: числа и рекомендация', 'ошибок найдено' in sm and 'На следующий урок' in sm and 'складывает' in sm.lower(), sm[:160].replace('\n', ' '))
            rep('пульс: без ошибок JavaScript', not terrs and not serrs, '; '.join(terrs + serrs)[:200])
            await b.close()
        rep('админ: обезличенная выгрузка без логинов', psql("select count(*) from vk_export_events where pid like 'p%'") != '0'
            and psql("select count(*) from vk_export_events where data::text like '%ученик%'") == '0')
        rep('сброс пароля сохраняет прогресс', psql("select vk_reset('ученик1') ~ '^[а-я]+[0-9]{4}$'") == 't'
            and psql("select (state->'meta'->'concept'->>'practice') from vk_students where login='ученик1'") == '1')
        srv.shutdown(); fn.terminate()
    finally:
        psql(f'drop database if exists {DB} with (force)', db='postgres')
    print(f'\nИТОГО: {sum(results)} из {len(results)}')
    sys.exit(0 if all(results) else 1)

if __name__ == '__main__':
    asyncio.run(main())

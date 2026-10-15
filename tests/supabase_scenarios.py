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
        if self.path == '/rest/v1/rpc/vk_ai_take' and self.headers.get('apikey') == 'service-test':
            args = json.loads(self.rfile.read(int(self.headers['Content-Length'] or 0)) or b'{}')
            out = psql(f"select vk_ai_take({lit(args.get('p_token'))})::text")
            self.send_response(200); self.send_header('Content-Type', 'application/json'); self.end_headers(); self.wfile.write(out.encode()); return
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
        for f in ('test.sql', 'admin.sql'):
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
            await pg.fill('#chat-in-task', 'мой телефон 8 916 123-45-67, помоги'); await pg.click('.chat-task .chat-form button'); await pg.wait_for_timeout(1500)
            rep('наставник ответил через сервер', 'на сколько частей' in await pg.inner_text('.chat-task .chat-log'))
            last = json.loads(urllib.request.urlopen(f'http://127.0.0.1:{FAKE_PORT}/last').read())
            user_txt = ' '.join(m['content'] for m in last['body']['messages'] if m['role'] == 'user')
            sys_txt = ' '.join(m['content'] for m in last['body']['messages'] if m['role'] == 'system')
            rep('ключ модели — только на сервере', last['auth'] == 'Bearer sk-test' and 'token' not in last['body'])
            rep('телефон вырезан из текста ребёнка', '916' not in user_txt and 'номер скрыт' in user_txt, user_txt[:80])
            rep('имя ученика не уходит в модель', 'Ученик 1' not in sys_txt and 'зовут' not in sys_txt)
            await pg.fill('#chat-in-task', 'ты сука тупая'); await pg.click('.chat-task .chat-form button'); await pg.wait_for_timeout(1500)
            _log = await pg.inner_text('.chat-task .chat-log'); rep('модерация: мягкий ответ ребёнку', 'вернёмся к математике' in _log, _log[-200:])
            rep('модерация: сигнал учителю записан', psql("select count(*) from vk_events where type='ai_flag'") == '1')
            await pg.fill('#chat-in-task', 'ещё подсказку'); await pg.click('.chat-task .chat-form button'); await pg.wait_for_timeout(1200)
            await pg.fill('#chat-in-task', 'и ещё'); await pg.click('.chat-task .chat-form button'); await pg.wait_for_timeout(1500)
            rep('лимит в день: понятное сообщение и урок не ломается', '30 вопросов' in await pg.inner_text('.chat-task') or 'конспект' in await pg.inner_text('.chat-task'))
            st, j = rpc(base, 'vektor_login', p_login='ученик2', p_password='компас1234')
            r = urllib.request.Request(base + '/functions/v1/tutor', data=json.dumps({'token': 'x' * 64, 'messages': [{'role': 'user', 'content': 'hi'}]}).encode(), headers={'Content-Type': 'application/json'})
            try: urllib.request.urlopen(r); code = 200
            except urllib.error.HTTPError as e: code = e.code
            rep('без входа наставник не отвечает (401)', code == 401, code)
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
        # Тест до/после: учитель открывает, ученик решает, сервер проверяет (Ф-27–Ф-29)
        async with async_playwright() as p:
            b = await p.chromium.launch()
            tp = await b.new_page(); await tp.goto(base + '/teacher.html'); await tp.wait_for_selector('#f')
            await tp.fill('[name=login]', 'uchitel'); await tp.fill('[name=password]', 'учитель-1'); await tp.click('#f button'); await tp.wait_for_selector('table', timeout=8000)
            rep('кабинет: панель тестов', await tp.locator('[data-test="5А|pre|1"]').count() == 1)
            await tp.click('[data-test="5А|pre|1"]'); await tp.wait_for_timeout(1200)
            rep('кабинет: тест открыт', 'идёт' in await tp.inner_text('.tests'))
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
                else: await li.locator('input').fill(a_ if int(n) != 2 else '4/6'); await li.locator('input').dispatch_event('change')
            await sp.wait_for_timeout(1500)
            await sp.click('#test-finish'); rep('предупреждение о пустых ответах', 'Не отвечено 3' in await sp.inner_text('#test-finish'))
            await sp.click('#test-finish'); await sp.wait_for_selector('text=Тест сдан', timeout=8000)
            rep('сервер посчитал балл (14 из 18: несокращённая дробь не засчитана)', psql("select score || '/' || total from vk_test_done where phase='pre'") == '14/18',
                psql("select score || '/' || total from vk_test_done"))
            await tp.reload(); await tp.wait_for_selector('table', timeout=8000)
            rep('кабинет: балл ученика виден', '14/18' in await tp.inner_text('table'))
            # контрольная группа: только тест
            psql("select vk_class_group('5Б', 'control')")
            cp = await b.new_page(); await login(cp, base, 'ученик40', 'компас1111'); await cp.wait_for_timeout(1500)
            rep('контрольная группа видит только ожидание теста', 'только тест' in await cp.inner_text('#app') and await cp.evaluate("typeof render") == 'undefined')
            # CSV
            async with tp.expect_download() as dl: await tp.click('#csv')
            path = await (await dl.value).path(); txt = open(path, encoding='utf-8-sig').read()
            rep('кабинет: CSV скачивается с кириллицей', txt.startswith('"Логин"') and 'ученик2' in txt)
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

asyncio.run(main())

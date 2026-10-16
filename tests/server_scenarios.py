"""Сценарии этапа 2: вход по логину с бумажки, прогресс на сервере, работа без сети.
Нужны php (8.1+, pdo_sqlite) и playwright. Запуск: python tests/server_scenarios.py
"""
import asyncio, json, os, pathlib, socket, subprocess, sys, tempfile, time, urllib.request
from playwright.async_api import async_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
TMP = pathlib.Path(tempfile.mkdtemp(prefix='vektor-srv-'))
CFG = TMP / 'config.php'
CFG.write_text(f"<?php return ['dsn' => 'sqlite:{TMP / 'db.sqlite'}'];")
ENV = {**os.environ, 'VEKTOR_CONFIG': str(CFG)}
results = []
def rep(name, ok, extra=''):
    results.append(ok); print(('OK  ' if ok else 'FAIL'), name, extra)

def php(code):
    return subprocess.run(['php', '-r', "require '" + str(ROOT / 'api/lib.php') + "'; migrate(); " + code],
                          env=ENV, capture_output=True, text=True, check=True).stdout

def free_port():
    s = socket.socket(); s.bind(('127.0.0.1', 0)); p = s.getsockname()[1]; s.close(); return p

def api(base, r, body=None, token=None):
    req = urllib.request.Request(f'{base}/api/?r={r}', data=json.dumps(body).encode() if body is not None else None,
                                 headers={'Content-Type': 'application/json', **({'Authorization': 'Bearer ' + token} if token else {})})
    try:
        with urllib.request.urlopen(req) as res: return res.status, json.loads(res.read())
    except urllib.error.HTTPError as e: return e.code, json.loads(e.read())

async def login(pg, base, user, pwd):
    await pg.goto(base + '/'); await pg.wait_for_selector('#login-form')
    await pg.fill('[name=login]', user); await pg.fill('[name=password]', pwd)
    await pg.click('#login-form button[type=submit]')

async def main():
    subprocess.run(['php', str(ROOT / 'api/tools/seed.php'), '--count=80', '--classes=5А:1-28,5Б:29-56,5В:57-80'], env=ENV, check=True, capture_output=True)
    subprocess.run(['php', str(ROOT / 'api/tools/seed.php'), '--teacher=uchitel', '--teacher-classes=5А'], env=ENV, check=True, capture_output=True)
    # известные пароли для теста
    php("db()->prepare('UPDATE students SET pass_hash=? WHERE login=?')->execute([password_hash('зоолог5679', PASSWORD_DEFAULT), 'ученик1']);"
        "db()->prepare('UPDATE students SET pass_hash=? WHERE login=?')->execute([password_hash('компас1234', PASSWORD_DEFAULT), 'ученик2']);"
        "db()->prepare('UPDATE students SET pass_hash=? WHERE login=?')->execute([password_hash('компас1111', PASSWORD_DEFAULT), 'ученик40']);"
        "db()->prepare('UPDATE teachers SET pass_hash=? WHERE login=?')->execute([password_hash('учитель-1', PASSWORD_DEFAULT), 'uchitel']);")
    rep('создано 80 профилей', php("echo db()->query('SELECT COUNT(*) FROM students')->fetchColumn();").strip() == '80')
    rep('пароли не повторяются', php("echo db()->query('SELECT COUNT(DISTINCT pass_hash) FROM students')->fetchColumn();").strip() == '80')

    port = free_port(); base = f'http://127.0.0.1:{port}'
    srv = subprocess.Popen(['php', '-S', f'127.0.0.1:{port}', '-t', str(ROOT), str(ROOT / 'tests/php_router.php')], env=ENV, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    for _ in range(50):
        try: urllib.request.urlopen(base + '/api/?r=ping'); break
        except Exception: time.sleep(0.1)
    try:
        async with async_playwright() as p:
            b = await p.chromium.launch()
            ctx = await b.new_context(); pg = await ctx.new_page()
            await pg.goto(base + '/'); await pg.wait_for_selector('#login-form')
            rep('без входа виден только экран входа', await pg.locator('.login').count() == 1 and await pg.evaluate("typeof render") == 'undefined')

            await pg.fill('[name=login]', 'uchenik1'); await pg.wait_for_timeout(50)
            rep('латиница → «Смени язык»', 'Смени язык' in await pg.inner_text('#login-msg'))

            await login(pg, base, 'ученик1', 'неверно0000'); await pg.wait_for_timeout(400)
            rep('неверный пароль', 'Неверный' in await pg.inner_text('#login-msg'))

            await login(pg, base, '  Ученик1 ', 'ЗООЛОГ5679'); await pg.wait_for_selector('#logout-btn', timeout=8000)
            rep('вход: регистр и пробелы не важны', 'Ученик 1' in await pg.inner_text('#logout-btn'))
            rep('имя в приложении — «Ученик 1»', await pg.evaluate("state.settings.name") == 'Ученик 1')
            rep('кнопка «Начать заново» скрыта', not await pg.locator('#reset').is_visible())

            # решить задачу — прогресс и событие уходят на сервер
            await pg.goto(base + '/#lesson/0/practice'); await pg.wait_for_timeout(300)
            ans = await pg.evaluate("session.task.answer")
            await pg.evaluate("""a => { const f=document.querySelector('#answer-form'); const p=String(a).split('/');
                const n=f.querySelector('#ans-num'), d=f.querySelector('#ans-den');
                if (d && p.length===2) { n.value=p[0]; d.value=p[1]; } else n.value=a; f.requestSubmit(); }""", ans)
            await pg.wait_for_timeout(2500)
            srv_state = json.loads(php("echo db()->query(\"SELECT state FROM students WHERE login='ученик1'\")->fetchColumn();"))
            rep('прогресс на сервере', srv_state.get('meta', {}).get('concept', {}).get('practice', 0) >= 1, srv_state.get('meta', {}).get('concept'))
            n_ev = php("echo db()->query(\"SELECT COUNT(*) FROM events WHERE type='attempt'\")->fetchColumn();").strip()
            rep('событие attempt в журнале', n_ev == '1', n_ev)
            rep('статус «Сохранено»', 'Сохранено' in await pg.inner_text('#sync-status'))

            # без сети: ответ копится и уходит при связи, без дублей
            await ctx.set_offline(True)
            await pg.evaluate("logEvent('test_offline', {k: 1}); save()")
            await pg.wait_for_timeout(2200)
            rep('без сети — «Нет связи»', 'Нет связи' in await pg.inner_text('#sync-status'))
            await ctx.set_offline(False); await pg.evaluate("dispatchEvent(new Event('online'))"); await pg.wait_for_timeout(1500)
            n_off = php("echo db()->query(\"SELECT COUNT(*) FROM events WHERE type='test_offline'\")->fetchColumn();").strip()
            rep('событие дошло после связи', n_off == '1', n_off)
            outbox = await pg.evaluate("JSON.parse(localStorage.getItem('vektor-outbox:ученик1')).length")
            rep('очередь пуста', outbox == 0, outbox)
            # повтор того же события не создаёт дубль
            st, j = api(base, 'login', {'login': 'ученик2', 'password': 'компас1234'})
            for _ in range(2): api(base, 'sync', {'events': [{'id': 'dup-test-123456', 'type': 'attempt', 'data': {}}]}, j['token'])
            rep('повтор события — без дубля', php("echo db()->query(\"SELECT COUNT(*) FROM events WHERE event_id='dup-test-123456'\")->fetchColumn();").strip() == '1')

            # другое устройство видит тот же прогресс
            ctx2 = await b.new_context(); pg2 = await ctx2.new_page()
            await login(pg2, base, 'ученик1', 'зоолог5679'); await pg2.wait_for_selector('#logout-btn', timeout=8000)
            rep('вход с другого устройства — тот же прогресс', await pg2.evaluate("state.meta.concept && state.meta.concept.practice") >= 1)
            await ctx2.close()

            # выход: следующий ученик не видит чужой прогресс
            await pg.click('#logout-btn'); await pg.wait_for_selector('#login-form', timeout=8000)
            rep('после выхода прогресс стёрт с устройства', await pg.evaluate("localStorage.getItem('vektor-progress-v3')") is None)
            await login(pg, base, 'ученик2', 'компас1234'); await pg.wait_for_selector('#logout-btn', timeout=8000)
            rep('следующий ученик начинает с нуля', not await pg.evaluate("state.meta.concept && state.meta.concept.practice"))
            await b.close()

        # блокировка после 5 ошибок
        for _ in range(5): api(base, 'login', {'login': 'ученик3', 'password': 'x'})
        st, j = api(base, 'login', {'login': 'ученик3', 'password': 'x'})
        rep('5 ошибок → блокировка', st == 429 and 'мин' in j['message'], st)
        # чужие действия без сессии
        rep('без сессии — 401', api(base, 'state')[0] == 401)
        st, j = api(base, 'login', {'login': 'ученик40', 'password': 'компас1111'})
        rep('ученик не открывает кабинет учителя', api(base, 'teacher_class', None, j['token'])[0] == 403)
        # кабинет: учитель 5А видит только свой класс
        st, t = api(base, 'teacher_login', {'login': 'uchitel', 'password': 'учитель-1'})
        st, c = api(base, 'teacher_class', None, t['token'])
        logins = {s['login'] for s in c['students']}
        rep('учитель видит только 5А (28 учеников)', len(logins) == 28 and 'ученик1' in logins and 'ученик40' not in logins, len(logins))
        u1 = next(s for s in c['students'] if s['login'] == 'ученик1')
        rep('в кабинете виден прогресс', u1['answers'] >= 1 or u1['progress'].get('concept', 0) > 0, u1)
        # служебные файлы закрыты (на Apache — .htaccess; встроенный сервер PHP .htaccess не читает)
        rep('config.local.php в .gitignore', 'api/config.local.php' in (ROOT / '.gitignore').read_text())
    finally:
        srv.terminate()
    print(f'\nИТОГО: {sum(results)} из {len(results)}')
    sys.exit(0 if all(results) else 1)

asyncio.run(main())

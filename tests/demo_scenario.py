"""Репетиция демо для акселератора (CL-10, раздел 10.1 ТЗ) — весь сценарий автоматом.
Настоящие SQL-функции в локальном Postgres (как tests/supabase_scenarios.py), живой класс — tools/demo/bots.mjs --fast.
Зелёный тест = демо не сломается на сцене. Запуск: python tests/demo_scenario.py
"""
import asyncio, http.server, os, secrets, socket, subprocess, sys, threading, time
from playwright.async_api import async_playwright
import supabase_scenarios as S

ROOT = S.ROOT
S.DB = 'vk_demo_' + secrets.token_hex(3)
PASS = 'репетиция2026'
R = []
def rep(name, ok, extra=''): R.append(ok); print(('OK  ' if ok else 'FAIL'), name, extra)

async def main():
    S.psql(f'create database {S.DB}', db='postgres')
    bots = None
    try:
        S.psql("do $$ begin create role anon nologin; exception when duplicate_object then null; end $$;"
               "do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;")
        for f in ('supabase/schema.sql', 'supabase/test.sql', 'supabase/admin.sql', 'supabase/teacher.sql', 'supabase/pulse.sql', 'supabase/pilot_report.sql', 'tools/demo/seed.sql'):
            subprocess.run(['psql', f'{S.PG} dbname={S.DB}', '-v', 'ON_ERROR_STOP=1', '-q', '-f', str(ROOT / f)], check=True, capture_output=True)
        rep('демо-школа создаётся', S.psql(f"select vk_demo_seed('{PASS}')").startswith('ok'))
        rep('повторный запуск сбрасывает всё', S.psql(f"select vk_demo_seed('{PASS}')").startswith('ok') and S.psql("select count(*) from vk_students s join vk_classes c on c.id=s.class_id where c.name='Демо'") == '26')
        try: S.psql("set role anon; select vk_demo_seed('x')"); rep('демо-сид закрыт от браузера', False)
        except RuntimeError: rep('демо-сид закрыт от браузера', True)

        s = socket.socket(); s.bind(('127.0.0.1', 0)); port = s.getsockname()[1]; s.close()
        srv = http.server.ThreadingHTTPServer(('127.0.0.1', port), S.H)
        threading.Thread(target=srv.serve_forever, daemon=True).start()
        base = f'http://127.0.0.1:{port}'
        t_start = time.time()
        # живой класс: 25 ботов в ускоренном режиме
        bots = subprocess.Popen(['node', str(ROOT / 'tools/demo/bots.mjs'), '--fast', '--minutes', '30'],
                                env={**os.environ, 'SB_URL': base, 'SB_KEY': 'anon-test', 'DEMO_PASSWORD': PASS},
                                stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)

        async with async_playwright() as p:
            b = await p.chromium.launch(); errs = []
            # --- 0:20–1:00 телефон ведущего: ошибка → жучок → контрпример → починка → двойник ---
            ph = await (await b.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True)).new_page()
            ph.on('pageerror', lambda e: errs.append('ученик: ' + str(e)))
            await ph.goto(base + '/'); await ph.wait_for_selector('#login-form')
            await ph.fill('[name=login]', 'демо'); await ph.fill('[name=password]', PASS); await ph.click('#login-form button[type=submit]')
            await ph.wait_for_selector('#logout-btn', state='attached', timeout=10000)
            await ph.evaluate("() => { state.toured = true; }")
            await ph.goto(base + '/#lesson/4/practice'); await ph.wait_for_timeout(500)
            await ph.evaluate("""() => { const f=(a,b)=>`<span class="frac"><span>${a}</span><span>${b}</span></span>`;
              Object.assign(session.task, { question: `${f(1,2)} + ${f(1,3)} = ?`, answer: '5/6', accept: 'equivalent', misc: g => (g && g.n===2 && g.d===5 ? 'add-denominators' : null) }); }""")
            await ph.evaluate("v => fillAnswer(v)", '2/5'); await ph.click('form.answer button[type=submit]')
            await ph.click('#xray-open'); await ph.click('[data-xr="done"]'); await ph.click('#review-open')
            rep('1. жучок пойман на телефоне', 'Складыватель' in await ph.inner_text('.review'))
            await ph.click('.rv-next')
            rep('2. контрпример «прибавили — стало меньше?»', 'меньше' in await ph.inner_text('.review'))
            await ph.locator('.rv-choice', has_text='Нет').click(); await ph.click('.rv-next')
            await ph.locator('.review .xr-in').first.fill('3/6 + 2/6'); await ph.click('.review [data-xr="add"]'); await ph.keyboard.type('5/6'); await ph.click('.review [data-xr="done"]')
            await ph.click('.rv-next')
            twin = await ph.evaluate("() => { const R=VEKTOR_RATIONAL; return R.str(R.evalLine(document.querySelector('.rv-task').dataset.expr).value); }")
            await ph.locator('.review .xr-in').first.fill(twin); await ph.click('.review [data-xr="done"]'); await ph.wait_for_timeout(200)
            rep('3. двойник ✓ — «проверим завтра»', 'завтра' in await ph.inner_text('.review'))

            # --- 1:00–1:40 ноутбук учителя: Пульс → мини-урок → задача шестерым → ✓ появляются ---
            tp = await (await b.new_context(viewport={'width': 1280, 'height': 800})).new_page()
            tp.on('pageerror', lambda e: errs.append('учитель: ' + str(e)))
            await tp.goto(base + '/teacher.html'); await tp.wait_for_selector('#f')
            await tp.fill('[name=login]', 'демо-учитель'); await tp.fill('[name=password]', PASS); await tp.click('#f button')
            row = tp.locator('.pulse-row[data-bug="add-diff:add-denominators"]')
            for _ in range(40):
                if await row.count() and '6 учеников' in await row.inner_text(): break
                await tp.wait_for_timeout(500); await tp.evaluate("() => document.querySelector('#cls') && document.querySelector('#cls').dispatchEvent(new Event('change'))")
                if _ % 6 == 5: await tp.reload()
            txt = await row.inner_text() if await row.count() else ''
            rep('4. Пульс: «Складывает знаменатели · 6 учеников» (+ ведущий)', 'Складывает числители и знаменатели' in txt and ('6 учеников' in txt or '7 учеников' in txt), txt[:120].replace('\n', ' '))
            rep('5. в Пульсе живые имена из демо-класса', any(n in txt for n in ['Аня С.', 'Дима Л.', 'Маша К.', 'Артём В.', 'Соня П.', 'Егор Н.']))
            async with tp.expect_popup() as pop: await row.locator('[data-board]').click()
            bp = await pop.value; await bp.wait_for_load_state()
            rep('6. мини-урок на доске', 'Бипыч думает' in await bp.inner_text('body')); await bp.close()
            await row.locator('[data-push]').click()
            done = ''
            for _ in range(30):
                await tp.wait_for_timeout(1000); await tp.reload(); await tp.wait_for_selector('.pulse-row', timeout=8000)
                r2 = tp.locator('.pulse-row[data-bug="add-diff:add-denominators"] .pr-push')
                done = await r2.inner_text() if await r2.count() else ''
                if '✓' in done: break
            rep('7. боты решили задачу учителя — ✓ появляются', '✓' in done, done[:100])
            await tp.click('[data-summary]'); sm = await tp.inner_text('.summary')
            rep('8. сводка урока с рекомендацией', 'На следующий урок' in sm)
            elapsed = time.time() - t_start
            rep('сценарий укладывается в 3 минуты', elapsed < 180, f'{elapsed:.0f} c')
            rep('нет ошибок JavaScript', not errs, '; '.join(errs)[:200])
            await b.close()
        rep('отчёт пилота считается', '"bugs_found"' in S.psql("select vk_pilot_report('Демо')::text") and int(S.psql("select (vk_pilot_report('Демо')->>'bugs_found')::int")) >= 6)
        srv.shutdown()
    finally:
        if bots: bots.terminate()
        S.psql(f'drop database if exists {S.DB} with (force)', db='postgres')
    print(f'\nИТОГО: {sum(R)} из {len(R)}')
    sys.exit(0 if all(R) else 1)

sys.path.insert(0, os.path.dirname(__file__))
asyncio.run(main())

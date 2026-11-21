"""Сценарии к supabase/pilot_fixes.sql (план приёмки: блокеры 1, 2, 5 и проверка дробей).
Вызывается из supabase_scenarios.py после накатывания всех SQL: run(psql, rep, lit)."""
import json, pathlib

def run(psql, rep, lit):
    q = lambda sql: psql('set role anon; ' + sql)
    js = lambda sql: json.loads(q(sql))
    login = lambda lg: js(f"select vektor_login({lit(lg)}, 'пароль0000')::text")['token']
    for lg in ('ученик60', 'ученик61', 'ученик62'):
        psql(f"update vk_students set pass_hash = extensions.crypt('пароль0000', extensions.gen_salt('bf', 8)) where login = {lit(lg)}")

    # ---------- проверка дробей: те же эталоны, что у тренировки ----------
    cases = json.loads((pathlib.Path(__file__).parent / 'answer_cases.json').read_text())['cases']
    wrong = [c for c in cases if (psql(f"select coalesce(vk_test_ok({lit(c[0])}, {lit(c[2])}, {lit(c[1])}), false)") == 't') != c[3]]
    rep('тест: проверка дробей совпадает с эталонами тренировки', not wrong, str(wrong[:3]))

    # ---------- блокер 5: класс из ведомости ----------
    t60 = login('ученик60')
    st = js(f"select vektor_state({lit(t60)})::text")
    rep('вход: класс из ведомости (5В → 5 класс)', st.get('class') == '5В' and st.get('grade') == 5, str(st)[:80])

    # ---------- блокер 1: школа и дом не перезаписывают друг друга ----------
    school, home = login('ученик61'), t60
    t61b = login('ученик61')  # «дом» того же ученика
    s0 = js(f"select vektor_state({lit(school)})::text")
    r1 = js(f"select vektor_sync(p_token => {lit(t61b)}, p_state => {lit({'answers': 5})}, p_events => '[]', p_base_rev => {s0['rev']})::text")
    rep('прогресс: первая запись с ревизией принята', r1.get('rev') == s0['rev'] + 1 and not r1.get('conflict'), str(r1))
    r2 = js(f"select vektor_sync(p_token => {lit(school)}, p_state => {lit({'answers': 3})}, p_events => {lit([{'id': 'school-evt-0001', 'type': 'merge_check', 'data': {}}])}, p_base_rev => {s0['rev']})::text")
    rep('прогресс: устаревшая копия не перезаписывает, сервер отдаёт своё', r2.get('conflict') is True and r2.get('rev') == r1['rev'] and r2.get('state') == {'answers': 5}, str(r2)[:120])
    rep('прогресс: события при конфликте всё равно приняты (без потерь)', 'school-evt-0001' in r2.get('accepted', []) and psql("select count(*) from vk_events where event_id = 'school-evt-0001'") == '1')
    rep('прогресс: на сервере осталось домашнее', psql("select state->>'answers' from vk_students where login = 'ученик61'") == '5')
    r3 = js(f"select vektor_sync(p_token => {lit(school)}, p_state => {lit({'answers': 8})}, p_events => '[]', p_base_rev => {r2['rev']})::text")
    rep('прогресс: слитая копия с новой ревизией принята', r3.get('rev') == r2['rev'] + 1 and psql("select state->>'answers' from vk_students where login = 'ученик61'") == '8')
    r4 = js(f"select vektor_sync(p_token => {lit(school)}, p_state => {lit({'answers': 9})}, p_events => '[]')::text")
    rep('прогресс: старая версия приложения (без ревизии) по-прежнему пишет', r4.get('rev') == r3['rev'] + 1)

    # ---------- блокер 2: «Тест сдан» только после записи ----------
    tt = js("select vektor_teacher_login('uchitel', 'учитель-1')::text")['token']
    psql("update vk_teachers set class_ids = array_append(class_ids, (select id from vk_classes where name = '5В')) where login = 'uchitel'")
    cid = psql("select id from vk_classes where name = '5В'")
    t62 = login('ученик62')
    js(f"select vektor_teacher_test({lit(tt)}, '5В', 'pre', true, 20)::text")
    a = js(f"select vektor_test_answer({lit(t60)}, 1, '3/8', 10)::text")
    f1 = js(f"select vektor_test_finish({lit(t60)})::text")
    f2 = js(f"select vektor_test_finish({lit(t60)})::text")
    rep('тест: сдача записана — status accepted', a.get('status') == 'saved' and f1.get('status') == 'accepted' and psql(f"select count(*) from vk_test_done d join vk_students s on s.id = d.student_id where s.login = 'ученик60'") == '1', str(f1))
    rep('тест: двойное нажатие / повтор после обрыва — снова accepted, без дубля', f2.get('status') == 'accepted' and f2.get('already') is True)
    # время вышло 30 секунд назад, учитель не закрывал: автосдача по таймеру принимается
    js(f"select vektor_test_answer({lit(t62)}, 2, '2/3', 15)::text")
    psql(f"update vk_tests set closes_at = now() - interval '30 seconds' where class_id = {cid} and phase = 'pre'")
    g = js(f"select vektor_test_finish({lit(t62)})::text")
    rep('тест: автосдача на последней секунде не теряется (2 минуты запаса)', g.get('status') == 'accepted', str(g))
    # учитель закрыл тест вручную — сдачи нет, ученик видит «закрыт», у учителя — «не сдал»
    js(f"select vektor_teacher_test({lit(tt)}, '5В', 'post', true, 20)::text")
    js(f"select vektor_test_answer({lit(t60)}, 1, '5/6', 5)::text")
    js(f"select vektor_teacher_test({lit(tt)}, '5В', 'post', false, 20)::text")
    late = js(f"select vektor_test_answer({lit(t60)}, 2, '3/5', 5)::text")
    c = js(f"select vektor_test_finish({lit(t60)})::text")
    rep('тест: закрыт учителем — ответ и сдача не записаны, статус closed', late.get('status') == 'closed' and c.get('status') == 'closed' and c.get('saved') == 1, str(c))
    tv = js(f"select vektor_teacher_tests({lit(tt)})::text")
    post = next(x for x in tv['classes'] if x['name'] == '5В')['tests']['post']
    rep('тест: у учителя тот же статус (не сдал, писал)', post['done'] == 0 and 'ученик60' in post['writing'] and not post['open'], str(post)[:120])
    # 2 минуты запаса не действуют после ручного закрытия
    rep('тест: после ручного закрытия досдать нельзя', psql(f"select vk_finishable_test((select id from vk_students where login = 'ученик60')) is null") == 't'
        or psql(f"select (vk_finishable_test((select id from vk_students where login = 'ученик60'))).class_id is null") == 't')
    psql(f"delete from vk_test_done where student_id in (select id from vk_students where class_id = {cid}); delete from vk_test_answers where student_id in (select id from vk_students where class_id = {cid}); delete from vk_tests where class_id = {cid}")
    psql(f"update vk_teachers set class_ids = array_remove(class_ids, {cid}) where login = 'uchitel'")
    psql("delete from vk_sessions where role = 'teacher'")


async def ui(base, psql, rep, lit, login):
    """Браузерные сценарии: два устройства, класс из ведомости, честные статусы теста, массовые подписи."""
    from playwright.async_api import async_playwright
    js = lambda sql: json.loads(psql('set role anon; ' + sql))
    for lg in ('ученик63', 'ученик64', 'ученик65'):
        psql(f"update vk_students set pass_hash = extensions.crypt('пароль0000', extensions.gen_salt('bf', 8)) where login = {lit(lg)}")
    async with async_playwright() as p:
        b = await p.chromium.launch(); errs = []
        # ---------- блокер 1: школа офлайн, дом — другая тема; потом обе синхронизируются ----------
        sch_ctx, home_ctx = await b.new_context(), await b.new_context()
        sch, home = await sch_ctx.new_page(), await home_ctx.new_page()
        for pg in (sch, home): pg.on('pageerror', lambda e: errs.append(str(e)))
        await login(sch, base, 'ученик63', 'пароль0000'); await sch.wait_for_selector('#logout-btn', timeout=8000)
        await login(home, base, 'ученик63', 'пароль0000'); await home.wait_for_selector('#logout-btn', timeout=8000)
        await sch_ctx.set_offline(True)
        await sch.evaluate("state.progress['reduce'] = 50; state.meta['reduce'] = { ...(state.meta['reduce'] || {}), tasks: 3 }; state.answers = (state.answers || 0) + 3; game().stars += 3; save()")
        await sch.wait_for_timeout(2000)
        await home.evaluate("state.progress['compare'] = 30; state.meta['compare'] = { ...(state.meta['compare'] || {}), tasks: 2 }; state.answers = (state.answers || 0) + 2; game().stars += 5; save()")
        await home.wait_for_timeout(2600)
        await sch_ctx.set_offline(False); await sch.evaluate("dispatchEvent(new Event('online'))"); await sch.wait_for_timeout(3500)
        srv = json.loads(psql("select state::text from vk_students where login = 'ученик63'"))
        rep('два устройства: на сервере обе темы', srv['progress'].get('reduce') == 50 and srv['progress'].get('compare') == 30, str(srv.get('progress', {}).get('reduce')) + '/' + str(srv.get('progress', {}).get('compare')))
        rep('два устройства: задачи и звёзды сложились без задвоения', srv.get('answers') == 5 and srv['game']['stars'] == 8, f"answers={srv.get('answers')} stars={srv['game'].get('stars')}")
        rep('два устройства: школьная вкладка показывает слитый прогресс', await sch.evaluate("state.progress.compare === 30 && state.progress.reduce === 50"))
        c3 = await b.new_context(); again = await c3.new_page()
        await login(again, base, 'ученик63', 'пароль0000'); await again.wait_for_selector('#logout-btn', timeout=8000)
        rep('два устройства: после повторного входа видны обе темы', await again.evaluate("state.progress.compare === 30 && state.progress.reduce === 50 && state.answers === 5"))
        for c in (sch_ctx, home_ctx, c3): await c.close()

        # ---------- блокер 5: шестиклассник с первого входа ----------
        psql("insert into vk_classes (name) select '6Т' where not exists (select 1 from vk_classes where name = '6Т'); update vk_students set class_id = (select id from vk_classes where name = '6Т'), state = null where login = 'ученик64'")
        c = await b.new_context(viewport={'width': 320, 'height': 640}); pg = await c.new_page()
        await login(pg, base, 'ученик64', 'пароль0000'); await pg.wait_for_selector('#logout-btn', state='attached', timeout=8000)
        rep('вход: ученик 6Т сразу в 6 классе', await pg.evaluate("state.settings.grade") == 6 and '6 класс' in await pg.inner_text('#app'))
        await pg.goto(base + '/#quick/q-check'); await pg.wait_for_timeout(1500)
        rep('320 px: первое задание не шире экрана', await pg.evaluate("document.documentElement.scrollWidth") <= 320)
        await c.close()

        # ---------- блокер 2: экран теста не врёт ----------
        tt = js("select vektor_teacher_login('uchitel', 'учитель-1')::text")['token']
        cid = psql("select id from vk_students where login = 'ученик65'") and psql("select class_id from vk_students where login = 'ученик65'")
        cname = psql(f"select name from vk_classes where id = {cid}")
        psql(f"update vk_teachers set class_ids = array_append(class_ids, {cid}) where login = 'uchitel'")
        js(f"select vektor_teacher_test({lit(tt)}, {lit(cname)}, 'pre', true, 20)::text")
        c = await b.new_context(); pg = await c.new_page()
        await login(pg, base, 'ученик65', 'пароль0000'); await pg.wait_for_selector('#test-finish', timeout=8000)
        js(f"select vektor_teacher_test({lit(tt)}, {lit(cname)}, 'pre', false, 20)::text")  # учитель закрыл перед сдачей
        await pg.click('#test-finish'); await pg.wait_for_timeout(300)
        if await pg.locator('#test-finish').count(): await pg.click('#test-finish')
        await pg.wait_for_timeout(1500)
        body = await pg.inner_text('#app')
        rep('тест: закрыт перед сдачей — экран «Тест закрыт», не «сдан»', 'Тест закрыт' in body and 'сдан' not in body.lower().replace('не записана', ''), body[:80])
        await pg.goto(base + '/'); await c.close()
        js(f"select vektor_teacher_test({lit(tt)}, {lit(cname)}, 'post', true, 20)::text")
        c = await b.new_context(); pg = await c.new_page()
        await login(pg, base, 'ученик65', 'пароль0000'); await pg.wait_for_selector('#test-finish', timeout=8000)
        await c.set_offline(True)
        await pg.click('#test-finish'); await pg.wait_for_timeout(300)
        if await pg.locator('#test-finish').count() and 'Всё равно' in await pg.inner_text('#test-finish'): await pg.click('#test-finish')
        await pg.wait_for_timeout(1200)
        off = await pg.inner_text('#app')
        rep('тест: без сети — «сдача ещё НЕ принята», не «сдан»', 'НЕ принята' in off and 'Тест сдан' not in off)
        await c.set_offline(False); await pg.wait_for_timeout(11500)
        on = await pg.inner_text('#app')
        rep('тест: связь вернулась — сдача отправилась сама, «Тест сдан»', 'Тест сдан' in on and psql("select count(*) from vk_test_done d join vk_students s on s.id = d.student_id where s.login = 'ученик65' and d.phase = 'post'") == '1', on[:60])
        await c.close()
        psql(f"delete from vk_test_done where student_id in (select id from vk_students where class_id = {cid}); delete from vk_test_answers where student_id in (select id from vk_students where class_id = {cid}); delete from vk_tests where class_id = {cid}")
        psql(f"update vk_teachers set class_ids = array_remove(class_ids, {cid}) where login = 'uchitel'")

        # ---------- блокер 3: подписи по точному логину, строки переставлены ----------
        c = await b.new_context(viewport={'width': 1280, 'height': 900}); tp = await c.new_page(); tp.on('pageerror', lambda e: errs.append(str(e)))
        await tp.goto(base + '/teacher.html'); await tp.wait_for_selector('#f')
        await tp.fill('[name=login]', 'uchitel'); await tp.fill('[name=password]', 'учитель-1'); await tp.click('#f button'); await tp.wait_for_selector('#tbody tr', timeout=8000)
        await tp.click('#tabs [data-tab=logins]'); await tp.wait_for_selector('#lab-bulk')
        await tp.fill('#lab-bulk', 'ученик12; Ира Т.\nУченик 11 ; Олег П.\nученик40; Чужой\nКатя без логина\nученик12; Повтор')
        await tp.click('#lab-check'); await tp.wait_for_selector('.lab-plan')
        plan = await tp.inner_text('.lab-plan')
        rep('подписи: предпросмотр — 1 сохранится, 4 нет (чужой, без логина, повтор)', 'будет сохранено 1' in plan and 'не будет сохранено 4' in plan, plan[:140].replace('\n', ' '))
        await tp.click('#lab-save'); await tp.wait_for_timeout(1200)
        out = await tp.inner_text('#lab-out')
        labs = psql("select string_agg(login || '=' || coalesce(label, '-'), ',' order by login) from vk_students where login in ('ученик11', 'ученик12', 'ученик40')")
        rep('подписи: сохранено строго по логину, ничего чужого', labs == 'ученик11=Олег П.,ученик12=-,ученик40=-', labs)
        rep('подписи: учитель видит фактическое число сохранённых и пропущенных', 'Сохранено на сервере: 1' in out and 'ошибок в строках: 4' in out, out)
        psql("update vk_students set label = null where login in ('ученик11', 'ученик12')")
        await c.close()
        psql("delete from vk_sessions where role = 'teacher'")
        rep('сценарии исправлений: без ошибок JavaScript', not errs, '; '.join(errs)[:200])
        await b.close()

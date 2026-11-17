import asyncio, pathlib
from playwright.async_api import async_playwright
# Первое впечатление ученика: знакомство «Поймай ошибку Бипыча», чистая главная, интересы после первой задачи.
# Запуск: python tests/ux_scenario.py
B = (pathlib.Path(__file__).resolve().parent.parent / 'index.html').as_uri()
R = []
def rep(n, ok, extra=''): R.append(ok); print(('OK  ' if ok else 'FAIL'), n, extra)

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); errs = []
        for w, h in [(390, 844), (1280, 860)]:
            ctx = await b.new_context(viewport={'width': w, 'height': h})
            # как у настоящего ребёнка: без признака автотеста, тогда главная сама отправляет в знакомство
            await ctx.add_init_script("Object.defineProperty(navigator,'webdriver',{get:()=>false})")
            pg = await ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
            await pg.goto(B); await pg.evaluate("localStorage.clear()"); await pg.goto(B + '#home'); await pg.reload(); await pg.wait_for_timeout(400)
            rep(f'{w}: новый ученик сначала видит знакомство', '#intro' in pg.url and await pg.locator('.intro [data-intro-pick]').count() == 2)
            rep(f'{w}: в знакомстве нет меню и экскурсии', not await pg.is_visible('.sidebar') and await pg.locator('.tour-tip').count() == 0)
            await pg.click('[data-intro-pick=right]'); await pg.wait_for_timeout(150)
            rep(f'{w}: шаг 2 — пример на экране и две пиццы', await pg.locator('.intro-board-small').count() == 1 and await pg.locator('.intro-pizza').count() == 2)
            await pg.click('[data-intro-pick=maybe]'); await pg.wait_for_timeout(150)
            rep(f'{w}: неверный выбор — подсказка, а не «неверно»', await pg.locator('.intro-hint').count() == 1 and 'неверно' not in (await pg.inner_text('.intro')).lower())
            await pg.click('[data-intro-pick=never]'); await pg.wait_for_timeout(300)
            txt = await pg.inner_text('.intro')
            rep(f'{w}: шаг 3 — пойман жучок, почему ошибка и как верно', 'Складыватель' in txt and 'разного размера' in txt and 'проверяем через день' in txt)
            rep(f'{w}: нет прокрутки вбок', not await pg.evaluate("document.documentElement.scrollWidth > innerWidth + 1"))
            await pg.click('[data-intro-go=home]'); await pg.wait_for_timeout(400)
            rep(f'{w}: после знакомства — главная, знакомство запомнено', pg.url.endswith('#home') and await pg.evaluate("state.introDone === true"))
            home = await pg.inner_text('#app')
            rep(f'{w}: у нового ученика нет «Начато» без попыток', 'Начато' not in home, home[:80])
            rep(f'{w}: интересы спрашиваем после первой задачи, а не сразу', await pg.locator('.interests-ask').count() == 0)
            rep(f'{w}: экскурсия не запускается сама', (await pg.wait_for_timeout(900)) is None and await pg.locator('.tour-tip').count() == 0)
            await pg.evaluate("() => { state.answers = 1; localStorage.setItem('vektor-progress-v3', JSON.stringify(state)); }"); await pg.reload(); await pg.wait_for_timeout(300)
            rep(f'{w}: после первой задачи появляется вопрос про интересы', await pg.locator('.interests-ask').count() == 1)
            await ctx.close()
        # старый ученик с демонстрационными процентами: прогресс без попыток обнуляется, с попытками — остаётся
        pg = await (await b.new_context()).new_page()
        await pg.goto(B); await pg.evaluate("""() => localStorage.setItem('vektor-progress-v3', JSON.stringify({ progress: { concept: 25, reduce: 33, compare: 20, 'add-same': 33 },
          meta: { compare: { practice: 2 } }, attempts: [{ topic: 'reduce', firstTry: true }], answers: 3, introDone: true }))""")
        await pg.reload(); await pg.wait_for_timeout(300)
        pr = await pg.evaluate("state.progress")
        rep('демо-проценты без попыток убраны, настоящие сохранены', pr['concept'] == 0 and pr['add-same'] == 0 and pr['reduce'] == 33 and pr['compare'] == 20, str(pr))

        # лёгкий старт: уровень с плитками, ответ нажатием и перетаскиванием, ошибка без наказания
        ctx = await b.new_context(viewport={'width': 390, 'height': 844})
        pg = await ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto(B); await pg.evaluate("localStorage.setItem('vektor-progress-v3', JSON.stringify({ introDone: true }))")
        await pg.goto(B + '#home'); await pg.reload(); await pg.wait_for_timeout(400)
        rep('телефон: первый уровень — проверка знаний, дальше облака', await pg.locator('#path .is-current a[href="#quick/q-check"]').count() >= 1 and await pg.locator('#path .is-fog').count() == 2)
        rep('телефон: Бипыч в углу, нажатие ведёт в разговор', await pg.locator('.bip-dock [data-bip-chat]').count() == 1)
        rep('телефон: на главной нет длинных текстов', len((await pg.inner_text('#app')).split()) < 60, str(len((await pg.inner_text('#app')).split())))
        # проверка знаний: сложение и умножение верно, ряд и половина — ошибки
        await pg.goto(B + '#quick/q-check'); await pg.wait_for_timeout(300)
        rep('проверка: Бипыч предлагает проверить прошлые знания', 'прошлые знания' in await pg.evaluate("quickRun.msg"))
        for k in range(6):
            t = await pg.evaluate("({a: quickRun.task.answer, f: quickRun.task.from, v: [...document.querySelectorAll('.qz-tile')].map(x => +x.dataset.v)})")
            good = t['f'] in ('q-add', 'q-mult')
            v = t['a'] if good else [x for x in t['v'] if x != t['a']][0]
            await pg.click(f'.qz-tile[data-v="{v}"]'); await pg.wait_for_timeout(800 if good else 1900)
        await pg.wait_for_timeout(300)
        q = await pg.evaluate("state.quick")
        rep('проверка: известные уровни засчитаны, остальные нет', q.get('q-check', {}).get('done') and q.get('q-add', {}).get('via') == 'check' and q.get('q-mult', {}).get('via') == 'check' and 'q-seq' not in q and 'q-half' not in q, str(q))
        rep('проверка: итог «Уже знаешь…» и старт с первого незнакомого', 'Уже знаешь' in await pg.inner_text('#app') and 'Начнём с: Числовой ряд' in await pg.inner_text('#app'))
        await pg.evaluate("() => { state.quick = { 'q-check': { done: true, known: [] } }; save(); }")
        await pg.goto(B + '#quick/q-add'); await pg.wait_for_timeout(300)
        rep('старт: в уровне нет клавиатуры, только плитки 1–5', await pg.locator('.qz-tile').count() == 5 and await pg.locator('.qz input').count() == 0)
        for k in range(5):
            ans = await pg.evaluate("quickRun.task.answer")
            if k == 0:
                wrong = 1 if ans != 1 else 2
                await pg.click(f'.qz-tile[data-v="{wrong}"]'); await pg.wait_for_timeout(500)
                rep('старт: ошибка — серия сброшена, Бипыч подсказывает', await pg.evaluate("quickRun.streak === 0 && quickRun.misses === 1") and await pg.locator('.qz-tile.shake').count() == 1)
            if k == 1:
                t = await pg.locator(f'.qz-tile[data-v="{ans}"]').bounding_box(); sl = await pg.locator('.qz-slot').bounding_box()
                await pg.mouse.move(t['x'] + 20, t['y'] + 20); await pg.mouse.down()
                await pg.mouse.move(sl['x'] + sl['width'] / 2, sl['y'] + sl['height'] / 2, steps=8); await pg.mouse.up()
            else:
                await pg.click(f'.qz-tile[data-v="{ans}"]')
            await pg.wait_for_timeout(800)
            if k == 1: rep('старт: перетаскивание плитки в клетку засчитано', await pg.evaluate("quickRun.k") == 2)
        await pg.wait_for_timeout(400)
        rep('старт: 5 задач — уровень пройден и сохранён', 'Уровень пройден' in await pg.inner_text('#app') and await pg.evaluate("state.quick['q-add'].done === true"))
        await pg.goto(B + '#home'); await pg.wait_for_timeout(300)
        rep('старт: на карте следующий уровень — «Умножение»', await pg.locator('#path .is-current a[href="#quick/q-mult"]').count() >= 1)
        # Метрика: при номере счётчика грузится, поля и реплики ученика скрыты от Вебвизора, текст ответов в цели не уходит
        mp = await ctx.new_page(); mp.on('pageerror', lambda e: errs.append(str(e)))
        await mp.add_init_script("Object.defineProperty(navigator,'webdriver',{get:()=>false}); Object.defineProperty(window, 'VEKTOR_CONFIG', { configurable: true, set(v) { Object.defineProperty(window, 'VEKTOR_CONFIG', { value: Object.assign(v, { metrikaId: '12345' }), writable: true }); }, get() { return undefined; } })")
        await mp.route('https://mc.yandex.ru/**', lambda r: r.fulfill(status=200, content_type='application/javascript', body=''))
        await mp.goto(B + '#settings'); await mp.wait_for_timeout(500)
        ym = await mp.evaluate("(window.ym && window.ym.a || []).map(a => [...a])")
        init = [a for a in ym if a[1] == 'init']
        rep('метрика: счётчик с Вебвизором, картой кликов и экранами по адресу', bool(init) and init[0][2].get('webvisor') and init[0][2].get('clickmap') and init[0][2].get('trackHash'), str(init)[:120])
        rep('метрика: поля ввода скрыты от записи', await mp.evaluate("[...document.querySelectorAll('input, textarea')].every(x => x.classList.contains('ym-disable-keys'))") and await mp.locator('input').count() > 0)
        rep('метрика: имя ученика скрыто', await mp.evaluate("document.querySelector('#student-name').classList.contains('ym-hide-content')"))
        await mp.evaluate("logEvent('attempt', { topic: 'reduce', question: 'Сократи 4/8', answer: 'Маша', ok: false })")
        g = await mp.evaluate("window.ym.a.filter(a => a[1] === 'reachGoal').map(a => [a[2], a[3]]).pop()")
        rep('метрика: в цель уходят тема и итог, без текста задачи и ответа', g[0] == 'attempt' and g[1].get('topic') == 'reduce' and 'answer' not in g[1] and 'question' not in g[1], str(g))
        await mp.close()
        await ctx.close()
        rep('в браузере нет ошибок JavaScript', not errs, '; '.join(errs[:3]))
        await b.close()
    print(f'\nИТОГО: {sum(R)} из {len(R)}')
    raise SystemExit(0 if all(R) else 1)

asyncio.run(main())

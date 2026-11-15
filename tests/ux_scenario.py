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
            rep(f'{w}: шаг 2 — полоски для сравнения', await pg.locator('.intro-figure svg').count() == 1)
            await pg.click('[data-intro-pick=maybe]'); await pg.wait_for_timeout(150)
            rep(f'{w}: неверный выбор — подсказка, а не «неверно»', await pg.locator('.intro-hint').count() == 1 and 'неверно' not in (await pg.inner_text('.intro')).lower())
            await pg.click('[data-intro-pick=never]'); await pg.wait_for_timeout(300)
            txt = await pg.inner_text('.intro')
            rep(f'{w}: шаг 3 — пойман жучок и как работает Вектор', 'Складыватель' in txt and 'Проверяем через день' in txt)
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
        rep('в браузере нет ошибок JavaScript', not errs, '; '.join(errs[:3]))
        await b.close()
    print(f'\nИТОГО: {sum(R)} из {len(R)}')
    raise SystemExit(0 if all(R) else 1)

asyncio.run(main())

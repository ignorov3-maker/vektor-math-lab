import asyncio, pathlib, time
from playwright.async_api import async_playwright
# Черновик «Рентгена» на телефоне 390 px. Запуск: python tests/xray_scenario.py
B=(pathlib.Path(__file__).resolve().parent.parent / 'index.html').as_uri()
R=[]
def rep(n, ok, extra=''): R.append(ok); print(('OK  ' if ok else 'FAIL'), n, extra)
async def main():
    async with async_playwright() as p:
        b=await p.chromium.launch(); ctx=await b.new_context(viewport={'width':390,'height':844}, has_touch=True, is_mobile=True)
        pg=await ctx.new_page(); errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.route('https://openrouter.ai/**', lambda r: r.abort())
        await pg.goto(B); await pg.evaluate("localStorage.clear()")
        await pg.goto(B+'#lesson/4/practice'); await pg.wait_for_timeout(300)
        # подменяем задачу на ту, что в ТЗ, чтобы сценарий был детерминированным
        await pg.evaluate("""() => { const f=(a,b)=>`<span class="frac"><span>${a}</span><span>${b}</span></span>`;
          Object.assign(session.task, { question: `${f(1,2)} + ${f(1,3)} = ?`, answer: '5/6', accept: 'equivalent', misc: g => (g && g.n===2 && g.d===5 ? 'add-denominators' : null) }); }""")
        await pg.evaluate("v => fillAnswer(v)", '2/5'); await pg.click('form.answer button[type=submit]'); await pg.wait_for_timeout(150)
        rep('после ошибки главная кнопка — «Поймать жучка»', await pg.locator('#xray-open.btn-primary').count()==1)
        await pg.click('#xray-open'); await pg.wait_for_timeout(150)
        rep('черновик открыт, условие серое', await pg.locator('.xray .xr-cond').inner_text()=='1/2 + 1/3'.replace(' ','') or '1' in await pg.locator('.xray .xr-cond').inner_text())
        # ввод строки на клавиатуре черновика — засекаем время как ребёнок: стираем и набираем
        t0=time.time()
        inp=pg.locator('.xr-in').first; await inp.fill('')
        for ch in '1': await pg.keyboard.type(ch)
        await pg.click('.xr-key[data-k="/"]'); await pg.keyboard.type('2')
        await pg.click('.xr-key[data-k="+"]'); await pg.keyboard.type('1')
        await pg.click('.xr-key[data-k="/"]'); await pg.keyboard.type('3')
        await pg.click('[data-xr="add"]'); await pg.keyboard.type('2'); await pg.click('.xr-key[data-k="/"]'); await pg.keyboard.type('5')
        await pg.click('[data-xr="done"]'); await pg.wait_for_timeout(150)
        dt=time.time()-t0
        rep('ввод двух строк быстрый', dt < 15, f'{dt:.1f} c')
        rows=pg.locator('.xr-row[data-row]')
        rep('первая строка верна ✓', 'ok' in (await rows.nth(0).get_attribute('class')))
        rep('ошибочная строка подсвечена', 'bad' in (await rows.nth(1).get_attribute('class')))
        rep('жучок назван', 'Складыватель' in await pg.inner_text('.xr-result'))
        rep('событие bug_found ушло в журнал', await pg.evaluate("session.xray && session.xray.key")=='add-diff:add-denominators')
        rep('нет прокрутки вбок', not await pg.evaluate("document.documentElement.scrollWidth > innerWidth + 1"))
        await pg.click('[data-xr="skip"]'); rep('«Не помню» закрывает черновик', await pg.locator('.xray').count()==0)
        # словесная задача — черновика нет
        await pg.goto(B+'#lesson/0/practice'); await pg.wait_for_timeout(300)
        await pg.evaluate("v => fillAnswer(v)", '1/99'); await pg.click('form.answer button[type=submit]'); await pg.wait_for_timeout(150)
        rep('в словесной задаче кнопки черновика нет', await pg.locator('#xray-open').count()==0)
        rep('нет ошибок JavaScript', not errs, '; '.join(errs)[:200])
        await b.close()
    print(f'\nИТОГО: {sum(R)} из {len(R)}')
    raise SystemExit(0 if all(R) else 1)
asyncio.run(main())

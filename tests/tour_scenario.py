import asyncio, pathlib
from playwright.async_api import async_playwright
# Вводное обучение на разных экранах: подсказка в пределах экрана и не закрывает подсвеченное.
# Запуск: python tests/tour_scenario.py
B = (pathlib.Path(__file__).resolve().parent.parent / 'index.html').as_uri()
R = []
def rep(n, ok, extra=''): R.append(ok); print(('OK  ' if ok else 'FAIL'), n, extra)
GEOM = """() => { const t=document.querySelector('.tour-tip'), h=document.querySelector('.tour-hole'); if(!t||!h) return null;
  const a=t.getBoundingClientRect(), b=h.getBoundingClientRect();
  const ov=Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left))*Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top));
  return { inside: a.left>=0 && a.top>=0 && a.right<=innerWidth && a.bottom<=innerHeight, ov: Math.round(ov), holeW: b.width, holeH: b.height }; }"""
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(); errs = []
        for w, h in [(320, 568), (360, 640), (430, 932), (820, 1180), (1024, 600), (1280, 720), (1920, 1080), (2560, 1080)]:
            pg = await (await b.new_context(viewport={'width': w, 'height': h})).new_page(); pg.on('pageerror', lambda e: errs.append(str(e)))
            await pg.goto(B); await pg.evaluate("localStorage.clear()"); await pg.reload(); await pg.wait_for_timeout(200)
            await pg.evaluate("startTour(0)"); bad = []
            for k in range(await pg.evaluate("TOUR.length")):
                await pg.wait_for_timeout(120); g = await pg.evaluate(GEOM)
                if not g or not g['inside'] or g['ov'] > 0 or g['holeW'] < 8 or g['holeH'] < 8: bad.append((k + 1, g))
                await pg.click('[data-tour-next]')
            rep(f'обучение {w}×{h}: все шаги видны и не закрывают подсветку', not bad, str(bad)[:160])
            rep(f'обучение {w}×{h}: в конце закрывается и запоминается', await pg.locator('.tour-tip').count() == 0 and await pg.evaluate("state.toured === true"))
        # поворот экрана посреди шага
        pg = await (await b.new_context(viewport={'width': 390, 'height': 844})).new_page()
        await pg.goto(B); await pg.evaluate("localStorage.clear()"); await pg.reload(); await pg.evaluate("startTour(0)"); await pg.wait_for_timeout(150)
        await pg.set_viewport_size({'width': 844, 'height': 390}); await pg.wait_for_timeout(250); g = await pg.evaluate(GEOM)
        rep('поворот экрана: подсказка пересчитывается', g and g['inside'] and g['ov'] == 0, str(g))
        await pg.keyboard.press('Escape'); await pg.wait_for_timeout(100)
        rep('Esc закрывает обучение', await pg.locator('.tour-tip').count() == 0)
        rep('нет ошибок JavaScript', not errs, '; '.join(errs)[:200])
        await b.close()
    print(f'\nИТОГО: {sum(R)} из {len(R)}'); raise SystemExit(0 if all(R) else 1)
asyncio.run(main())

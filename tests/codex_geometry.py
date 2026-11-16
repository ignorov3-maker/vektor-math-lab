"""Все новые фигуры в четырёх скинах и на 390 px. Без учебного контента методиста."""
import asyncio,os,pathlib
from playwright.async_api import async_playwright
ROOT=pathlib.Path(__file__).resolve().parent.parent
async def main():
    total=0
    async with async_playwright() as p:
        opts={'executable_path':os.environ['CODEX_BROWSER_EXECUTABLE']} if os.environ.get('CODEX_BROWSER_EXECUTABLE') else {}
        b=await p.chromium.launch(**opts);page=await b.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
        await page.goto((ROOT/'assets/geometry/demo.html').as_uri())
        for skin in ['notebook','orbit','pop','pixel']:
            await page.evaluate('(s)=>document.documentElement.dataset.skin=s',skin)
            for width in [1440,390]:
                await page.set_viewport_size({'width':width,'height':1000})
                assert await page.locator('.figure svg[role=img]').count()==7
                assert await page.evaluate('document.documentElement.scrollWidth<=innerWidth'),(skin,width)
                for i in range(7):
                    svg=page.locator('.figure>svg').nth(i)
                    assert await svg.get_attribute('aria-label')
                    assert (await svg.bounding_box())['width']>=250, 'geometry labels must remain readable'
                    markup=await svg.inner_html()
                    assert not any(s in markup for s in ['NaN','Infinity','undefined'])
                    total+=1
                if os.environ.get('CODEX_SCREENSHOT_DIR'):
                    out=pathlib.Path(os.environ['CODEX_SCREENSHOT_DIR']);out.mkdir(parents=True,exist_ok=True)
                    await page.screenshot(path=str(out/f'geometry-{skin}-{width}.png'),full_page=True)
        assert not errors,errors
        await b.close()
    print(f'ИТОГО: {total} из {total}')
asyncio.run(main())

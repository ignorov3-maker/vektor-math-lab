import asyncio
import os
from pathlib import Path
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parent.parent
DATA = {"kidName":"Складыватель","title":"Прибавили — стало меньше?","slides":[
    {"kind":"wrong","html":"<p>Бипыч думает, что…</p><p>1/2 + 1/3 = 2/5</p>","question":"Какое правило он использовал?","answerHtml":"Сложил числители и знаменатели."},
    {"kind":"conflict","html":"<p>Четверть плюс четверть — снова четверть?</p><p>1/4 + 1/4 → 2/8 = 1/4</p>","question":"Может ли сумма остаться прежней?","answerHtml":"Нет. Две четверти — это половина."},
    {"kind":"fix","html":"<p>Сначала делаем части одинаковыми.</p><p>1/2 = 3/6 · 1/3 = 2/6</p>","question":"Сколько шестых получится вместе?","answerHtml":"3/6 + 2/6 = 5/6."}
]}
RESULTS = []


def check(name, ok):
    RESULTS.append(bool(ok)); print(("OK   " if ok else "FAIL "), name, flush=True)


async def main():
    async with async_playwright() as p:
        opts={"executable_path":os.environ["CODEX_BROWSER_EXECUTABLE"]} if os.environ.get("CODEX_BROWSER_EXECUTABLE") else {}
        browser=await p.chromium.launch(**opts)
        page=await browser.new_page(viewport={"width":1280,"height":720})
        errors=[];page.on("pageerror",lambda e:errors.append(str(e)))
        await page.goto((ROOT/"board.html").as_uri())
        await page.evaluate("localStorage.removeItem('vektor-board')")
        await page.reload()
        check("empty board",await page.locator("#empty").is_visible())
        await page.evaluate("data => localStorage.setItem('vektor-board',JSON.stringify(data))",DATA)
        await page.reload()
        check("teacher data loaded",await page.locator("#position").inner_text()=="1 / 3")
        check("projector font at least 40px",await page.evaluate("parseFloat(getComputedStyle(document.querySelector('.slide-html')).fontSize)>=40"))
        await page.locator("#show-answer").click()
        check("answer revealed",await page.locator("#answer").is_visible())
        await page.locator("#next").click()
        check("next slide hides previous answer",await page.locator("#position").inner_text()=="2 / 3" and await page.locator("#answer").is_hidden())
        await page.locator("body").click(position={"x":5,"y":5})
        await page.keyboard.press("ArrowRight")
        check("keyboard navigation",await page.locator("#position").inner_text()=="3 / 3")
        await page.keyboard.press("Space")
        check("space reveals answer",await page.locator("#answer").is_visible())
        check("sample fits 1280x720",await page.evaluate("document.documentElement.scrollHeight<=innerHeight && document.documentElement.scrollWidth<=innerWidth"))
        if os.environ.get("CODEX_SCREENSHOT_DIR"):
            out=Path(os.environ["CODEX_SCREENSHOT_DIR"]);out.mkdir(parents=True,exist_ok=True)
            await page.screenshot(path=str(out/"board-1280.png"),animations="disabled")
        await page.evaluate("""() => localStorage.setItem('vektor-board',JSON.stringify({
            title:'<img src=x onerror=alert(1)>',
            slides:[{kind:'wrong',html:'<script>window.bad=true</script><svg onload="window.bad=true"><rect width="20" height="20"/></svg><img src="https://example.org/track"><p onclick="window.bad=true">Текст</p>',answerHtml:'<iframe src="https://example.org"></iframe>Ответ'}]
        }))""")
        await page.reload()
        check("HTML preserves math SVG but strips active content",await page.evaluate("""() => !window.bad &&
            !document.querySelector('#slide-html script,#slide-html img,#slide-html iframe,#slide-html [onload],#slide-html [onclick]') &&
            !!document.querySelector('#slide-html svg rect')"""))
        await page.evaluate("localStorage.setItem('vektor-board','{broken')")
        await page.reload()
        check("malformed storage safe",await page.locator("#empty").is_visible())
        await page.set_viewport_size({"width":390,"height":844})
        check("mobile no overflow",await page.evaluate("document.documentElement.scrollWidth<=innerWidth"))
        check("no JS errors",not errors)
        await browser.close()
    print(f"ИТОГО: {sum(RESULTS)} из {len(RESULTS)}")
    if not all(RESULTS):raise SystemExit(1)


if __name__=="__main__":asyncio.run(main())

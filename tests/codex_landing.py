import asyncio
import os
from pathlib import Path
from playwright.async_api import async_playwright

ROOT=Path(__file__).resolve().parent.parent
RESULTS=[]
def check(name,ok):
    RESULTS.append(bool(ok));print(("OK   " if ok else "FAIL "),name,flush=True)

async def main():
    async with async_playwright() as p:
        opts={"executable_path":os.environ["CODEX_BROWSER_EXECUTABLE"]} if os.environ.get("CODEX_BROWSER_EXECUTABLE") else {}
        b=await p.chromium.launch(**opts);page=await b.new_page(viewport={"width":1440,"height":1000})
        errors=[];remote=[];page.on("pageerror",lambda e:errors.append(str(e)))
        page.on("request",lambda r:remote.append(r.url) if r.url.startswith(("https:","http:")) else None)
        for width in [1440,768,390]:
            await page.set_viewport_size({"width":width,"height":1000})
            await page.goto((ROOT/"landing/index.html").as_uri())
            check(f"landing {width}px no overflow",await page.evaluate("document.documentElement.scrollWidth<=innerWidth"))
            check("pilot metrics are placeholders",await page.locator(".metrics strong").all_inner_texts()==["Скоро"]*3)
            await page.locator("#example-toggle").click()
            check("counterexample toggles",await page.locator("#example-answer").is_visible())
            if os.environ.get("CODEX_SCREENSHOT_DIR"):
                out=Path(os.environ["CODEX_SCREENSHOT_DIR"]);out.mkdir(parents=True,exist_ok=True)
                await page.screenshot(path=str(out/f"landing-{width}.png"),full_page=True,animations="disabled")
        await page.set_viewport_size({"width":1280,"height":720})
        await page.goto((ROOT/"landing/pitch.html").as_uri())
        check("7 pitch scenes",await page.locator(".slide").count()==7)
        for i in range(7):
            check(f"pitch scene {i+1} fits projector",await page.evaluate("document.documentElement.scrollHeight<=innerHeight && document.documentElement.scrollWidth<=innerWidth"))
            check(f"pitch scene {i+1} is unique visible",await page.locator(".slide:visible").count()==1)
            if os.environ.get("CODEX_SCREENSHOT_DIR") and i in [0,5]:
                await page.screenshot(path=str(Path(os.environ["CODEX_SCREENSHOT_DIR"])/f"pitch-{i+1}.png"),animations="disabled")
            if i<6:await page.locator("#next").click()
        check("last slide stops",await page.locator("#next").is_disabled())
        await page.set_viewport_size({"width":390,"height":844})
        check("pitch mobile no overflow",await page.evaluate("document.documentElement.scrollWidth<=innerWidth"))
        check("no external resources",not remote)
        check("no JS errors",not errors)
        await b.close()
    print(f"ИТОГО: {sum(RESULTS)} из {len(RESULTS)}")
    if not all(RESULTS):raise SystemExit(1)
if __name__=="__main__":asyncio.run(main())

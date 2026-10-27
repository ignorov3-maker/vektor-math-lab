"""Purchases, persistence and shared wardrobe checks on a local HTTP origin."""
import asyncio
import functools
import os
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parent.parent
RESULTS = []


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_):
        pass


def check(name, ok):
    RESULTS.append(bool(ok))
    print(("OK   " if ok else "FAIL "), name, flush=True)


async def main():
    server = ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(QuietHandler, directory=str(ROOT)))
    threading.Thread(target=server.serve_forever, daemon=True).start()
    base = f"http://127.0.0.1:{server.server_port}"
    try:
        async with async_playwright() as p:
            opts = {"executable_path": os.environ["CODEX_BROWSER_EXECUTABLE"]} if os.environ.get("CODEX_BROWSER_EXECUTABLE") else {}
            browser = await p.chromium.launch(**opts)
            context = await browser.new_context(viewport={"width":1440,"height":1000})
            page = await context.new_page()
            errors = []
            page.on("pageerror", lambda e: errors.append(str(e)))
            await page.goto(base + "/assets/drobik/demo.html#wardrobe-section")
            check("shop available directly in mascot demo", await page.locator("#wardrobe [data-buy=hat-cap]").count() == 1)
            check("initial demo balance", await page.evaluate("VEKTOR_WARDROBE.getState().stars === 90"))
            await page.locator("#wardrobe [data-try=hat-cap]").click()
            check("trying does not spend, own or equip", await page.evaluate("""() => {
                const s=VEKTOR_WARDROBE.getState();
                return s.stars===90&&!s.owned.includes('hat-cap')&&!s.equipped.hat
                    && document.querySelector('#main-bipych .bipych-hat').children.length===0;
            }"""))
            await page.locator("#wardrobe [data-buy=hat-cap]").click()
            await page.wait_for_function("VEKTOR_WARDROBE.getState().owned.includes('hat-cap')")
            check("purchase deducts exact price", await page.evaluate("VEKTOR_WARDROBE.getState().stars === 55"))
            check("purchase keeps category and replaces buy with equip", await page.locator("#wardrobe [data-slot=hat]").get_attribute("aria-pressed") == "true" and await page.locator("#wardrobe [data-equip=hat-cap]").count() == 1)
            await page.evaluate("Promise.all([VEKTOR_WARDROBE.buy('hat-cap'),VEKTOR_WARDROBE.buy('hat-cap')])")
            check("repeated purchase does not charge twice", await page.evaluate("VEKTOR_WARDROBE.getState().stars === 55"))
            await page.locator("#wardrobe [data-equip=hat-cap]").click()
            await page.wait_for_function("VEKTOR_WARDROBE.getState().equipped.hat === 'hat-cap'")
            check("equipped hat appears on main character", await page.locator("#main-bipych .bipych-hat>*").count() > 0)
            await page.reload()
            check("purchases, balance and outfit survive reload", await page.evaluate("""() => {
                const s=VEKTOR_WARDROBE.getState();
                return s.stars===55&&s.owned.includes('hat-cap')&&s.equipped.hat==='hat-cap'
                    &&document.querySelector('#main-bipych .bipych-hat').children.length>0;
            }"""))
            await page.locator("#wardrobe [data-shop-view=owned]").click()
            check("my items only shows owned hat", await page.locator("#wardrobe [data-item]").count() == 1 and await page.locator("#wardrobe [data-item=hat-cap]").count() == 1)
            await page.locator("#undress").click()
            await page.wait_for_function("!VEKTOR_WARDROBE.getState().equipped.hat")
            check("taking off keeps ownership", await page.evaluate("VEKTOR_WARDROBE.getState().owned.includes('hat-cap') && document.querySelector('#main-bipych .bipych-hat').children.length===0"))
            await page.locator("#wardrobe [data-slot=antenna]").click()
            check("empty owned category", await page.locator("#wardrobe .vc-empty-filter").count() == 1)
            await page.locator("#wardrobe [data-shop-view=store]").click()
            await page.locator("#wardrobe [data-slot=hat]").click()
            check("expensive item disabled", await page.locator("#wardrobe [data-buy=hat-captain]").is_disabled())
            check("achievement items cannot be purchased", await page.evaluate("""async () => {
                try {await VEKTOR_WARDROBE.buy('hat-crown');return false;}catch(_){}
                return VEKTOR_WARDROBE.getState().stars===55&&!VEKTOR_WARDROBE.getState().owned.includes('hat-crown');
            }"""))
            check("unowned accessories cannot be equipped", await page.evaluate("""async () => {
                try {await VEKTOR_WARDROBE.equip('hat','hat-headphones');return false;}catch(_){}
                return !VEKTOR_WARDROBE.getState().equipped.hat;
            }"""))
            await page.locator("#demo-stars").click()
            await page.wait_for_function("VEKTOR_WARDROBE.getState().stars === 105")
            check("demo top-up persists", await page.evaluate("VEKTOR_WARDROBE.getState().stars === 105"))
            peer = await context.new_page()
            await peer.goto(base + "/assets/collection/demo.html")
            check("collection uses same wardrobe", await peer.evaluate("collectionDemoState.stars === 105 && collectionDemoState.owned.includes('hat-cap')"))
            await peer.evaluate("VEKTOR_WARDROBE.buy('hat-headphones')")
            await peer.evaluate("VEKTOR_WARDROBE.equip('hat','hat-headphones')")
            await page.wait_for_function("document.querySelector('#wardrobe .vc-balance').textContent.includes('50') && document.querySelector('#main-bipych .bipych-hat').children.length>0")
            check("other-tab purchases and outfit sync", await page.evaluate("VEKTOR_WARDROBE.getState().stars === 50 && VEKTOR_WARDROBE.getState().equipped.hat === 'hat-headphones'"))
            check("failed save cannot spend stars", await page.evaluate("""async () => {
                const original=Storage.prototype.setItem;
                Storage.prototype.setItem=function(){throw new Error('blocked');};
                let failed=false;
                try {await VEKTOR_WARDROBE.buy('net-mint');}catch(_){failed=true;}
                finally{Storage.prototype.setItem=original;}
                const s=VEKTOR_WARDROBE.getState();
                return failed&&s.stars===50&&!s.owned.includes('net-mint');
            }"""))
            check("snapshot mutation cannot alter stored wallet", await page.evaluate("""() => {
                const s=VEKTOR_WARDROBE.getState();s.stars=0;s.owned.push('hat-crown');s.equipped.hat='hat-crown';
                const real=VEKTOR_WARDROBE.getState();
                return real.stars===50&&!real.owned.includes('hat-crown')&&real.equipped.hat==='hat-headphones';
            }"""))
            for width in [1440, 390]:
                await page.set_viewport_size({"width":width,"height":1000})
                for skin in ["notebook","orbit","pop","pixel"]:
                    await page.select_option("#skin", skin)
                    check(f"wardrobe {skin} {width}px no overflow", await page.evaluate("document.documentElement.scrollWidth<=innerWidth"))
                if os.environ.get("CODEX_SCREENSHOT_DIR"):
                    out=Path(os.environ["CODEX_SCREENSHOT_DIR"]);out.mkdir(parents=True,exist_ok=True)
                    await page.select_option("#skin","notebook")
                    await page.locator("#wardrobe-section").screenshot(path=str(out/f"wardrobe-{width}.png"),animations="disabled")
            # Two tabs compete for one wallet: no duplicate payment or overspend.
            race = await browser.new_context()
            a, b = await race.new_page(), await race.new_page()
            await asyncio.gather(a.goto(base+"/assets/drobik/demo.html"), b.goto(base+"/assets/drobik/demo.html"))
            await asyncio.gather(a.evaluate("VEKTOR_WARDROBE.buy('hat-cap')"), b.evaluate("VEKTOR_WARDROBE.buy('hat-cap')"))
            check("two-tab duplicate payment prevented", await a.evaluate("VEKTOR_WARDROBE.getState().stars===55"))
            outcomes = await asyncio.gather(
                a.evaluate("VEKTOR_WARDROBE.buy('hat-beanie').then(()=>true,()=>false)"),
                b.evaluate("VEKTOR_WARDROBE.buy('hat-beret').then(()=>true,()=>false)"))
            check("concurrent purchases cannot overspend", sum(outcomes) == 1 and await a.evaluate("VEKTOR_WARDROBE.getState().stars >= 0"))
            await a.evaluate("localStorage.setItem('vektor-bipych-wardrobe-v1','{broken')")
            await a.reload()
            check("corrupt wallet recovers", await a.evaluate("VEKTOR_WARDROBE.getState().stars===90"))
            check("no page errors", not errors)
            await browser.close()
    finally:
        server.shutdown();server.server_close()
    print(f"ИТОГО: {sum(RESULTS)} из {len(RESULTS)}")
    if not all(RESULTS):
        raise SystemExit(1)

if __name__ == "__main__":
    asyncio.run(main())

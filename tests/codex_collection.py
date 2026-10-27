"""Collection and workshop contract, callback, ownership and layout checks."""
import asyncio
import os
from pathlib import Path
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parent.parent
RESULTS = []


def check(name, ok):
    RESULTS.append(bool(ok))
    print(("OK   " if ok else "FAIL "), name, flush=True)


async def main():
    async with async_playwright() as p:
        opts = {"executable_path": os.environ["CODEX_BROWSER_EXECUTABLE"]} if os.environ.get("CODEX_BROWSER_EXECUTABLE") else {}
        browser = await p.chromium.launch(**opts)
        page = await browser.new_page(viewport={"width": 1440, "height": 1000})
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        await page.goto((ROOT / "assets/collection/demo.html").as_uri())
        check("5 collection cards and rank", await page.locator("#bugs .vc-bug-card").count() == 5 and await page.locator(".vc-rank").inner_text() == "Следопыт")
        await page.locator('[data-filter="beaten"]').click()
        check("status filter", await page.locator("#bugs .vc-bug-card").count() == 2)
        await page.locator(".vc-how summary").first.click()
        check("how I beat it expands", await page.locator(".vc-how[open]").count() == 1)
        await page.locator("#empty").click()
        check("empty collection", await page.locator(".vc-empty").count() == 1 and await page.locator(".vc-bug-card").count() == 0)
        await page.locator("#restore").click()
        await page.locator("#tab-shop").click()
        await page.locator('[data-slot="screen"]').click()
        check("three approved colors", await page.locator(".vc-shop-item").count() == 3)
        await page.locator('[data-slot="hat"]').click()
        check("thirteen hats", await page.locator(".vc-shop-item").count() == 13)
        await page.locator('[data-try="hat-cap"]').click()
        check("trying does not spend or equip", await page.evaluate("collectionDemoState.stars === 90 && !collectionDemoState.equipped.hat"))
        await page.locator('[data-buy="hat-cap"]').click()
        await page.wait_for_function("collectionDemoState.owned.includes('hat-cap') && collectionDemoCalls.length === 1")
        check("buy callback updates ownership and stars once", await page.evaluate("collectionDemoState.stars === 55 && collectionDemoState.owned.includes('hat-cap') && collectionDemoCalls.filter(x=>x[0]==='buy').length===1"))
        await page.locator('[data-slot="hat"]').click()
        await page.locator('[data-equip="hat-cap"]').click()
        await page.wait_for_function("collectionDemoState.equipped.hat === 'hat-cap'")
        check("equip callback uses correct slot", await page.evaluate("collectionDemoState.equipped.hat === 'hat-cap'"))
        await page.locator('[data-slot="hat"]').click()
        check("achievement hat cannot be bought", await page.locator('[data-item="hat-crown"] [data-buy]').count() == 0)
        check("insufficient stars disables purchase", await page.locator('[data-buy="hat-captain"]').is_disabled())
        check("equipped item disabled", await page.locator('[data-equip="hat-cap"]').is_disabled())
        await page.locator('[data-slot="antenna"]').click()
        check("nine pixel companions", await page.locator(".vc-shop-item").count() == 9)
        await page.locator('[data-slot="net"]').click()
        check("thirteen nets", await page.locator(".vc-shop-item").count() == 13)
        await page.locator('[data-slot="special"]').click()
        check("eight special items with descriptions and trophy labels", await page.locator('.vc-shop-item').count() == 8 and await page.locator('.vc-item-description').count() == 8 and await page.get_by_text('Трофей', exact=True).count() == 2)
        await page.locator('[data-try="pixel-ufo"]').click()
        await page.locator('[data-try="hat-wizard"]').click()
        await page.locator('[data-try="net-comet"]').click()
        check("special items combine and achievement trophies are preview-only", await page.locator('.vc-preview .bipych-ufo-beam').count() == 1 and await page.locator('.vc-preview .bipych-magic-star').count() == 1 and await page.locator('.vc-preview .bipych-stardust').count() == 1 and await page.locator('[data-item="net-comet"] [data-buy]').count() == 0)
        for width in [1440, 768, 390]:
            await page.set_viewport_size({"width": width, "height": 1000})
            for skin in ["notebook", "orbit", "pop", "pixel"]:
                await page.select_option("#skin", skin)
                for tab in ["bugs", "shop"]:
                    await page.locator("#tab-" + tab).click()
                    check(f"{tab} {skin} {width}px no overflow", await page.evaluate("document.documentElement.scrollWidth <= innerWidth"))
                check(f"tabs {skin} {width}px stay in page flow", await page.evaluate("getComputedStyle(document.querySelector('.cd-nav')).position === 'static'"))
            if os.environ.get("CODEX_SCREENSHOT_DIR"):
                out = Path(os.environ["CODEX_SCREENSHOT_DIR"]); out.mkdir(parents=True, exist_ok=True)
                await page.select_option("#skin", "notebook")
                for tab in ["bugs", "shop"]:
                    await page.locator("#tab-" + tab).click()
                    await page.screenshot(path=str(out / f"collection-{tab}-{width}.png"), full_page=True, animations="disabled")
        check("user content is text, invalid status/rank safe", await page.evaluate("""() => {
            const el=document.createElement('div');document.body.append(el);
            const text='<img src=x onerror="window.bad=true">';
            VEKTOR_COLLECTION.renderBugs(el,{bugs:[{key:text,kidName:text,title:text,status:'bad',howBeaten:text}],rank:'__proto__'});
            const ok=!el.querySelector('img')&&!window.bad&&el.textContent.includes(text)
                &&el.querySelector('[data-status=caught]')&&el.querySelector('.vc-rank').textContent==='Новичок';
            VEKTOR_COLLECTION.renderBugs(el,{bugs:[]});el.remove();return !!ok;
        }"""))
        check("rerender removes old mascot DOM", await page.evaluate("""() => {
            const el=document.createElement('div');document.body.append(el);
            for(let i=0;i<20;i++)VEKTOR_COLLECTION.renderWorkshop(el,{stars:0,owned:[],equipped:{}});
            const ok=el.querySelectorAll('.bipych').length===14;
            VEKTOR_COLLECTION.renderBugs(el,{bugs:[]});el.remove();return ok;
        }"""))
        check("absent callbacks do not offer active transactions", await page.evaluate("""() => {
            const el=document.createElement('div');document.body.append(el);
            VEKTOR_COLLECTION.renderWorkshop(el,{stars:100,owned:[],equipped:{}});
            const ok=[...el.querySelectorAll('[data-buy]')].every(b=>b.disabled);
            VEKTOR_COLLECTION.renderBugs(el,{bugs:[]});el.remove();return ok;
        }"""))
        check("no browser errors", not errors)
        await browser.close()
    print(f"ИТОГО: {sum(RESULTS)} из {len(RESULTS)}")
    if not all(RESULTS):
        raise SystemExit(1)


if __name__ == "__main__":
    asyncio.run(main())

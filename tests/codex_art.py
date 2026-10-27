"""SVG catalogue and responsive gallery checks. Run with Python Playwright."""
import asyncio
import os
from pathlib import Path
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parent.parent
KEYS = [
    "concept:flipped", "concept:took-eaten", "concept:unequal-parts",
    "reduce:not-fully-reduced", "reduce:only-one-part", "reduce:subtract-instead",
    "compare:bigger-denominator-bigger", "compare:compare-numerators-only",
    "add-same:add-denominators", "add-diff:add-denominators", "add-same:subtract-denominators",
    "add-diff:forgot-scale-numerators", "mixed:add-whole-to-numerator",
    "mixed:multiply-whole-numerator", "mult:cross-multiply", "mult:multiply-both",
    "div:multiply-instead-of-divide", "div:flip-first", "part-of:flip-fraction",
    "part-of:only-one-step", "part-of:part-instead-of-whole",
]
INTERESTS = ["football", "games", "animals", "space", "cooking", "music", "drawing", "cars", "dance", "robots", "nature", "sport"]
RESULTS = []


def check(name, ok):
    RESULTS.append(bool(ok))
    print(("OK   " if ok else "FAIL "), name, flush=True)


async def main():
    async with async_playwright() as p:
        opts = {}
        if os.environ.get("CODEX_BROWSER_EXECUTABLE"):
            opts["executable_path"] = os.environ["CODEX_BROWSER_EXECUTABLE"]
        browser = await p.chromium.launch(**opts)
        page = await browser.new_page(viewport={"width": 1440, "height": 1000})
        errors, remote = [], []
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
        page.on("request", lambda r: remote.append(r.url) if r.url.startswith(("http:", "https:")) else None)
        await page.goto((ROOT / "assets/bugs/demo.html").as_uri())
        check("21 cards / 63 bug-state drawings", await page.locator(".bug").count() == 21 and await page.locator(".bug svg").count() == 63)
        check("12 interests at 24 and 40 px", await page.locator(".interest").count() == 12 and await page.locator(".interest svg").count() == 24)
        check("63 catalogue SVGs valid and safe", await page.evaluate("""keys => {
            const parser = new DOMParser();
            for (const key of keys) for (const status of ['caught','healing','beaten']) {
                const text = VEKTOR_ART.bug(key,{status});
                const xml = parser.parseFromString(text,'image/svg+xml');
                if (xml.querySelector('parsererror,script,image,foreignObject') ||
                    /NaN|undefined/.test(text) || text.includes('Новый жучок')) return false;
            }
            return true;
        }""", KEYS))
        check("20 unique bug drawings with shared Adder", await page.evaluate("""keys => {
            const drawings = keys.map(key => VEKTOR_ART.bug(key).replace(/aria-label="[^"]*"/g,'')
                .replace(/<title>.*?<\\/title>/g,''));
            return new Set(drawings).size === 20 &&
                VEKTOR_ART.bug('add-same:add-denominators') === VEKTOR_ART.bug('add-diff:add-denominators');
        }""", KEYS))
        check("all three statuses visibly distinct", await page.evaluate("""keys => keys.every(key =>
            new Set(['caught','healing','beaten'].map(status => VEKTOR_ART.bug(key,{status})
                .replace(/aria-label="[^"]*"/g,'').replace(/<title>.*?<\\/title>/g,''))).size === 3)""", KEYS))
        check("12 distinct valid interest icons", await page.evaluate("""ids => {
            const parser = new DOMParser();
            const all = ids.map(id => VEKTOR_ART.interest(id,{size:24}));
            return new Set(all.map(s => s.replace(/aria-label="[^"]*"/g,'')
                .replace(/<title>.*?<\\/title>/g,''))).size === 12 &&
                all.every(s => !parser.parseFromString(s,'image/svg+xml').querySelector('parsererror'));
        }""", INTERESTS))
        check("unknown keys and prototype names use safe fallback", await page.evaluate("""() => {
            return ['missing','__proto__','toString','<img onerror=alert(1)>'].every(key =>
                VEKTOR_ART.bug(key).includes('Новый жучок') &&
                VEKTOR_ART.interest(key).includes('aria-label="Интерес"') &&
                !VEKTOR_ART.interest(key).includes('[native code]'));
        }"""))
        check("invalid status falls back and sizes are bounded", await page.evaluate("""() => {
            const parser = new DOMParser();
            const bad = VEKTOR_ART.bug('missing',{status:'bad',size:Infinity});
            return bad.includes('пойман') && parser.parseFromString(bad,'image/svg+xml').documentElement.getAttribute('width') === '64'
                && VEKTOR_ART.interest('games',{size:-20}).includes('width="16"');
        }"""))
        check("art source under 400 KB total allowance", (ROOT / "content/art.js").stat().st_size < 400 * 1024)
        for width in [1440, 390]:
            await page.set_viewport_size({"width": width, "height": 1000})
            check(str(width) + "px: no overflow", await page.evaluate("document.documentElement.scrollWidth <= innerWidth"))
            check(str(width) + "px: all icons fit their cards", await page.evaluate("""() =>
                [...document.querySelectorAll('.trio svg')].every(svg => {
                    const a = svg.getBoundingClientRect(), b = svg.closest('.bug').getBoundingClientRect();
                    return a.left >= b.left && a.right <= b.right;
                })"""))
            if os.environ.get("CODEX_SCREENSHOT_DIR"):
                dest = Path(os.environ["CODEX_SCREENSHOT_DIR"])
                dest.mkdir(parents=True, exist_ok=True)
                await page.screenshot(path=str(dest / f"bugs-{width}.png"), full_page=True)
                await page.locator(".interests").screenshot(path=str(dest / f"interests-{width}.png"))
        check("no external requests", not remote)
        check("no browser errors", not errors)
        await browser.close()
    print(f"ИТОГО: {sum(RESULTS)} из {len(RESULTS)}", flush=True)
    if not all(RESULTS):
        raise SystemExit(1)


if __name__ == "__main__":
    asyncio.run(main())

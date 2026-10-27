"""CX-11: cross-grade positioning, shared curriculum, pitch and projector mascot."""
import asyncio
import os
from pathlib import Path
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parent.parent
RESULTS = []
SHOTS = Path(os.environ["CODEX_SCREENSHOT_DIR"]) if os.environ.get("CODEX_SCREENSHOT_DIR") else None
TIMES = ["0:00–0:20", "0:20–1:00", "1:00–1:40", "1:40–2:05", "2:05–2:25", "2:25–2:45", "2:45–3:00"]
STATES = ["confused", "catching", "thinking", "confused", "thinking", "proud", "celebrate"]
SKINS = ["notebook", "orbit", "pop", "pixel"]


def check(name, ok):
    RESULTS.append(bool(ok))
    print(("OK   " if ok else "FAIL "), name, flush=True)


async def shot(page, name, full=False):
    if SHOTS:
        SHOTS.mkdir(parents=True, exist_ok=True)
        await page.screenshot(path=str(SHOTS / name), full_page=full, animations="disabled")


async def no_overflow(page):
    return await page.evaluate("document.documentElement.scrollWidth <= innerWidth")


async def main():
    async with async_playwright() as p:
        opts = {"executable_path": os.environ["CODEX_BROWSER_EXECUTABLE"]} if os.environ.get("CODEX_BROWSER_EXECUTABLE") else {}
        browser = await p.chromium.launch(**opts)
        page = await browser.new_page(viewport={"width": 1440, "height": 1000})
        errors, remote = [], []
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.on("request", lambda r: remote.append(r.url) if r.url.startswith(("https:", "http:")) else None)

        await page.goto((ROOT / "landing/index.html").as_uri())
        check("hero shows errors and rules from grades 5, 7 and 8", await page.locator(".hero [data-example-grade]").evaluate_all("""els =>
            els.map(e=>e.dataset.exampleGrade).join(',')==='5,7,8' && els.every(e=>e.querySelector('.rule').textContent.trim())"""))
        check("hero starts with the general problem", "дроб" not in (await page.locator(".hero").inner_text()).lower())
        check("adult landing uses no bug terminology or removed teaching feature", await page.evaluate("""() =>
            !/жуч|научи бипыча|исправить напарника/i.test(document.body.innerText)"""))
        check("pilot metrics remain placeholders", await page.locator(".metrics strong").all_inner_texts() == ["Скоро"] * 3)
        check("shared curriculum loaded", await page.locator('script[src="../content/program.js"]').count() == 1 and await page.locator("[data-grade]").count() == 5)
        for grade in [5, 6, 7, 8, 9]:
            await page.locator(f'[data-grade="{grade}"]').click()
            check(f"grade {grade} topics, readiness and counterexamples match shared data", await page.evaluate("""n => {
                const source=VEKTOR_PROGRAM.grade(n), panel=document.querySelector('[data-grade-panel="'+n+'"]');
                const articles=[...panel.querySelectorAll('.program-strand')];
                return !panel.hidden && document.querySelectorAll('.grade-panel:not([hidden])').length===1
                    && articles.length===source.strands.length
                    && articles.every((el,i)=>{
                        const strand=source.strands[i],rows=[...el.querySelectorAll('.topic-list li')];
                        return el.querySelector('h4').textContent===strand.name
                            && rows.length===strand.topics.length
                            && rows.every((row,j)=>{
                                const t=strand.topics[j],ready=Array.isArray(t.ready)&&t.ready.length>0;
                                return row.querySelector('.topic-title').textContent===t.title
                                    && row.querySelector('.readiness').textContent===(ready?'работает сейчас':VEKTOR_PROGRAM.WAVES[t.wave]||'по плану');
                            }) && (!strand.bug || (el.querySelector('.wrong-rule').textContent===strand.bug.rule
                                && el.querySelector('.program-counter p').textContent===strand.bug.counter));
                    });
            }""", grade))
        check("curriculum is rendered from current source rather than copied topics", await page.evaluate("""() => {
            const topic={title:'Контрольная тема из данных',wave:2};
            const strand=VEKTOR_PROGRAM.GRADES[2].strands[0], label=VEKTOR_PROGRAM.WAVES[2];
            strand.topics.push(topic);VEKTOR_PROGRAM.WAVES[2]='контрольная волна';
            VEKTOR_PUBLIC_PROGRAM.render(document.querySelector('#program-view'));
            const rows=[...document.querySelectorAll('[data-grade-panel="7"] .topic-list li')];
            const row=rows.find(r=>r.querySelector('.topic-title').textContent===topic.title);
            const ok=!!row&&row.querySelector('.readiness').textContent==='контрольная волна';
            strand.topics.pop();VEKTOR_PROGRAM.WAVES[2]=label;
            VEKTOR_PUBLIC_PROGRAM.render(document.querySelector('#program-view'));
            return ok;
        }"""))
        check("future grades do not imply ready lessons", await page.evaluate("""() =>
            [...document.querySelectorAll('[data-grade-panel="7"] .readiness,[data-grade-panel="8"] .readiness,[data-grade-panel="9"] .readiness')].every(e=>e.dataset.ready==='false')"""))
        check("four roadmap waves use shared schedule labels", await page.evaluate("""() => {
            const waves=[...document.querySelectorAll('#roadmap [data-wave-plan] .wave-item')];
            return waves.length===4 && waves.every((e,i)=>e.dataset.wavePlan===String(i)
                && e.querySelector('h3').textContent===(i===0?'Сейчас':VEKTOR_PROGRAM.WAVES[i]));
        }"""))
        check("foundation scenario is explicitly planned and returns to OGE", await page.evaluate("""() => {
            const el=document.querySelector('#foundation');
            return /по плану/.test(el.textContent)&&el.querySelectorAll('.skill-trace li').length===4
                &&/исходную задачу ОГЭ/.test(el.textContent);
        }"""))
        check("Pulse demo has six pupils, three answers and two correct", await page.evaluate("""() => {
            const el=document.querySelector('#schools .pulse'),bar=el.querySelector('[role=progressbar]');
            return /Демонстрационный пример/.test(el.textContent)
                &&el.querySelectorAll('.pulse-chips span').length===6&&el.querySelectorAll('.ok').length===2
                &&el.querySelectorAll('.bad').length===1&&el.querySelectorAll('.wait').length===3
                &&bar.getAttribute('aria-valuenow')==='3'&&bar.getAttribute('aria-valuemax')==='6'
                &&bar.getAttribute('aria-valuetext')==='Ответили 3 из 6, верно 2';
        }"""))
        for width in [1440, 768, 390]:
            await page.set_viewport_size({"width": width, "height": 1000})
            for skin in SKINS:
                await page.evaluate("skin=>document.documentElement.dataset.skin=skin", skin)
                check(f"landing {skin} {width}px no overflow", await no_overflow(page))
            await page.evaluate("document.documentElement.dataset.skin='notebook'")
            await page.locator("#example-toggle").click()
            check(f"counterexample expands accessibly at {width}px", await page.locator("#example-answer").is_visible() and await page.locator("#example-toggle").get_attribute("aria-expanded") == "true")
            await page.locator("#example-toggle").click()
            check(f"counterexample collapses accessibly at {width}px", await page.locator("#example-answer").is_hidden() and await page.locator("#example-toggle").get_attribute("aria-expanded") == "false")
            await page.locator('[data-grade="5"]').click()
            await shot(page, f"landing-{width}.png", full=True)

        await page.emulate_media(reduced_motion="reduce")
        check("reduced motion disables the landing scan and mascot motion", await page.evaluate("""() =>
            getComputedStyle(document.querySelector('.hero-example'),'::before').display==='none'
            &&document.querySelector('.bipych').getAnimations({subtree:true}).every(a=>a.playState!=='running')"""))
        await page.emulate_media(reduced_motion="no-preference")

        for width, height in [(1280, 720), (1920, 1080)]:
            await page.set_viewport_size({"width": width, "height": height})
            await page.goto((ROOT / "landing/pitch.html").as_uri())
            check(f"7 scenes with requested times at {width}px", await page.locator(".slide").count() == 7 and await page.locator(".slide").evaluate_all("els=>els.map(e=>e.dataset.time)") == TIMES)
            check("pitch omits the removed teaching feature", not any("Научи Бипыча" in s for s in await page.locator(".slide").all_text_contents()))
            check("pitch program and waves use shared curriculum", await page.evaluate("""() =>
                document.querySelectorAll('.slide [data-wave-plan] .wave-item').length===Object.keys(VEKTOR_PROGRAM.WAVES).length+1
                &&VEKTOR_PROGRAM.GRADES.every(g=>document.querySelector('[data-program-summary]').textContent.includes(String(g.n)))"""))
            for i in range(7):
                check(f"pitch {i+1} fits {width}x{height} without clipped content", await page.evaluate("""() => {
                    const slide=document.querySelector('.slide:not([hidden])');
                    const top=document.querySelector('.pitch-header').getBoundingClientRect().bottom;
                    const bottom=document.querySelector('.pitch-footer').getBoundingClientRect().top;
                    return document.documentElement.scrollHeight<=innerHeight&&document.documentElement.scrollWidth<=innerWidth
                        &&[...slide.children].every(e=>e.getBoundingClientRect().top>=top&&e.getBoundingClientRect().bottom<=bottom);
                }"""))
                check(f"pitch {i+1} has correct timing and mascot state at {width}px", await page.locator("#timing").inner_text() == TIMES[i] and await page.locator("#pitch-pet .bipych").get_attribute("data-state") == STATES[i] and await page.locator(".slide:visible").count() == 1)
                await shot(page, f"pitch-{i+1}-{width}.png")
                if i < 6:
                    await page.locator("#next").click()
            check(f"last slide stops at {width}px", await page.locator("#next").is_disabled())
            await page.locator("body").click(position={"x": 5, "y": 5})
            await page.keyboard.press("ArrowLeft")
            check(f"keyboard returns to scene six at {width}px", await page.locator("#position").inner_text() == "6 / 7")

        await page.set_viewport_size({"width": 390, "height": 844})
        await page.goto((ROOT / "landing/pitch.html").as_uri())
        for i in range(7):
            check(f"pitch mobile scene {i+1} no overflow", await no_overflow(page))
            if i < 6:
                await page.locator("#next").click()
        await page.set_viewport_size({"width":1280,"height":720})
        await page.goto((ROOT / "assets/board/demo.html").as_uri())
        await page.locator("#open").click()
        check("board shows no charge or visible 0/5", await page.locator("#pet .bipych-charge").is_hidden() and "0/5" not in await page.locator("body").inner_text())
        await page.locator("#next").click()
        check("board charge stays hidden through slide changes", await page.locator("#pet .bipych-charge").is_hidden())
        check("optional charge hiding preserves default mascot behavior", await page.evaluate("""() => {
            const host=document.createElement('div');document.body.append(host);
            const regular=VEKTOR_DROBIK.mount(host,{size:96});
            const a=host.querySelector('.bipych-charge');
            const shown=!a.hidden&&getComputedStyle(a).display!=='none'&&a.textContent==='0/5';
            regular.destroy();
            const hidden=VEKTOR_DROBIK.mount(host,{size:96,hideCharge:true});
            hidden.setCharge(2,5);hidden.setState('proud');
            const b=host.querySelector('.bipych-charge');
            const ok=b.hidden&&getComputedStyle(b).display==='none'&&b.getAttribute('aria-valuenow')==='2';
            hidden.destroy();host.remove();return shown&&ok;
        }"""))
        await shot(page, "board-hide-charge.png")
        check("no external resources", not remote)
        check("no JS errors", not errors)
        await browser.close()
    print(f"ИТОГО: {sum(RESULTS)} из {len(RESULTS)}")
    if not all(RESULTS):
        raise SystemExit(1)


if __name__ == "__main__":
    asyncio.run(main())

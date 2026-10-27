"""Bipych contract and browser checks. No application/build dependencies.

Run: python tests/codex_visual.py
Optional: CODEX_BROWSER_EXECUTABLE=/path/to/chrome
Optional: CODEX_SCREENSHOT_DIR=/path/to/screenshots (outside the checkout).
CI already installs Python Playwright and Chromium for the existing e2e suite.
"""
import asyncio
import json
import os
import re
import subprocess
import sys
from pathlib import Path

from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parent.parent
URL = (ROOT / "assets/drobik/demo.html").as_uri()
SHOTS = Path(os.environ["CODEX_SCREENSHOT_DIR"]) if os.environ.get("CODEX_SCREENSHOT_DIR") else None
STATES = ["idle", "happy", "thinking", "confused", "proud", "shy", "catching", "celebrate", "sleep"]
COLORS = ["screen-raspberry", "screen-turquoise", "screen-black"]
RESULTS = []


def check(name, passed, detail=""):
    RESULTS.append((name, bool(passed)))
    print(("OK   " if passed else "FAIL "), name, detail, flush=True)


async def main():
    if SHOTS:
        SHOTS.mkdir(parents=True, exist_ok=True)
    async with async_playwright() as p:
        kwargs = {}
        if os.environ.get("CODEX_BROWSER_EXECUTABLE"):
            kwargs["executable_path"] = os.environ["CODEX_BROWSER_EXECUTABLE"]
        browser = await p.chromium.launch(**kwargs)
        context = await browser.new_context(viewport={"width": 1440, "height": 1000})
        page = await context.new_page()
        errors, remote = [], []
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.on("console", lambda msg: errors.append(msg.text) if msg.type == "error" else None)
        page.on("request", lambda req: remote.append(req.url) if req.url.startswith(("https:", "http:")) else None)
        await page.goto(URL)
        await page.wait_for_function("window.VEKTOR_DROBIK && window.demoBipych")
        check("9 states and 38 unique cosmetics", await page.evaluate("""() => {
            const d = VEKTOR_DROBIK;
            return JSON.stringify(d.STATES) === JSON.stringify(%s)
              && d.COSMETICS.length === 38 && new Set(d.COSMETICS.map(c => c.id)).size === 38
              && d.COSMETICS.every(c => ['screen','antenna','hat','net'].includes(c.slot)
                 && typeof c.price === 'number' && (c.unlock === null || typeof c.unlock === 'string'));
        }""" % json.dumps(STATES)))
        check("27 state/color previews", await page.locator("#matrix .bipych").count() == 27)
        sizes = await page.evaluate("""() => [...document.querySelectorAll('#matrix svg')].map(s => new TextEncoder().encode(s.outerHTML).length)""")
        check("each SVG under 15 KB", max(sizes) < 15 * 1024, str(max(sizes)) + " bytes")
        weight = sum(f.stat().st_size for f in [
            ROOT / "content/drobik.js", ROOT / "styles/drobik.css"
        ])
        check("production mascot under 400 KB", weight < 400 * 1024, str(weight) + " bytes")
        check("black preserves original satellite-free look", await page.locator('[data-hero="screen-black"] .bipych-satellite[hidden]').count() == 1)

        # Test the public API independently of the demo and preserve existing host DOM.
        await page.evaluate("""() => {
            const host = document.createElement('div'); host.id = 'contract-host';
            const keep = document.createElement('span'); keep.id='keep-me'; host.append(keep);
            document.body.append(host);
            window.contractPet = VEKTOR_DROBIK.mount(host, {size: 144});
        }""")
        for state in STATES:
            await page.evaluate("state => contractPet.setState(state)", state)
            check("state " + state, await page.locator("#contract-host .bipych").get_attribute("data-state") == state)
        check("invalid state falls back to idle", await page.evaluate("""() => {
            contractPet.setState('<script>'); return document.querySelector('#contract-host .bipych').dataset.state === 'idle';
        }"""))
        check("sleep has three staggered rising and fading Z glyphs on all colors", await page.evaluate("""() => {
            for(const screen of ['screen-turquoise','screen-raspberry','screen-black']){
                contractPet.setCosmetics({screen});contractPet.setState('sleep');
                const root=document.querySelector('#contract-host .bipych');
                const zs=[...root.querySelectorAll('.bipych-sleep-z')];
                if(zs.length!==3 || root.querySelector('.bipych-actor .bipych-zzz')
                    || new Set(zs.map(z=>getComputedStyle(z).animationDelay)).size!==3)return false;
                const anim=zs[0].getAnimations()[0];anim.pause();
                const sample=t=>{anim.currentTime=t;const s=getComputedStyle(zs[0]);return {y:new DOMMatrix(s.transform).m42,o:Number(s.opacity)};};
                const a=sample(0),b=sample(1000),c=sample(3500);
                if(!(c.y<a.y && a.o===0 && b.o>.5 && c.o<.4))return false;
                contractPet.setState('idle');
                if(getComputedStyle(root.querySelector('.bipych-zzz')).display!=='none')return false;
            }return true;
        }"""))
        check("special cosmetics have distinct pixel shapes and local effects", await page.evaluate("""() => {
            const specials=VEKTOR_DROBIK.COSMETICS.filter(c=>c.description);
            const shapes=new Set();let effects=0;
            for(const item of specials){
                contractPet.setCosmetics({screen:'screen-black',[item.slot]:item.id});contractPet.setState('idle');
                const root=document.querySelector('#contract-host');
                if(item.slot==='net')shapes.add(root.querySelector('.bipych-net-rim').getAttribute('d'));
                const effect=root.querySelector('.bipych-magic-star,.bipych-firefly,.bipych-equalizer,.bipych-orbit-mote,.bipych-stardust,.bipych-comet-tail,.bipych-ufo-beam');
                if(effect)effects++;
                if([...root.querySelectorAll('.bipych-hat path,.bipych-net path,.bipych-satellite path')].some(p=>/[CLQAST]/i.test(p.getAttribute('d'))))return false;
            }
            return specials.length===8 && effects===7 && shapes.size===3;
        }"""))
        check("thinking moves body, gaze and paw even without satellite", await page.evaluate("""() => {
            contractPet.setCosmetics({screen:'screen-black'}); contractPet.setState('thinking');
            const root=document.querySelector('#contract-host .bipych');
            const parts=['.bipych-actor','.bipych-eyes-normal','.bipych-hand-left'];
            const animations=root.getAnimations({subtree:true});
            animations.forEach(a=>{a.pause();a.currentTime=0;});
            const before=parts.map(s=>getComputedStyle(root.querySelector(s)).transform);
            animations.forEach(a=>a.currentTime=1600);
            const after=parts.map(s=>getComputedStyle(root.querySelector(s)).transform);
            return before.every((v,i)=>v!==after[i])
                && getComputedStyle(root.querySelector('.bipych-thought')).display!=='none'
                && root.querySelectorAll('.bipych-thought-dot').length===3;
        }"""))
        check("thinking paw remains visibly in front of the cheek", await page.evaluate("""() => {
            const root=document.querySelector('#contract-host .bipych');
            root.scrollIntoView({block:'center'});
            const hand=root.querySelector('.bipych-hand-left'),rect=hand.querySelector('rect');
            const point=new DOMPoint(+rect.getAttribute('x')+6,+rect.getAttribute('y')+8).matrixTransform(rect.getScreenCTM());
            return hand.contains(document.elementFromPoint(point.x,point.y));
        }"""))
        check("proud has fist gesture and pixel glints distinct from confetti", await page.evaluate("""() => {
            contractPet.setState('proud');
            const root=document.querySelector('#contract-host .bipych');
            const animations=root.getAnimations({subtree:true});
            const parts=['.bipych-actor','.bipych-hand-left'];
            animations.forEach(a=>{a.pause();a.currentTime=0;});
            const before=parts.map(s=>getComputedStyle(root.querySelector(s)).transform);
            const dim=getComputedStyle(root.querySelector('.bipych-pride-star')).opacity;
            animations.forEach(a=>a.currentTime=1000);
            return parts.every((s,i)=>before[i]!==getComputedStyle(root.querySelector(s)).transform)
                && dim!==getComputedStyle(root.querySelector('.bipych-pride-star')).opacity
                && getComputedStyle(root.querySelector('.bipych-confetti')).display==='none';
        }"""))
        check("shy index fingers touch twice and separate on all three colors", await page.evaluate("""() => {
            for(const screen of ['screen-raspberry','screen-turquoise','screen-black']){
                contractPet.setCosmetics({screen});contractPet.setState('shy');
                const root=document.querySelector('#contract-host .bipych');
                const left=root.querySelector('.bipych-shy-hand-left .bipych-shy-palm');
                const right=root.querySelector('.bipych-shy-hand-right .bipych-shy-palm');
                const animations=root.getAnimations({subtree:true});animations.forEach(a=>a.pause());
                const gap=time=>{
                    animations.forEach(a=>a.currentTime=time);
                    const l=new DOMPoint(64,87).matrixTransform(left.getScreenCTM());
                    const r=new DOMPoint(64,87).matrixTransform(right.getScreenCTM());
                    return Math.hypot(l.x-r.x,l.y-r.y);
                };
                if(!(gap(0)>5 && gap(1000)<.2 && gap(1600)>4 && gap(2200)<.2)
                    || getComputedStyle(root.querySelector('.bipych-hand-left')).visibility!=='hidden'
                    || getComputedStyle(root.querySelector('.bipych-blush')).display==='none')return false;
            }
            return true;
        }"""))
        check("shy frees both paws while keeping the owned net beside him", await page.evaluate("""() => {
            contractPet.setCosmetics({net:'net-classic'});contractPet.setState('shy');
            const root=document.querySelector('#contract-host .bipych'),net=root.querySelector('.bipych-net');
            const visible=getComputedStyle(net).visibility==='visible' && getComputedStyle(net).display!=='none'
                && getComputedStyle(root.querySelector('.bipych-shy-hands')).display!=='none';
            contractPet.setState('idle');
            return visible && getComputedStyle(net).transform==='none'
                && getComputedStyle(root.querySelector('.bipych-shy-hands')).display==='none'
                && getComputedStyle(root.querySelector('.bipych-hand-right')).visibility==='visible';
        }"""))
        check("reworked headwear uses only orthogonal pixel edges", await page.evaluate("""() => {
            for(const hat of ['hat-bucket','hat-graduate','hat-captain','hat-leaf']){
                contractPet.setCosmetics({hat});contractPet.setState('idle');
                const paths=[...document.querySelectorAll('#contract-host .bipych-hat path')];
                if(!paths.length || paths.some(p=>/[LCQAST]/i.test(p.getAttribute('d'))))return false;
            }
            contractPet.setCosmetics({hat:'hat-captain'});
            const paths=document.querySelectorAll('#contract-host .bipych-hat path');
            const outer=paths[0].getBBox(),inner=paths[1].getBBox();
            return outer.x<inner.x && outer.y<inner.y && outer.width>inner.width
                && paths[0].getAttribute('fill')!==paths[1].getAttribute('fill');
        }"""))
        check("charge goals 3–10 and exact filled cells", await page.evaluate("""() => {
            for (let goal = 3; goal <= 10; goal++) {
                for (let done = 0; done <= goal; done++) {
                    contractPet.setCharge(done, goal);
                    const host = document.querySelector('#contract-host');
                    const bar = host.querySelector('[role=progressbar]');
                    if (+bar.getAttribute('aria-valuemax') !== goal
                     || +bar.getAttribute('aria-valuenow') !== done
                     || host.querySelectorAll('[data-filled=true]').length !== done) return false;
                }
            }
            return true;
        }"""))
        check("full charge celebrates", await page.evaluate("""() => {
            contractPet.setCharge(1,5); contractPet.setState('idle'); contractPet.setCharge(5,5);
            return document.querySelector('#contract-host .bipych').dataset.state === 'celebrate';
        }"""))
        check("invalid charge is clamped", await page.evaluate("""() => {
            contractPet.setCharge(Infinity, 100); let bar = document.querySelector('#contract-host [role=progressbar]');
            if (bar.getAttribute('aria-valuenow') !== '0' || bar.getAttribute('aria-valuemax') !== '10') return false;
            contractPet.setCharge(-20, -1);
            return bar.getAttribute('aria-valuenow') === '0' && bar.getAttribute('aria-valuemax') === '3';
        }"""))
        check("speech text cannot inject HTML", await page.evaluate("""() => {
            const text = '<img src=x onerror="window.pwned=true">';
            contractPet.say(text);
            return document.querySelector('#contract-host .bipych-bubble').textContent === text
                && !document.querySelector('#contract-host img') && !window.pwned;
        }"""))
        check("unknown cosmetics and wrong slots ignored", await page.evaluate("""() => {
            contractPet.setCosmetics({screen:'hat-cap',hat:'__proto__',net:'bad'});
            return document.querySelector('#contract-host .bipych').dataset.color === 'turquoise'
                && !document.querySelector('#contract-host .bipych-net[data-equipped]');
        }"""))
        await page.evaluate("""() => { contractPet.say(''); contractPet.setCharge(2,5); contractPet.setState('idle'); }""")
        # Every cosmetic combination must produce valid nonempty local SVG.
        # All individual accessories, all pairs, and every 9-state combination are exercised
        # efficiently inside the browser rather than taking thousands of screenshots.
        check("52920 cosmetic/state combinations render without NaN or unsafe markup", await page.evaluate("""() => {
            const items = VEKTOR_DROBIK.COSMETICS;
            const slot = s => items.filter(c => c.slot === s).map(c => c.id);
            const xml = new DOMParser();
            let total = 0;
            for (const screen of slot('screen'))
            for (const antenna of ['', ...slot('antenna')])
            for (const hat of ['', ...slot('hat')])
            for (const net of ['', ...slot('net')]) {
                contractPet.setCosmetics({screen, antenna, hat, net});
                const svg = document.querySelector('#contract-host svg');
                if (!svg || svg.querySelector('script,image,foreignObject')
                    || /NaN|undefined/.test(svg.outerHTML)
                    || xml.parseFromString(svg.outerHTML, 'image/svg+xml').querySelector('parsererror')) return false;
                for (const state of VEKTOR_DROBIK.STATES) {
                    contractPet.setState(state);
                    if (!document.querySelector('#contract-host .bipych-eyes')) return false;
                    total++;
                }
            }
            window.cosmeticCombinationCount = total;
            return total === 52920;
        }"""))
        check("all shop net previews match the equipped net geometry", await page.evaluate("""() => {
            if(!window.VEKTOR_COLLECTION)return true;
            const host=document.createElement('div');document.body.append(host);
            VEKTOR_COLLECTION.renderWorkshop(host,{
                stars:100,owned:VEKTOR_DROBIK.COSMETICS.map(c=>c.id),equipped:{screen:'screen-black'}
            });
            host.querySelector('[data-slot=net]').click();
            let ok=true;
            for(const c of VEKTOR_DROBIK.COSMETICS.filter(c=>c.slot==='net')){
                contractPet.setCosmetics({screen:'screen-black',net:c.id});
                const card=[...host.querySelectorAll('[data-item]')].find(el=>el.dataset.item===c.id);
                if(!card || card.querySelector('.bipych-net').innerHTML!==document.querySelector('#contract-host .bipych-net').innerHTML){ok=false;break;}
            }
            VEKTOR_COLLECTION.renderBugs(host,{bugs:[]});host.remove();return ok;
        }"""))
        # Destroy cancels the celebration timer and is safe to call twice.
        check("destroy preserves sibling DOM and methods become inert", await page.evaluate("""() => {
            contractPet.setCharge(0,5); contractPet.setCharge(5,5);
            contractPet.destroy(); contractPet.destroy(); contractPet.say('ignored');
            contractPet.setState('happy'); contractPet.setCharge(3,5); contractPet.setCosmetics({});
            const ok = !document.querySelector('#contract-host .bipych') && !!document.querySelector('#keep-me');
            document.querySelector('#contract-host').remove(); return ok;
        }"""))
        # Check real UI controls and both age modes.
        await page.locator("#quick-dress summary").click()
        await page.select_option("#hat", "hat-cap")
        await page.select_option("#antenna", "pixel-double")
        await page.select_option("#net", "net-gold")
        await page.locator('[data-state-button="catching"]').click()
        check("demo accessories actually mount", await page.locator("#main-bipych .bipych-net[data-equipped=true]").count() == 1)
        check("net rim, mesh, handle and grip share one axis", await page.evaluate("""() => {
            const root=document.querySelector('#main-bipych');
            const box=cls=>root.querySelector(cls).getBBox();
            const rim=box('.bipych-net-rim'),mesh=box('.bipych-net-mesh');
            const handle=box('.bipych-net-handle'),grip=box('.bipych-grip');
            const centers=[rim,mesh,handle,grip].map(b=>b.x+b.width/2);
            return centers.every(x=>x===116) && rim.height>=rim.width
                && mesh.y+mesh.height/2===rim.y+rim.height/2
                && root.querySelector('.bipych-net-rim').getAttribute('fill-rule')==='evenodd'
                && !root.querySelector('.bipych-net rect:not(.bipych-net-handle)')
                && root.querySelector('.bipych-net').parentElement.classList.contains('bipych-hand-right')
                && !!(root.querySelector('.bipych-hat').compareDocumentPosition(root.querySelector('.bipych-net')) & Node.DOCUMENT_POSITION_FOLLOWING);
        }"""))
        await page.check("#senior")
        check("senior age mode", await page.locator("#main-bipych .bipych").get_attribute("data-age") == "senior")
        await page.uncheck("#senior")
        await page.locator("#reset").click()
        await page.locator('[data-state-button="idle"]').click()
        for width in [1440, 390]:
            await page.set_viewport_size({"width": width, "height": 900})
            for skin in ["notebook", "orbit", "pop", "pixel"]:
                await page.select_option("#skin", skin)
                await page.evaluate("scrollTo(0,0)")
                check(f"{skin} {width}px: no horizontal overflow", await page.evaluate("document.documentElement.scrollWidth <= innerWidth"))
                check(f"{skin} {width}px: header and main layout", await page.evaluate("""() => {
                    const header = document.querySelector('.demo-header').getBoundingClientRect();
                    const intro = document.querySelector('.demo-intro').getBoundingClientRect();
                    const main = document.querySelector('.demo-main').getBoundingClientRect();
                    return header.bottom <= intro.top + 1 && Math.abs(header.left - main.left) < 1
                       && getComputedStyle(document.querySelector('.demo-header')).position === 'static';
                }"""))
                if SHOTS:
                    await page.screenshot(path=str(SHOTS / f"bipych-{skin}-{width}.png"), full_page=True, animations="disabled")
        await page.emulate_media(reduced_motion="reduce")
        check("reduced motion disables all mascot animations", await page.evaluate("""() => {
            return [...document.querySelectorAll('.bipych')].every(root =>
                root.getAnimations({subtree:true}).every(a => a.playState !== 'running'));
        }"""))
        check("reduced motion stops automatic state cycling", await page.locator("#cycle").is_disabled())
        # Speech API may be absent: text must still work.
        check("text works when speech is unavailable", await page.evaluate("""() => {
            const h = document.createElement('div'); document.body.append(h);
            const pet = VEKTOR_DROBIK.mount(h);
            const descriptor = Object.getOwnPropertyDescriptor(window, 'speechSynthesis');
            Object.defineProperty(window, 'speechSynthesis', {configurable:true,value:undefined});
            pet.say('Бип!', {voice:true});
            const ok = h.querySelector('.bipych-bubble').textContent === 'Бип!';
            if (descriptor) Object.defineProperty(window,'speechSynthesis',descriptor);
            else delete window.speechSynthesis;
            pet.destroy(); h.remove(); return ok;
        }"""))
        check("no external requests", not remote, str(remote[:2]))
        check("no browser errors", not errors, "; ".join(errors[:3]))
        await browser.close()
    passed = sum(ok for _, ok in RESULTS)
    print(f"\nИТОГО: {passed} из {len(RESULTS)}", flush=True)
    if passed != len(RESULTS):
        raise SystemExit(1)


if __name__ == "__main__":
    asyncio.run(main())
    total = len(RESULTS)
    environment = dict(os.environ, PYTHONIOENCODING="utf-8")
    # Isolated feature branches may contain only the mascot suite.
    for name in ["codex_art.py", "codex_collection.py", "codex_wardrobe.py", "codex_board.py", "codex_landing.py", "codex_print.py"]:
        path = ROOT / "tests" / name
        if not path.exists():
            continue
        result = subprocess.run([sys.executable, str(path)], cwd=ROOT, env=environment,
                                capture_output=True, text=True, encoding="utf-8", timeout=180)
        match = re.search(r"ИТОГО:\s*(\d+)\s*из\s*(\d+)", result.stdout)
        if result.returncode or not match or match[1] != match[2]:
            print(result.stdout, result.stderr, flush=True)
            raise SystemExit(result.returncode or 1)
        total += int(match[1])
        print(name + ": " + match.group(0), flush=True)
    print(f"ВСЕГО: {total} из {total}", flush=True)

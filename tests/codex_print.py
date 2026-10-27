import asyncio
import io
import os
from pathlib import Path
from pypdf import PdfReader
from playwright.async_api import async_playwright

ROOT=Path(__file__).resolve().parent.parent
RESULTS=[]
def check(name,ok):
    RESULTS.append(bool(ok));print(("OK   " if ok else "FAIL "),name,flush=True)

async def main():
    async with async_playwright() as p:
        opts={"executable_path":os.environ["CODEX_BROWSER_EXECUTABLE"]} if os.environ.get("CODEX_BROWSER_EXECUTABLE") else {}
        b=await p.chromium.launch(**opts);page=await b.new_page()
        errors=[];page.on("pageerror",lambda e:errors.append(str(e)))
        for name,count,selector in [('stickers',24,'.sticker'),('slip',8,'.slip')]:
            await page.goto((ROOT/f"print/{name}.html").as_uri())
            check(name+" card count",await page.locator(selector).count()==count)
            await page.emulate_media(media="print",reduced_motion="reduce")
            data=await page.pdf(format="A4",prefer_css_page_size=True,print_background=True,display_header_footer=False)
            pdf=PdfReader(io.BytesIO(data))
            check(name+" prints on one A4 page",len(pdf.pages)==1)
            box=pdf.pages[0].mediabox
            check(name+" A4 dimensions",abs(float(box.width)-595.28)<1 and abs(float(box.height)-841.89)<1)
            if os.environ.get("CODEX_SCREENSHOT_DIR"):
                out=Path(os.environ["CODEX_SCREENSHOT_DIR"]);out.mkdir(parents=True,exist_ok=True)
                (out/f"{name}.pdf").write_bytes(data)
            if name=="slip":
                text=pdf.pages[0].extract_text()
                check("all four placeholders preserved",all(x in text for x in ['{login}','{password}','{class}','{url}']))
                await page.evaluate("""() => VEKTOR_PRINT.fill([{login:'<img onerror=alert(1)>',password:'demo-42',class:'5Б',url:'https://school.example/vektor'}])""")
                check("filling is text and does not inject HTML",await page.locator(".slip").count()==1 and await page.locator(".slip img").count()==0)
                check("filled fields",await page.locator('[data-field=password]').inner_text()=="demo-42")
        check("no JS errors",not errors)
        await b.close()
    print(f"ИТОГО: {sum(RESULTS)} из {len(RESULTS)}")
    if not all(RESULTS):raise SystemExit(1)
if __name__=="__main__":asyncio.run(main())

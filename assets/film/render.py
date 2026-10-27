"""Render the local, editable film to silent H.264 MP4 using Chrome and FFmpeg.

Requires Python Playwright and Pillow. No production dependencies are added.
Set CODEX_BROWSER_EXECUTABLE and FFMPEG_EXECUTABLE, or supply --ffmpeg.
"""
import argparse
import asyncio
import functools
import json
import os
import subprocess
import threading
import time
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from PIL import Image, ImageDraw
from playwright.async_api import async_playwright

ROOT=Path(__file__).resolve().parents[2]
class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self,*_): pass

async def render(args):
    out=Path(args.output).resolve();out.mkdir(parents=True,exist_ok=True)
    server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(QuietHandler,directory=str(ROOT)))
    threading.Thread(target=server.serve_forever,daemon=True).start()
    metadata=[];errors=[]
    try:
        async with async_playwright() as p:
            browser=await p.chromium.launch(executable_path=os.environ.get('CODEX_BROWSER_EXECUTABLE'))
            context=await browser.new_context(viewport={'width':1280,'height':720},device_scale_factor=1.5)
            page=await context.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
            film_page='live.html' if args.live else 'index.html'
            ready='liveFilmReady' if args.live else 'filmReady'
            seek='liveFilmSeek' if args.live else 'filmSeek'
            await page.goto(f'http://127.0.0.1:{server.server_port}/assets/film/{film_page}?capture=1')
            await page.evaluate(ready)
            print('Film ready',flush=True)
            moments=[1.5,4.5,6.3,9.5,11,13,14.7,17.2,18.4,20.4,23.4,27.2,31.3,34.4] if args.live else [2,5.2,7.1,8.7,12.5,15.5,19.3,21.8,24.8,27,29,31.2,34.4]
            sheet=Image.new('RGB',(1280,1800),'#F8F7EE');draw=ImageDraw.Draw(sheet)
            for i,t in enumerate(moments):
                state=await page.evaluate('t=>'+seek+'(t)',t);metadata.append(state)
                name=out/f'scene-{i+1:02d}.png';await page.screenshot(path=str(name))
                with Image.open(name) as im:
                    thumb=im.convert('RGB').resize((608,342),Image.Resampling.LANCZOS)
                    x=24+(i%2)*632;y=24+(i//2)*386
                    if y+342>sheet.height:
                        bigger=Image.new('RGB',(1280,y+380),'#F8F7EE');bigger.paste(sheet,(0,0));sheet=bigger;draw=ImageDraw.Draw(sheet)
                    sheet.paste(thumb,(x,y));draw.text((x,y+348),f'{t:04.1f} s',fill='#173F36')
            sheet.save(out/'storyboard.png')
            if args.live:
                assert metadata[12]['baseState']['stars']==55 and metadata[12]['baseState']['equipped'].get('hat')=='hat-cap'
                assert all(x['source']=='vercel' and x['capture'] for x in metadata[1:11])
                assert await page.evaluate('Object.values(document.querySelectorAll("#live-photos img")).every(i=>i.complete&&i.naturalWidth>0)')
                await page.evaluate('liveFilmSeek(31.3)')
                module=page.frame_locator('#prototype-film')
                assert await module.locator('#movie-shop .vc-preview .bipych-ufo-beam').count()==1
                assert await module.locator('#movie-shop .vc-preview .bipych-stardust').count()==1
            else:
                assert metadata[5]['stars']==55 and metadata[5]['equipped'].get('hat')=='hat-cap',metadata[5]
                assert await page.evaluate('document.querySelectorAll(".scene").length===6')
                await page.evaluate('filmSeek(19.3)')
                assert await page.locator('#movie-shop .vc-preview .bipych-ufo-beam').count()==1
                assert await page.locator('#movie-shop .vc-preview .bipych-stardust').count()==1
                await page.evaluate('filmSeek(31.2)')
                frame=page.frame_locator('#lesson-frame')
                assert await frame.locator('#position').inner_text()=='3 / 3'
                assert await frame.locator('#answer').is_visible()
            assert not errors,errors
            (out/'verification.json').write_text(json.dumps({'moments':metadata,'errors':errors},ensure_ascii=False,indent=2),encoding='utf-8')
            if not args.qa:
                ffmpeg=args.ffmpeg or os.environ.get('FFMPEG_EXECUTABLE') or 'ffmpeg'
                video=out/('vektor-product-live.mp4' if args.live else 'vektor-demo.mp4')
                cmd=[ffmpeg,'-y','-hide_banner','-loglevel','warning','-f','image2pipe','-vcodec','png','-framerate',str(args.fps),'-i','pipe:0','-an','-c:v','libx264','-threads','4','-preset','fast','-crf','19','-pix_fmt','yuv420p','-movflags','+faststart',str(video)]
                with (out/'encode.log').open('wb') as log:
                    encoder=subprocess.Popen(cmd,stdin=subprocess.PIPE,stdout=subprocess.DEVNULL,stderr=log)
                    began=time.monotonic()
                    try:
                        for i in range(36*args.fps):
                            await page.evaluate('t=>'+seek+'(t)',i/args.fps)
                            encoder.stdin.write(await page.screenshot(type='png'))
                            if i%90==0:print(f'Rendered {i}/{36*args.fps} frames; {time.monotonic()-began:.0f}s elapsed',flush=True)
                        encoder.stdin.close();code=encoder.wait(timeout=90)
                        if code:raise RuntimeError((out/'encode.log').read_text(errors='replace'))
                    except BaseException:
                        encoder.kill();encoder.wait();raise
                print('MP4 complete: '+str(video),flush=True)
            await browser.close()
    finally:
        server.shutdown();server.server_close()
    print('Storyboards and product interactions verified',flush=True)

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--output',required=True);parser.add_argument('--ffmpeg');parser.add_argument('--fps',type=int,default=30);parser.add_argument('--qa',action='store_true');parser.add_argument('--live',action='store_true')
    asyncio.run(render(parser.parse_args()))

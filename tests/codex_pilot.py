"""Браузерная приёмка кабинетов на временной БД, с настоящими RPC и заголовками Vercel."""
import asyncio,datetime,http.server,json,os,pathlib,secrets,threading
from playwright.async_api import async_playwright
import supabase_scenarios as S
ROOT=pathlib.Path(__file__).resolve().parent.parent
SHOTS=pathlib.Path(os.environ['CODEX_SCREENSHOT_DIR']) if os.environ.get('CODEX_SCREENSHOT_DIR') else None
RESULTS=[]
def check(name,ok):
    RESULTS.append(bool(ok));print(('OK  ' if ok else 'FAIL'),name,flush=True)
    if not ok:raise AssertionError(name)
async def main():
    S.DB='vk_test_pilot_'+secrets.token_hex(4);S.psql('create database '+S.DB,db='postgres')
    server=None
    try:
        S.psql("do $$begin create role anon nologin;exception when duplicate_object then null;end$$;do $$begin create role authenticated nologin;exception when duplicate_object then null;end$$;do $$begin create role service_role nologin;exception when duplicate_object then null;end$$;")
        for name in ['schema.sql','test.sql','admin.sql','teacher.sql','pulse.sql','ai.sql','guard.sql','accounts.sql','plans.sql','parent.sql','tutor_cabinet.sql','audit.sql','pilot_report.sql','security_fix.sql','pilot_adults.sql','login_keys.sql']:
            S.psql((ROOT/'supabase'/name).read_text(encoding='utf-8'))
        S.psql("insert into vk_adults(role,email,email_verified_at,pass_hash) values('parent','parent@example.invalid',now(),extensions.crypt('DemoPass123',extensions.gen_salt('bf',4))),('tutor','tutor@example.invalid',now(),extensions.crypt('DemoPass123',extensions.gen_salt('bf',4)));select vk_teacher('admin-demo','DemoPass123','Администратор','',true);insert into vk_classes(name) values('Демо-класс');")
        headers=json.loads((ROOT/'vercel.json').read_text(encoding='utf-8'))['headers'][0]['headers']
        class H(S.H):
            legacy_seen=set()
            def end_headers(self):
                for h in headers:self.send_header(h['key'],h['value'])
                super().end_headers()
            def do_POST(self):
                if self.path.rsplit('/',1)[-1] in ('vektor_login','vektor_teacher_login') and self.path not in H.legacy_seen:
                    self.rfile.read(int(self.headers.get('Content-Length',0)));H.legacy_seen.add(self.path)
                    self.send_response(404);self.send_header('Content-Type','application/json');self.end_headers();self.wfile.write(b'{"code":"PGRST202","message":"legacy signature"}');return
                try:super().do_POST()
                except (ConnectionAbortedError,ConnectionResetError,BrokenPipeError):pass
        server=http.server.ThreadingHTTPServer(('127.0.0.1',0),H);threading.Thread(target=server.serve_forever,daemon=True).start();base=f'http://127.0.0.1:{server.server_port}'
        async with async_playwright() as p:
            options={'executable_path':os.environ['CODEX_BROWSER_EXECUTABLE']} if os.environ.get('CODEX_BROWSER_EXECUTABLE') else {}
            browser=await p.chromium.launch(**options);errors=[]
            async def page():
                ctx=await browser.new_context(viewport={'width':1440,'height':1000},locale='ru-RU',timezone_id='Europe/Moscow');pg=await ctx.new_page();pg.on('pageerror',lambda e:errors.append(str(e)));return pg
            async def shots(pg,name):
                for width in [1440,390]:
                    await pg.set_viewport_size({'width':width,'height':1000});await pg.wait_for_timeout(100)
                    check(name+f': нет прокрутки вбок {width}',await pg.evaluate('() => document.documentElement.scrollWidth<=innerWidth'))
                    if SHOTS:SHOTS.mkdir(parents=True,exist_ok=True);await pg.screenshot(path=str(SHOTS/f'{name}-{width}.png'),full_page=True)
                await pg.set_viewport_size({'width':1440,'height':1000})
            async def adult_login(pg,email,url='parent.html'):
                await pg.goto(base+'/'+url);await pg.wait_for_selector('#adult-form');await pg.fill('[name=email]',email);await pg.fill('[name=password]','DemoPass123');await pg.click('#adult-form button[type=submit]');await pg.wait_for_selector('[data-add]')
            parent=await page();await adult_login(parent,'parent@example.invalid');await parent.click('[data-add]');await parent.fill('#adult-create [name=label]','Демо-ученик');await parent.click('#adult-create button');await parent.wait_for_selector('[data-print]')
            fields=await parent.locator('.adult-card.no-print strong').all_text_contents();login,password=fields[:2]
            async with parent.expect_popup() as opened:await parent.click('[data-print]')
            slip=await opened.value;await slip.wait_for_function("() => document.querySelectorAll('#slips .slip').length===1")
            check('лист входа использует шаблон и не передаёт пароль в URL',await slip.inner_text('[data-field=login]')==login and password not in slip.url)
            await slip.close();await parent.click('[data-close]')
            sid=int(S.psql('select id from vk_students where login='+S.lit(login)))
            S.psql(f"update vk_students set class_id=(select id from vk_classes where name='Демо-класс') where id={sid};insert into vk_events(event_id,student_id,type,data) values('pilot-browser-attempt',{sid},'attempt','{{\"topic\":\"concept\",\"ok\":true,\"sec\":120}}'),('pilot-browser-bug',{sid},'bug_found','{{\"bug\":\"add-diff:add-denominators\"}}');")
            await parent.click(f'[data-child="{sid}"]');await parent.wait_for_selector('[data-weekly]');check('карточка родителя: каталог правил без игровых терминов','Складывает числители и знаменатели' in await parent.inner_text('#adult-child') and 'жуч' not in (await parent.inner_text('#adult-child')).lower());await shots(parent,'parent')
            student=await page();await student.goto(base);await student.fill('[name=login]',login);await student.fill('[name=password]',password);await student.click('#login-form button[type=submit]');await student.wait_for_selector('#logout-btn');await student.wait_for_timeout(600);check('при первом входе не просят сразу менять пароль',await student.locator('[data-later]').count()==0);await student.goto(base+'/#settings');await student.wait_for_selector('#student-link-code');await student.click('#student-link-code');await student.wait_for_function("() => /^\\d{6}/.test(document.querySelector('#student-code').textContent)");code=(await student.inner_text('#student-code'))[:6];await shots(student,'student-profile')
            tutor=await page();await adult_login(tutor,'tutor@example.invalid','parent.html?role=tutor');check('репетитор перенаправлен в свой кабинет','tutor.html' in tutor.url);await tutor.click('[data-add]');await tutor.fill('#adult-link [name=code]',code);await tutor.click('#adult-link button');await tutor.wait_for_selector(f'[data-child="{sid}"]');await tutor.fill('#tutor-group [name=name]','Малая группа');await tutor.check('#tutor-group [name=members]');await tutor.click('#tutor-group button');await tutor.wait_for_selector('[data-edit-group]')
            due=(datetime.datetime.now()+datetime.timedelta(days=1)).strftime('%Y-%m-%dT%H:%M')
            await tutor.select_option('#tutor-assignment [name=topic]','concept');await tutor.fill('#tutor-assignment [name=due]',due);group=await tutor.locator('[data-edit-group]').first.get_attribute('data-edit-group');await tutor.select_option('#tutor-assignment [name=group]',group)
            async with tutor.expect_response(lambda r:'/vektor_tutor_assign' in r.url) as assigned:await tutor.click('#tutor-assignment button')
            check('задание записано сервером',(await (await assigned.value).json()).get('ok') is True)
            await tutor.wait_for_function("() => document.getElementById('adult-message')?.textContent==='Сохранено'")
            await student.goto(base+'/#home');await student.wait_for_selector('#tutor-assignments a');check('задание открывает тот же урок и движок',(await student.get_attribute('#tutor-assignments a','href')).startswith('#lesson/0/learn'))
            await tutor.select_option('#tutor-pulse-group',group);await tutor.wait_for_selector('#tutor-pulse li');await tutor.click(f'[data-child="{sid}"]');await tutor.wait_for_selector('#adult-child>button');await shots(tutor,'tutor')
            await tutor.click('#adult-child>button');await tutor.wait_for_selector('a[href*="#share="]');link=await tutor.get_attribute('a[href*="#share="]','href');shared=await page();await shared.goto(base+'/'+link);await shared.wait_for_selector('#report-app h2');txt=await shared.inner_text('#report-app');check('отчёт по ссылке не раскрывает логин, почту и имя',login not in txt and 'Демо-ученик' not in txt and '@' not in txt and not await shared.locator('#report-login').count())
            await tutor.reload();await tutor.wait_for_selector('[data-revoke-report]');await tutor.click('[data-revoke-report]');await tutor.wait_for_function("() => document.getElementById('tutor-tools')?.textContent.includes('отозван')");await shared.goto(base+'/'+link);await shared.wait_for_function("() => document.getElementById('report-app').textContent.includes('отозвана')");check('отозванная ссылка закрыта',True)
            teacher=await page();await teacher.goto(base+'/teacher.html');await teacher.fill('#f [name=login]','admin-demo');await teacher.fill('#f [name=password]','DemoPass123');await teacher.click('#f button');await teacher.wait_for_selector('#tbody tr');check('старые сигнатуры входа ученика и учителя совместимы до применения SQL',len(H.legacy_seen)==2)
            admin=await page();await admin.goto(base+'/report.html');await admin.wait_for_selector('#report-login');await admin.fill('[name=login]','admin-demo');await admin.fill('[name=password]','DemoPass123');await admin.click('#report-login button');await admin.wait_for_selector('#report-data table');await admin.select_option('#report-filter [name=class]','Демо-класс');await admin.click('#report-filter button');await admin.wait_for_function("() => document.querySelector('#report-data h2')?.textContent.includes('Демо-класс')");await shots(admin,'admin-report')
            async with admin.expect_download() as downloaded:await admin.click('#report-csv')
            download=await downloaded.value;data=pathlib.Path(await download.path()).read_bytes();check('CSV: BOM, кириллица и отсутствие логина',data.startswith(b'\xef\xbb\xbf') and 'Показатель'.encode() in data and login.encode() not in data)
            await admin.emulate_media(media='print');check('печать скрывает форму и кнопки',not await admin.is_visible('#report-filter') and not await admin.is_visible('#report-csv'));await admin.emulate_media(media='screen')
            await parent.click('.adult-more summary');await parent.click('[data-unlink]');await parent.click('[data-unlink-confirm]');await parent.wait_for_function("() => !document.querySelector('[data-child]')");check('отвязка удаляет только связь',S.psql(f'select count(*) from vk_students where id={sid}')=='1')
            await tutor.click('[data-logout-all]');await tutor.wait_for_selector('#adult-form');check('выход взрослого со всех устройств возвращает вход',True)
            check('на новых экранах нет ошибок JavaScript',not errors)
            await browser.close()
    finally:
        if server:server.shutdown();server.server_close()
        S.psql('drop database if exists '+S.DB+' with (force)',db='postgres')
    print(f'ИТОГО: {sum(RESULTS)} из {len(RESULTS)}')
asyncio.run(main())

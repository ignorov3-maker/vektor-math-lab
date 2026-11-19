"""Аудит безопасности на локальной копии: настоящая схема из supabase/*.sql, сайт, кабинеты.
Ученик-злоумышленник пишет вредоносный HTML во все свои поля, потом открываем все кабинеты и смотрим,
выполнился ли код. Плюс попытки дотянуться до чужих данных и подделать данные.
Запуск: python tests/security_audit.py  (нужны локальный Postgres, playwright, bun)
"""
import asyncio, json, secrets, socket, subprocess, sys, threading, http.server, os
sys.path.insert(0, os.path.dirname(__file__))
import supabase_scenarios as ss
from playwright.async_api import async_playwright

ROOT = ss.ROOT
found = []  # (серьёзность, что)
def rep(name, ok, extra=''):
    print(('OK  ' if ok else 'ДЫРА'), name, extra)
    if not ok: found.append(name + (f' — {extra}' if extra else ''))

def call(fn, ip=None, **args):
    hdr = f"set request.headers = '{json.dumps({'x-real-ip': ip})}'; " if ip else ''
    sql = f"{hdr}set role anon; select {fn}(" + ', '.join(f'{k} => {ss.lit(v)}' for k, v in args.items()) + ")::text"
    try: return json.loads(ss.psql(sql))
    except RuntimeError as e: return {'raised': str(e).split('ERROR:')[-1].strip()}

def X(tag):  # полезная нагрузка: если выполнится — запишет метку в window.__x
    return f'"\'><img src=x onerror="window.__x.push(\'{tag}\')"><svg onload="window.__x.push(\'{tag}-svg\')">'

async def main():
    ss.DB = 'vk_audit_' + secrets.token_hex(3)
    psql = ss.psql
    psql(f'create database {ss.DB}', db='postgres')
    try:
        psql("do $$ begin create role anon nologin; exception when duplicate_object then null; end $$;"
             "do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;")
        for f in ('schema.sql', 'test.sql', 'admin.sql', 'teacher.sql', 'pulse.sql', 'ai.sql', 'guard.sql', 'accounts.sql', 'plans.sql', 'parent.sql', 'tutor_cabinet.sql', 'audit.sql', 'pilot_report.sql', 'security_fix.sql', 'pilot_adults.sql', 'login_keys.sql'):
            subprocess.run(['psql', f'{ss.PG} dbname={ss.DB}', '-v', 'ON_ERROR_STOP=1', '-q', '-f', str(ROOT / 'supabase' / f)], check=True, capture_output=True)
        psql("select count(*) from vk_seed(80, '5А:1-28,5Б:29-56,5В:57-80')")
        psql("update vk_students set pass_hash = extensions.crypt('зоолог5679', extensions.gen_salt('bf', 8)) where login in ('ученик1','ученик2','ученик3');"
             "select vk_teacher('uchitel', 'учитель-1', 'Учитель', '5А')")
        sid = lambda l: int(psql(f"select id from vk_students where login='{l}'"))
        tok = lambda role, uid: psql(f"select vk_new_session('{role}', {uid})")
        s1, s2, s40 = sid('ученик1'), sid('ученик2'), sid('ученик40')
        t_uid = int(psql("select id from vk_teachers where login='uchitel'"))
        T = tok('teacher', t_uid); S1 = tok('student', s1)
        par = int(psql("insert into vk_adults(role,email,pass_hash,email_verified_at) values('parent','p@x.ru',extensions.crypt('пароль-родителя',extensions.gen_salt('bf',8)),now()) returning id"))
        tut = int(psql("insert into vk_adults(role,email,pass_hash,email_verified_at) values('tutor','t@x.ru',extensions.crypt('пароль-репетитора',extensions.gen_salt('bf',8)),now()) returning id"))
        psql(f"insert into vk_links(student_id,adult_id,kind) values({s1},{par},'parent'),({s1},{tut},'tutor')")
        P, TU = tok('parent', par), tok('tutor', tut)

        # ---------- 1. Чужие данные (IDOR) ----------
        r = call('vektor_teacher_student', p_token=T, p_login='ученик40'); rep('учитель 5А не видит ученика из 5В', 'error' in r or 'raised' in r, str(r)[:80])
        r = call('vektor_teacher_reset', p_token=T, p_login='ученик40'); rep('учитель 5А не сбрасывает пароль ученику 5В', 'password' not in r)
        r = call('vektor_teacher_slips', p_token=T, p_class='5В'); rep('учитель 5А не перевыпускает бумажки 5В', 'slips' not in r)
        r = call('vektor_teacher_push', p_token=T, p_logins=['ученик40'], p_bug='concept:flipped', p_payload={}); rep('учитель не шлёт задачу чужому классу', 'id' not in r)
        r = call('vektor_parent_child', p_token=P, p_student=s40); rep('родитель не видит чужого ребёнка', 'raised' in r or 'error' in r, str(r)[:80])
        r = call('vektor_tutor_child', p_token=TU, p_student=s40); rep('репетитор не видит чужого ученика', 'raised' in r or 'error' in r, str(r)[:80])
        r = call('vektor_tutor_report', p_token=TU, p_student=s40); rep('репетитор не делает отчёт по чужому', 'raised' in r or 'error' in r, str(r)[:80])
        r = call('vektor_adult_reset_student', p_token=P, p_student=s40); rep('родитель не сбрасывает пароль чужому', 'password' not in json.dumps(r, ensure_ascii=False), str(r)[:80])
        r = call('vektor_adult_unlink', p_token=P, p_student=s40); rep('родитель не трогает чужие связи', 'raised' in r or 'error' in r or r.get('ok') is not True, str(r)[:80])
        r = call('vektor_tutor_group', p_token=TU, p_name='g', p_students=[s40]); rep('репетитор не добавляет чужого в группу', 'raised' in r or 'error' in r, str(r)[:80])
        r = call('vektor_tutor_assign', p_token=TU, p_topic='concept', p_due='2030-01-01T00:00:00Z', p_students=[s40]); rep('репетитор не задаёт чужому', 'raised' in r or 'error' in r, str(r)[:80])
        r = call('vektor_state', p_token=P); rep('токен родителя не работает как ученический', 'raised' in r)
        r = call('vektor_teacher_class', p_token=S1); rep('токен ученика не работает как учительский', 'raised' in r)
        r = call('vektor_admin_classes', p_token=T); rep('обычный учитель не видит админ-отчёт', 'raised' in r or 'error' in r, str(r)[:80])
        r = call('vektor_shared_report', p_token='0' * 64); rep('подобрать ссылку на отчёт нельзя', 'raised' in r or 'error' in r or not r.get('report'), str(r)[:80])

        # ---------- 2. Подделка данных учеником ----------
        before = int(psql("select count(*) from vk_events where type='ai_flag'"))
        call('vektor_sync', p_token=S1, p_events=[{'id': 'fakeflag0001', 'type': 'ai_flag', 'data': {'text': 'поддельный сигнал'}}])
        rep('ученик не может сам себе записать «сигнал ИИ» (видит учитель)', int(psql("select count(*) from vk_events where type='ai_flag'")) == before)
        pid = call('vektor_teacher_push', p_token=T, p_logins=['ученик2'], p_bug='concept:flipped', p_payload={'q': '1/2'}).get('id')
        call('vektor_sync', p_token=S1, p_events=[{'id': 'fakepush0001', 'type': 'push_done', 'data': {'push': pid, 'ok': True}}])
        rep('ученик не может «сдать» чужое задание учителя', psql(f"select count(*) from vk_events where type='push_done' and (data->>'push')::int={pid}") == '0')
        for k in range(20): call('vektor_sync', p_token=S1, p_events=[{'id': f'fake{k:02d}ok{i:06d}', 'type': 'attempt', 'data': {'topic': 'concept', 'ok': True, 'question': 'q', 'answer': 'a'}} for i in range(200)])
        rep('ученик не может забить базу: 4000 событий за раз → не больше 3000 в сутки', int(psql(f"select count(*) from vk_events where student_id={s1} and type='attempt'")) <= 3000,
            psql(f"select count(*) from vk_events where student_id={s1} and type='attempt'") + ' записано')
        r = call('vektor_student_set_login', p_token=S1, p_login='ученик81'); rep('ученик не может сменить свой логин на «ученикN» (путаница у учителя)', r.get('ok') is not True, str(r)[:60])
        if r.get('ok'): psql(f"update vk_students set login='ученик1' where id={s1}")

        # ---------- 3. Блокировка входа чужого ученика ----------
        for _ in range(5): call('vektor_login', ip='203.0.113.66', p_login='ученик3', p_password='неверно0000')
        r = call('vektor_login', ip='203.0.113.66', p_login='ученик3', p_password='зоолог5679')
        rep('перебор: после 5 ошибок с одного адреса этот адрес ждёт', 'token' not in r)
        r = call('vektor_login', ip='198.51.100.5', p_login='ученик3', p_password='зоолог5679')
        rep('посторонний не может заблокировать вход ребёнку 5 неверными паролями', 'token' in r, r.get('message', '')[:60])
        for _ in range(5): call('vektor_teacher_login', ip='203.0.113.66', p_login='uchitel', p_password='неверно')
        r = call('vektor_teacher_login', ip='198.51.100.5', p_login='uchitel', p_password='учитель-1')
        rep('посторонний не может заблокировать вход учителю', 'token' in r, r.get('message', '')[:60])
        for i in range(50): call('vektor_login', ip=f'10.0.{i}.1', p_login='ученик2', p_password='неверно0000')
        r = call('vektor_login', ip='198.51.100.77', p_login='ученик2', p_password='зоолог5679')
        rep('перебор с 50 адресов: аккаунт ставится на паузу', 'token' not in r)
        psql("update vk_students set fails=0, locked_until=null; update vk_teachers set fails=0, locked_until=null; delete from vk_login_attempts")

        # ---------- 4. Вредоносный HTML от ученика во всех кабинетах ----------
        topics = ['concept', 'reduce', 'compare']
        state = {'meta': {t: {'practice': 3, 'mastered': False, 'failedChecks': 1, 'errors': {X('err-key'): 2, 'flipped': X('err-val')}} for t in topics}}
        state['meta'][X('topic-key')] = {'practice': 1}
        state['settings'] = {'interests': [X('interest')], 'style': X('style'), 'pace': X('pace')}
        call('vektor_sync', p_token=S1, p_state=state, p_events=[
            {'id': f'xss{i:08d}', 'type': 'attempt', 'data': {'topic': tp, 'ok': i % 2 == 0, 'question': X(f'q{i}'), 'answer': X(f'a{i}'),
             'mistake': ('flipped' if i % 3 else X(f'm{i}')), 'mode': X(f'mode{i}'), 'hints': 1}}
            for i, tp in enumerate(['concept', 'concept', X('ev-topic'), 'reduce'])] + [
            {'id': 'xssbug00001', 'type': 'bug_found', 'data': {'bug': X('bug'), 'topic': 'concept'}},
            {'id': 'xssbug00002', 'type': 'bug_step', 'data': {'bug': X('bug2'), 'step': 'twin', 'ok': True}},
            {'id': 'xssmast0001', 'type': 'mastery', 'data': {'topic': X('mastery')}}])
        psql(f"insert into vk_events(event_id,student_id,type,data) values('xssflag0001',{s1},'ai_flag',{ss.lit({'text': X('flag')})})")  # как пишет сервер ИИ
        pid2 = call('vektor_teacher_push', p_token=T, p_logins=['ученик2'], p_bug='concept:flipped',
                    p_payload={k: X('push-' + k) for k in ('q', 'question', 'text', 'title', 'hint', 'answer', 'counter', 'twin', 'html')}).get('id')
        rep_tok = call('vektor_tutor_report', p_token=TU, p_student=s1)

        srv_port = socket.socket(); srv_port.bind(('127.0.0.1', 0)); port = srv_port.getsockname()[1]; srv_port.close()
        srv = http.server.ThreadingHTTPServer(('127.0.0.1', port), ss.H); threading.Thread(target=srv.serve_forever, daemon=True).start()
        base = f'http://127.0.0.1:{port}'
        async with async_playwright() as p:
            b = await p.chromium.launch()
            async def visit(name, url, storage=None, after=None, wait=2500):
                ctx = await b.new_context(viewport={'width': 1280, 'height': 900})
                await ctx.add_init_script("window.__x = []; window.alert = window.confirm = () => window.__x.push('alert');")
                if storage: await ctx.add_init_script(storage)
                pg = await ctx.new_page(); errs = []
                pg.on('pageerror', lambda e: errs.append(str(e)[:120]))
                await pg.goto(base + url); await pg.wait_for_timeout(wait)
                if after: await after(pg)
                x = await pg.evaluate('window.__x'); await ctx.close()
                rep(f'вредоносный код ученика не выполняется: {name}', not x, ', '.join(sorted(set(x)))[:150])
                if errs: print('     ошибки страницы:', errs[:3])
            tsess = json.dumps({'token': T, 'name': 'Учитель', 'login': 'uchitel'})
            async def drawer(pg):
                el = pg.locator('text=ученик1').first
                if await el.count(): await el.click(); await pg.wait_for_timeout(1500)
                await pg.evaluate("typeof openDrawer==='function' && openDrawer('ученик1')"); await pg.wait_for_timeout(1500)
            await visit('кабинет учителя + карточка ученика', '/teacher.html', f"sessionStorage.setItem('vektor-teacher', {json.dumps(tsess)})", drawer, 3500)
            for role, tk, page in (('parent', P, '/parent.html'), ('tutor', TU, '/tutor.html')):
                async def openchild(pg):
                    for sel in (f'[data-student="{s1}"]', f'[data-id="{s1}"]', 'text=ученик1'):
                        el = pg.locator(sel).first
                        if await el.count(): await el.click(); await pg.wait_for_timeout(1500); break
                await visit(f'кабинет {"родителя" if role == "parent" else "репетитора"}', page,
                            f"localStorage.setItem('vektor-adult', {json.dumps(json.dumps({'token': tk, 'role': role, 'name': 'X'}))})", openchild, 3000)
            if isinstance(rep_tok, dict) and rep_tok.get('url', rep_tok.get('token')):
                t = rep_tok.get('token') or rep_tok['url'].split('#')[-1].split('=')[-1]
                await visit('отчёт по ссылке для родителей', f'/report.html#{t}')
            S2 = tok('student', s2)
            st2 = json.dumps({'token': S2, 'login': 'ученик2', 'label': 'Ученик 2'})
            await visit('приложение ученика с задачей от учителя (взломанный учитель → дети)', '/', f"localStorage.setItem('vektor-session', {json.dumps(st2)})", None, 5000)
            await b.close()
    finally:
        ss.psql(f'drop database if exists {ss.DB}', db='postgres')
    print('\nНАЙДЕНО:', len(found)); [print(' •', f) for f in found]
    sys.exit(1 if found else 0)

if __name__ == '__main__':
    asyncio.run(main())

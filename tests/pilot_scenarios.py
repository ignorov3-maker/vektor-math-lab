"""Проверки новых RPC пилота на изолированной БД из supabase_scenarios.py."""
def run(psql, rep):
    rep('CX-22: стоимость по темам и исторический курс', psql(r"""
begin;
do $$declare s int;r jsonb;begin
 insert into vk_students(login,pass_hash) values('cx22','test') returning id into s;
 perform vk_ai_set(true,100,1000,100,100,100);
 perform vk_ai_spend(s,100,50,0.01,'angle');
 perform vk_ai_set(true,100,1000,200,100,100);
 perform vk_ai_spend(s,200,100,0.01,'angle');
 select v into r from jsonb_array_elements(vk_ai_cost_by_topic(7))v where v->>'topic'='angle';
 if (r->>'rub_per_question')::numeric<>1.5 or (r->>'tokens_in')::numeric<>150 then raise exception 'topic cost %',r;end if;
 if has_function_privilege('anon','vk_ai_cost_by_topic(integer)','execute') then raise exception 'cost report open';end if;
end $$;rollback;select 'OK';
""").endswith('OK'))
    rep('CX-21: группы до шести, свои ученики, задание и отзыв отчёта', psql(r"""
begin;
do $$
declare a int;b int;s int;t text;bt text;st text;ids jsonb:='[]';gid int;i int;r jsonb;report jsonb;
begin
 insert into vk_adults(role,email,pass_hash) values('tutor','cx21@example.invalid','test') returning id into a;
 insert into vk_adults(role,email,pass_hash) values('tutor','cx21b@example.invalid','test') returning id into b;
 t:=vk_new_session('tutor',a);bt:=vk_new_session('tutor',b);
 for i in 1..7 loop r:=vektor_adult_create_student(t,'Ученик '||i);s:=(r->>'student_id')::int;ids:=ids||to_jsonb(s);end loop;
 if vektor_tutor_group(t,'Семь',ids)->>'error'<>'group' then raise exception 'seventh member';end if;
 ids:=ids-6;r:=vektor_tutor_group(t,'Шесть',ids);gid:=(r->>'id')::int;
 begin perform vektor_tutor_child(bt,s);raise exception 'foreign child';exception when sqlstate 'P0403' then null;end;
 begin perform vektor_tutor_pulse(bt,gid);raise exception 'foreign group';exception when sqlstate 'P0403' then null;end;
 r:=vektor_tutor_assign(t,'concept',now()+interval '1 day','[]',gid);
 st:=vk_new_session('student',(ids->>0)::int);
 if jsonb_array_length(vektor_student_assignments(st))<>1 then raise exception 'assignment absent';end if;
 report:=vektor_tutor_report(t,s);
 r:=vektor_shared_report(report->>'token');if r ? 'student_id' or r ? 'label' then raise exception 'share identity';end if;
 perform vektor_tutor_revoke_report(t,(report->>'id')::int);
 begin perform vektor_shared_report(report->>'token');raise exception 'revoked report';exception when sqlstate 'P0403' then null;end;
 if has_table_privilege('anon','vk_shared_reports','select') then raise exception 'report tokens';end if;
end $$;
rollback;select 'OK';
""").endswith('OK'))
    rep('CX-20: карточка по событиям, чужой ребёнок, сброс и отвязка', psql(r"""
begin;
do $$
declare a int;b int;s int;t text;bt text;r jsonb;
begin
 insert into vk_adults(role,email,pass_hash) values('parent','cx20a@example.invalid','test') returning id into a;
 insert into vk_adults(role,email,pass_hash) values('parent','cx20b@example.invalid','test') returning id into b;
 t:=vk_new_session('parent',a);bt:=vk_new_session('parent',b);
 r:=vektor_adult_create_student(t,'Ребёнок');s:=(r->>'student_id')::int;
 if not vektor_login(r->>'login',r->>'password') ? 'token' then raise exception 'printed password';end if;
 insert into vk_events(event_id,student_id,type,data,ts_server) values
 ('cx20-attempt1',s,'attempt','{"topic":"add-diff","question":"same","ok":false,"sec":60}',now()-interval '2 minutes'),
 ('cx20-attempt2',s,'attempt','{"topic":"add-diff","question":"same","ok":true,"sec":120}',now()-interval '1 minute'),
 ('cx20-found',s,'bug_found','{"bug":"add-diff:add-denominators"}',now()),
 ('cx20-beaten',s,'bug_beaten','{"bug":"add-diff:add-denominators"}',now());
 r:=vektor_parent_child(t,s);
 if r->>'attempts'<>'2' or r->>'solved'<>'1' or r->>'seconds'<>'120' or jsonb_array_length(r->'rules')<>1 then raise exception 'wrong metrics %',r;end if;
 begin perform vektor_parent_child(bt,s);raise exception 'foreign child';exception when sqlstate 'P0403' then null;end;
 r:=vektor_adult_reset_student(t,s);
 if not vektor_login(r->>'login',r->>'password') ? 'token' then raise exception 'reset password';end if;
 perform vektor_adult_unlink(t,s);
 begin perform vektor_parent_child(t,s);raise exception 'unlink access';exception when sqlstate 'P0403' then null;end;
 if not exists(select 1 from vk_students where id=s) then raise exception 'deleted student';end if;
end $$;
rollback;select 'OK';
""").endswith('OK'))
    rep('CX-19: старый вход, смена логина и пароля, код и защита перебора', psql(r"""
begin;
do $$
declare a int; s int; t text; oldt text; atok text; code text; r jsonb; i int;
begin
 insert into vk_students(login,pass_hash,state) values('тестученик',extensions.crypt('пароль123',extensions.gen_salt('bf',4)),'{"answers":7}') returning id into s;
 insert into vk_adults(role,email,pass_hash) values('parent','cx19@example.invalid','test') returning id into a;
 t:=vektor_login('тестученик','ПАРОЛЬ123')->>'token';if t is null then raise exception 'legacy login';end if;
 oldt:=vk_new_session('student',s);atok:=vk_new_session('parent',a);
 perform vektor_student_password_offered(t);
 if not (vektor_student_profile(t)->>'password_offered')::boolean then raise exception 'offer flag';end if;
 if not (vektor_student_set_login(t,'newlogin19')->>'ok')::boolean then raise exception 'set login';end if;
 if vektor_login('тестученик','пароль123') ? 'token' then raise exception 'old login';end if;
 r:=vektor_login('newlogin19','пароль123');if r->'state'->>'answers'<>'7' then raise exception 'lost progress';end if;
 if vektor_student_set_password(t,null,'Newpass19')->>'error'<>'password' then raise exception 'null password';end if;
 if not (vektor_student_set_password(t,'пароль123','Newpass19')->>'ok')::boolean then raise exception 'set password';end if;
 begin perform vk_auth(oldt,'student');raise exception 'other session';exception when sqlstate 'P0401' then null;end;
 if not vektor_login('newlogin19','Newpass19') ? 'token' then raise exception 'new password';end if;
 code:=vektor_link_code(t)->>'code';
 if not (vektor_adult_link(atok,code)->>'ok')::boolean or not vk_can_see(a,s) then raise exception 'link';end if;
 if vektor_adult_link(atok,code)->>'error'<>'code' then raise exception 'code reuse';end if;
 code:=vektor_link_code(t)->>'code';update vk_link_codes set expires=now()-interval '1 second' where student_id=s;
 if vektor_adult_link(atok,code)->>'error'<>'code' then raise exception 'expired code';end if;
 for i in 1..3 loop perform vektor_adult_link(atok,'bad');end loop;
 if vektor_adult_link(atok,'bad')->>'error'<>'locked' then raise exception 'brute force';end if;
 if has_table_privilege('anon','vk_link_codes','select') then raise exception 'codes exposed';end if;
 begin perform vektor_student_profile(atok);raise exception 'adult can edit student';exception when sqlstate 'P0403' then null;end;
end $$;
rollback;select 'OK';
""").endswith('OK'))
    rep('CX-18: регистрация, подтверждение, одноразовость, срок и сброс', psql(r"""
begin;
create temporary table cx_mail(data jsonb);
create or replace function vk_mail(p_action text,p_data jsonb) returns jsonb language plpgsql security definer set search_path=public,extensions as $$ begin
 if p_action='captcha' then return jsonb_build_object('ok',p_data->>'token'='test-captcha'); end if;
 insert into pg_temp.cx_mail values(p_data); return '{"ok":true}'::jsonb;
end $$;
do $$
declare r jsonb; tok text; session text;
begin
  r:=vektor_adult_register('test@example.invalid','testpass123','parent','v1','test-captcha');
  if r->>'error'<>'soon' then raise exception 'signup not closed'; end if;
  update vk_settings set value='true' where key='signup_open';
  update vk_settings set value=jsonb_build_object('version','v1','sha256',repeat('a',64)) where key='consent';
  update vk_settings set value='{"url":"https://vektor.example"}' where key='site';
  r:=vektor_adult_register('test@example.invalid','testpass123','parent','old','test-captcha');
  if r->>'error'<>'consent' then raise exception 'old consent'; end if;
  r:=vektor_adult_register('test@example.invalid','testpass123','parent','v1','bad');
  if r->>'error'<>'captcha' then raise exception 'captcha'; end if;
  perform vektor_adult_register('TEST@example.invalid','testpass123','parent','v1','test-captcha');
  if vektor_adult_login('test@example.invalid','testpass123','cx18')->>'error'<>'unverified' then raise exception 'unverified login'; end if;
  select split_part(data->>'url','#adult_confirm=',2) into tok from cx_mail limit 1;
  if tok is null or not (vektor_adult_confirm(tok)->>'ok')::boolean then raise exception 'confirmation'; end if;
  if vektor_adult_confirm(tok)->>'error'<>'token' then raise exception 'reuse'; end if;
  r:=vektor_adult_login('test@example.invalid','testpass123','cx18');session:=r->>'token';
  if session is null then raise exception 'login %',r; end if;
  if vektor_adult_reset_request('none@example.invalid','test-captcha') is distinct from vektor_adult_reset_request('test@example.invalid','test-captcha') then raise exception 'enumeration'; end if;
  select split_part(data->>'url','#adult_reset=',2) into tok from cx_mail where data->>'kind'='reset' limit 1;
  update vk_mail_tokens set expires=now()-interval '1 second' where purpose='adult_reset';
  if vektor_adult_reset(tok,'newpassword')->>'error'<>'token' then raise exception 'expired token'; end if;
  perform vektor_adult_reset_request('test@example.invalid','test-captcha');
  select split_part(data->>'url','#adult_reset=',2) into tok from cx_mail where data->>'kind'='reset' order by ctid desc limit 1;
  if not (vektor_adult_reset(tok,'newpassword')->>'ok')::boolean then raise exception 'reset'; end if;
  begin perform vk_adult_auth(session);raise exception 'old session';exception when sqlstate 'P0401' then null;end;
  if has_table_privilege('anon','vk_mail_tokens','select') or has_table_privilege('anon','vk_consents','select') then raise exception 'tokens open'; end if;
end $$;
rollback;select 'OK';
""").endswith('OK'))
    rep('CX-17: pilot, истёкшая подписка и лимит тарифа', psql(r"""
begin;
do $$
declare s int; t text;
begin
  insert into vk_students(login,pass_hash) values('cx17','test') returning id into s;
  update vk_plans set limits='{"rub_student_day":5}' where code='pilot';
  if vk_limits('student',s)->>'rub_student_day'<>'5' then raise exception 'pilot fallback'; end if;
  insert into vk_plans values('test-plan','test','{"rub_student_day":1}');
  insert into vk_subscriptions(owner_kind,owner_id,plan,starts,ends,source) values('student',s,'test-plan',now()-interval '2 days',now()-interval '1 day','manual');
  if vk_limits('student',s)->>'rub_student_day'<>'5' then raise exception 'expired plan'; end if;
  insert into vk_subscriptions(owner_kind,owner_id,plan,source) values('student',s,'test-plan','manual');
  perform vk_ai_set(true,100,1000,100,100,100);
  perform vk_ai_spend(s,1,1,0.01); t:=vk_new_session('student',s);
  if vk_ai_take(t)->>'reason'<>'student_budget' then raise exception 'plan ignored'; end if;
  if has_function_privilege('anon','vk_limits(text,integer)','execute') then raise exception 'foreign limits'; end if;
end $$;
rollback;select 'OK';
""").endswith('OK'))
    sql = r"""
begin;
do $$
declare a int; b int; ta text; tb text; r jsonb;
begin
  insert into vk_students(login, pass_hash) values ('cx13-a', 'test') returning id into a;
  insert into vk_students(login, pass_hash) values ('cx13-b', 'test') returning id into b;
  ta := vk_new_session('student', a); tb := vk_new_session('student', b);
  perform vk_ai_set(true, 100, 10000, 100, 1, 3);
  if (select value->>'usd_day' from vk_settings where key='ai') is null then raise exception 'USD setting lost'; end if;
  perform vk_ai_spend(a, 10, 10, 0.01);
  if vk_ai_take(ta)->>'reason' <> 'student_budget' then raise exception 'student budget'; end if;
  if not (vk_ai_take(tb)->>'ok')::boolean then raise exception 'second student blocked'; end if;
  perform vk_ai_spend(b, 20, 20, 0.03);
  if vk_ai_take(tb)->>'reason' not in ('student_budget', 'budget') then raise exception 'global budget'; end if;
  perform vk_ai_set(true, 100, 10000, 100, 100, 3);
  if vk_ai_take(ta)->>'reason' <> 'budget' then raise exception 'global did not stop everyone'; end if;
  if vk_ai_take(vk_new_session('teacher', a))->>'reason' <> 'no_session' then raise exception 'role leak'; end if;
  if has_function_privilege('anon', 'vk_ai_set(boolean,integer,integer,numeric,numeric,numeric)', 'execute') then raise exception 'admin privilege'; end if;
  if has_function_privilege('anon', 'vk_ai_spend(integer,integer,integer,numeric,text,boolean)', 'execute') then raise exception 'spend privilege'; end if;
end $$;
rollback;
select 'OK';
"""
    rep('CX-13: рублёвые лимиты, отдельный ученик, общий бюджет и права', psql(sql).endswith('OK'))
    rep('CX-14: перебор по устройству, школьный IP, старые логины и очистка', psql(r"""
begin;
do $$
declare r jsonb; i int;
begin
  perform set_config('request.headers','{"x-forwarded-for":"192.0.2.10, 10.0.0.1"}',true);
  for i in 1..10 loop r := vektor_login('нет'||i,'wrong','probe-device'); end loop;
  if vektor_login('нет11','wrong','probe-device')->>'error' <> 'too_many' then raise exception 'device guard'; end if;
  insert into vk_students(login,pass_hash) values('тестзащиты',extensions.crypt('пароль123',extensions.gen_salt('bf',4)));
  for i in 1..30 loop
    r := vektor_login('тестзащиты','пароль123','valid-device');
    if not r ? 'token' then raise exception 'valid login %: %',i,r; end if;
  end loop;
  if vk_ip_hash() is null or vk_ip_hash() = '192.0.2.10' then raise exception 'raw IP'; end if;
  if has_function_privilege('anon','vk_login_legacy(text,text)','execute') then raise exception 'guard bypass'; end if;
  if has_function_privilege('anon','vk_cleanup()','execute') then raise exception 'cleanup open'; end if;
  insert into vk_login_attempts(ts,ok) values(now()-interval '31 days',false);
  perform vk_cleanup();
  if exists(select 1 from vk_login_attempts where ts<now()-interval '30 days') then raise exception 'cleanup'; end if;
end $$;
rollback;
select 'OK';
""").endswith('OK'))
    rep('CX-16: роли изолированы, чужие дети и таблицы закрыты', psql(r"""
begin;
do $$
declare a int; b int; s int; t text;
begin
  insert into vk_adults(role,email,pass_hash) values('parent','a@example.invalid','test') returning id into a;
  insert into vk_adults(role,email,pass_hash) values('parent','b@example.invalid','test') returning id into b;
  insert into vk_students(login,pass_hash) values('cx16','test') returning id into s;
  insert into vk_links values(s,a,'parent',now());
  if not vk_can_see(a,s) or vk_can_see(b,s) then raise exception 'foreign child'; end if;
  t := vk_new_session('parent',a);
  if vk_adult_auth(t) <> a then raise exception 'adult session'; end if;
  begin perform vk_auth(t,'student'); raise exception 'role leak'; exception when sqlstate 'P0403' then null; end;
  begin perform vk_adult_auth(vk_new_session('student',s)); raise exception 'role leak'; exception when sqlstate 'P0403' then null; end;
  if has_table_privilege('anon','vk_links','select') or has_table_privilege('anon','vk_adults','select') then raise exception 'table access'; end if;
end $$;
rollback; select 'OK';
""").endswith('OK'))

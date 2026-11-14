"""Проверки новых RPC пилота на изолированной БД из supabase_scenarios.py."""
def run(psql, rep):
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
  if has_function_privilege('anon', 'vk_ai_spend(integer,integer,integer,numeric)', 'execute') then raise exception 'spend privilege'; end if;
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

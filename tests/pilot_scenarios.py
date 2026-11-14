"""Проверки новых RPC пилота на изолированной БД из supabase_scenarios.py."""
def run(psql, rep):
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

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

-- «Вектор»: администрирование пилота (Ф-33–Ф-35). Выполняется только из Supabase → SQL Editor,
-- браузеру эти функции недоступны.

-- Группа класса: pilot (занимается) или control (только тест) — Ф-01
-- select vk_class_group('5Б', 'control');
create or replace function vk_class_group(p_class text, p_grp text) returns text
language plpgsql security definer set search_path = public as $$
begin
  if p_grp not in ('pilot', 'control') then raise exception 'pilot или control'; end if;
  insert into vk_classes (name, grp) values (p_class, p_grp) on conflict (name) do update set grp = excluded.grp;
  return p_class || ': ' || p_grp;
end $$;

-- Раздать профили по классам: select vk_assign('5А', 1, 28);
create or replace function vk_assign(p_class text, p_from int, p_to int) returns int
language plpgsql security definer set search_path = public as $$
declare cid int; n int;
begin
  insert into vk_classes (name) values (p_class) on conflict (name) do nothing;
  select id into cid from vk_classes where name = p_class;
  update vk_students set class_id = cid where login in (select 'ученик' || g from generate_series(p_from, p_to) g);
  get diagnostics n = row_count; return n;
end $$;

-- ИИ: выключатель и лимиты (Ф-16, Ф-33). select vk_ai_set(false); select vk_ai_set(true, 30, 3000);
create or replace function vk_ai_set(p_enabled boolean, p_per_student int default 30, p_total int default 3000) returns jsonb
language sql security definer set search_path = public as $$
  insert into vk_settings values ('ai', jsonb_build_object('enabled', p_enabled, 'per_student_day', p_per_student, 'total_day', p_total))
  on conflict (key) do update set value = excluded.value returning value $$;

-- Расход ИИ по дням: select * from vk_ai_report;
create or replace view vk_ai_report with (security_invoker = true) as
  select day, count(*) as students, sum(n) as messages from vk_ai_usage group by day order by day desc;

-- Обезличенная выгрузка для анализа (Ф-34): псевдоним вместо логина, без классов по имени.
-- Скачать: SQL Editor → select * from vk_export_events; → Export → CSV
create or replace view vk_export_events with (security_invoker = true) as
  select 'p' || substr(md5(s.login || 'vektor-pilot'), 1, 10) as pid, c.grp as grp, e.type, e.data, e.ts_client, e.ts_server
  from vk_events e join vk_students s on s.id = e.student_id left join vk_classes c on c.id = s.class_id
  where e.type <> 'ai_flag';
create or replace view vk_export_tests with (security_invoker = true) as
  select 'p' || substr(md5(s.login || 'vektor-pilot'), 1, 10) as pid, c.grp as grp, d.phase, d.form, d.score, d.total, d.finished_at,
    (select jsonb_object_agg(a.n, jsonb_build_object('ok', a.ok, 'sec', a.sec)) from vk_test_answers a where a.student_id = s.id and a.phase = d.phase) as items
  from vk_test_done d join vk_students s on s.id = d.student_id left join vk_classes c on c.id = s.class_id;
revoke all on vk_ai_report, vk_export_events, vk_export_tests from anon, authenticated;

-- Стереть данные ученика по заявлению родителя (Ф-35). Логин остаётся, но прогресс, ответы и события удаляются.
-- select vk_wipe_student('ученик17');
create or replace function vk_wipe_student(p_login text) returns text
language plpgsql security definer set search_path = public as $$
declare uid int;
begin
  select id into uid from vk_students where login = vk_norm(p_login);
  if uid is null then raise exception 'Нет ученика %', p_login; end if;
  delete from vk_events where student_id = uid;
  delete from vk_test_answers where student_id = uid;
  delete from vk_test_done where student_id = uid;
  delete from vk_ai_usage where student_id = uid;
  update vk_sessions set expires = now() - interval '1 second' where role = 'student' and user_id = uid;
  update vk_students set state = null, state_rev = 0, label = null, last_seen = null where id = uid;
  return 'стёрто: ' || p_login;
end $$;
revoke execute on function vk_class_group(text, text), vk_assign(text, int, int), vk_ai_set(boolean, int, int), vk_wipe_student(text)
  from public, anon, authenticated;

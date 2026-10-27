-- «Вектор»: Пульс класса (CL-6) — жучки сейчас, задача группе, сводка урока.
-- Выполнять после schema.sql, test.sql, admin.sql и teacher.sql. Можно запускать повторно.
-- ИИ здесь не нужен: всё — агрегация событий bug_found / bug_step / bug_beaten / push_done.

create table if not exists vk_pushes (
  id serial primary key, teacher_id int not null references vk_teachers(id) on delete cascade,
  logins text[] not null, bug text not null, payload jsonb not null,
  created timestamptz not null default now(), expires timestamptz not null);
create index if not exists vk_pushes_created on vk_pushes(created);
create index if not exists vk_events_type_ts on vk_events(type, ts_server);
alter table vk_pushes enable row level security;
revoke all on vk_pushes from anon, authenticated;

-- Ученики учителя (админ — все), с фильтром по классу (null или '*' — все свои)
create or replace function vk_teacher_sids(p_uid int, p_class text) returns setof int
language sql stable security definer set search_path = public as $$
  select s.id from vk_students s join vk_teachers t on t.id = p_uid
  left join vk_classes c on c.id = s.class_id
  where (t.is_admin or s.class_id = any(t.class_ids)) and (p_class is null or p_class in ('', '*') or c.name = p_class) $$;

-- Пульс: жучки, найденные за последние p_minutes, по числу учеников; плюс сводка урока
create or replace function vektor_teacher_pulse(p_token text, p_class text default null, p_minutes int default 45) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare uid int := vk_auth(p_token, 'teacher'); since timestamptz := now() - make_interval(mins => least(greatest(coalesce(p_minutes, 45), 5), 240));
  bugs jsonb; summary jsonb;
begin
  with sids as (select vk_teacher_sids(uid, p_class) id),
  found as (
    select e.data->>'bug' bug, s.login, s.state, max(e.ts_server) last
    from vk_events e join vk_students s on s.id = e.student_id
    where e.student_id in (select id from sids) and e.type = 'bug_found' and e.ts_server >= since and coalesce(e.data->>'bug', '') <> ''
    group by 1, 2, 3),
  agg as (
    select bug, count(*) n, jsonb_agg(login order by last desc) logins,
      count(*) filter (where state #>> array['bugs', bug, 'status'] in ('healing', 'beaten')) healing, max(last) last
    from found group by bug),
  pushes as (
    select distinct on (p.bug) p.bug, p.id, p.logins, p.created from vk_pushes p
    where p.teacher_id = uid and p.created >= since order by p.bug, p.created desc)
  select coalesce(jsonb_agg(jsonb_build_object('bug', a.bug, 'n', a.n, 'logins', a.logins, 'healing', a.healing,
      'push', case when p.id is null then null else jsonb_build_object('id', p.id, 'total', cardinality(p.logins),
        'done', (select count(distinct e.student_id) from vk_events e where e.type = 'push_done' and e.ts_server >= p.created and (e.data->>'push')::int = p.id),
        'ok', (select coalesce(jsonb_agg(distinct s.login), '[]') from vk_events e join vk_students s on s.id = e.student_id
               where e.type = 'push_done' and e.ts_server >= p.created and (e.data->>'push')::int = p.id and (e.data->>'ok')::boolean)) end)
    order by a.n desc, a.last desc), '[]') into bugs
  from agg a left join pushes p on p.bug = a.bug;

  with sids as (select vk_teacher_sids(uid, p_class) id),
  ev as (select * from vk_events where student_id in (select id from sids) and ts_server >= since),
  st as (select s.login, s.id,
      (select max(ts_server) from ev where ev.student_id = s.id and ev.type = 'attempt') last_try,
      (select max(ts_server) from ev where ev.student_id = s.id and ev.type = 'attempt' and (ev.data->>'ok')::boolean) last_ok,
      (select min(ts_server) from ev where ev.student_id = s.id and ev.type = 'attempt') first_try
    from vk_students s where s.id in (select id from sids))
  select jsonb_build_object(
    'tasks', (select count(*) from ev where type = 'attempt' and (data->>'ok')::boolean),
    'mastered', (select count(*) from ev where type = 'mastery'),
    'found', (select count(distinct (student_id, data->>'bug')) from ev where type = 'bug_found'),
    'healing', (select count(distinct (student_id, data->>'bug')) from ev where type = 'bug_step' and data->>'step' = 'twin' and (data->>'ok')::boolean),
    'beaten', (select count(distinct (student_id, data->>'bug')) from ev where type = 'bug_beaten'),
    'idle', (select coalesce(jsonb_agg(login order by id), '[]') from st where last_try is null),
    'stuck', (select coalesce(jsonb_agg(login order by id), '[]') from st
              where last_try >= now() - interval '3 minutes' and coalesce(last_ok, first_try) <= now() - interval '10 minutes')) into summary;

  return jsonb_build_object('since', extract(epoch from since)::bigint, 'bugs', bugs, 'summary', summary);
end $$;

-- Задача группе: учитель отправляет контрпример + задачу-двойник выбранным ученикам
drop function if exists vektor_teacher_push(text, text[], text, jsonb);
create or replace function vektor_teacher_push(p_token text, p_logins jsonb, p_bug text, p_payload jsonb) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare uid int := vk_auth(p_token, 'teacher'); ok text[]; pid int;
begin
  if coalesce(p_bug, '') !~ '^[a-z-]{2,40}:[a-z-]{2,60}$' then return jsonb_build_object('error', 'layout', 'message', 'Неизвестная ошибка'); end if;
  if length(coalesce(p_payload, '{}')::text) > 4000 then return jsonb_build_object('error', 'too_large', 'message', 'Слишком большое задание'); end if;
  select coalesce(array_agg(s.login), '{}') into ok from vk_students s
    where jsonb_typeof(coalesce(p_logins, '[]')) = 'array' and s.login = any(select vk_norm(x) from jsonb_array_elements_text(coalesce(p_logins, '[]')) x) and s.id in (select vk_teacher_sids(uid, null));
  if cardinality(ok) = 0 then return jsonb_build_object('error', 'forbidden', 'message', 'Нет таких учеников в ваших классах'); end if;
  insert into vk_pushes (teacher_id, logins, bug, payload, expires) values (uid, ok, p_bug, p_payload, now() + interval '20 minutes') returning id into pid;
  return jsonb_build_object('id', pid, 'logins', to_jsonb(ok));
end $$;

-- Ученик: есть ли для него свежая задача от учителя, которую он ещё не решал
create or replace function vektor_push_get(p_token text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare uid int := vk_auth(p_token, 'student'); lg text; p vk_pushes;
begin
  select login into lg from vk_students where id = uid;
  select * into p from vk_pushes x where lg = any(x.logins) and x.expires > now()
    and not exists (select 1 from vk_events e where e.student_id = uid and e.type = 'push_done' and (e.data->>'push')::int = x.id)
    order by x.created desc limit 1;
  if p.id is null then return jsonb_build_object('push', null); end if;
  return jsonb_build_object('push', jsonb_build_object('id', p.id, 'bug', p.bug, 'payload', p.payload));
end $$;

revoke execute on function vk_teacher_sids(int, text) from public, anon, authenticated;
grant execute on function vektor_teacher_pulse(text, text, int), vektor_teacher_push(text, jsonb, text, jsonb), vektor_push_get(text) to anon, authenticated;

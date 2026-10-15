-- «Вектор»: база для Supabase. Вставить целиком в Supabase → SQL Editor → Run.
-- Таблицы закрыты (RLS без политик): браузер не читает их напрямую, только вызывает функции ниже
-- по публичному ключу (anon). Функции сами проверяют сессию. Можно запускать повторно.

create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

create table if not exists vk_classes (
  id serial primary key, name text not null unique, grp text not null default 'pilot');
create table if not exists vk_students (
  id serial primary key, login text not null unique, pass_hash text not null,
  class_id int references vk_classes(id), label text, state jsonb, state_rev int not null default 0,
  fails int not null default 0, locked_until timestamptz, last_seen timestamptz);
create table if not exists vk_teachers (
  id serial primary key, login text not null unique, pass_hash text not null, name text not null default '',
  class_ids int[] not null default '{}', is_admin boolean not null default false,
  fails int not null default 0, locked_until timestamptz);
create table if not exists vk_sessions (
  token_hash text primary key, role text not null, user_id int not null, expires timestamptz not null);
create table if not exists vk_events (
  event_id text primary key, student_id int not null references vk_students(id) on delete cascade,
  type text not null, data jsonb, ts_client bigint, ts_server timestamptz not null default now());
create index if not exists vk_events_student on vk_events(student_id, ts_server);

alter table vk_classes enable row level security;
alter table vk_students enable row level security;
alter table vk_teachers enable row level security;
alter table vk_sessions enable row level security;
alter table vk_events enable row level security;
revoke all on vk_classes, vk_students, vk_teachers, vk_sessions, vk_events from anon, authenticated;

-- ---------- вспомогательные ----------

-- «  Ученик 1 » → «ученик1», ё → е
create or replace function vk_norm(s text) returns text language sql immutable as
$$ select replace(replace(lower(btrim(coalesce(s, ''))), 'ё', 'е'), ' ', '') $$;

create or replace function vk_new_session(p_role text, p_uid int) returns text
language plpgsql security definer set search_path = public, extensions as $$
declare t text := encode(gen_random_bytes(32), 'hex');
begin
  delete from vk_sessions where expires < now();
  insert into vk_sessions values (encode(digest(t, 'sha256'), 'hex'), p_role, p_uid, now() + interval '12 hours');
  return t;
end $$;

create or replace function vk_auth(p_token text, p_role text) returns int
language plpgsql security definer set search_path = public, extensions as $$
declare s vk_sessions;
begin
  select * into s from vk_sessions where token_hash = encode(digest(coalesce(p_token, ''), 'sha256'), 'hex');
  if s is null or s.expires < now() then raise exception 'no_session' using errcode = 'P0401'; end if;
  if s.role <> p_role then raise exception 'forbidden' using errcode = 'P0403'; end if;
  return s.user_id;
end $$;

-- Простые и безобидные слова для паролей (Ф-02)
create or replace function vk_password() returns text language sql volatile as $$
  select (array['зоолог','компас','ракета','дельфин','радуга','глобус','кактус','маяк','пингвин','вулкан',
    'фонарь','жираф','облако','планета','тюльпан','самокат','карандаш','медуза','кенгуру','черника',
    'парус','енот','комета','бублик','панда','секвойя','коала','лимон','капибара','носорог',
    'гитара','батут','звезда','орбита','кристалл','тигренок','арбуз','барсук','фламинго','лабиринт',
    'горизонт','ромашка','хомяк','изумруд','спутник','мандарин','бегемот','колибри','телескоп','аквариум'])[1 + floor(random() * 50)::int]
    || lpad(floor(random() * 10000)::int::text, 4, '0') $$;

-- ---------- ученик ----------

-- Вход (Ф-03): 5 ошибок подряд → блокировка на 5 минут
create or replace function vektor_login(p_login text, p_password text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare st vk_students; l text := vk_norm(p_login);
begin
  if l = '' or l ~ '[a-z]' then return jsonb_build_object('error', 'layout', 'message', 'Логин пишется русскими буквами — смени язык клавиатуры'); end if;
  select * into st from vk_students where login = l;
  if st is null then perform pg_sleep(0.3); return jsonb_build_object('error', 'bad_login', 'message', 'Неверный логин или пароль'); end if;
  if st.locked_until > now() then
    return jsonb_build_object('error', 'locked', 'message', 'Слишком много ошибок. Попробуй через '
      || ceil(extract(epoch from st.locked_until - now()) / 60)::int || ' мин. или попроси учителя сбросить пароль');
  end if;
  if st.pass_hash <> crypt(vk_norm(p_password), st.pass_hash) then
    update vk_students set fails = case when fails + 1 >= 5 then 0 else fails + 1 end,
      locked_until = case when fails + 1 >= 5 then now() + interval '5 minutes' else null end where id = st.id;
    return jsonb_build_object('error', 'bad_login', 'message', 'Неверный логин или пароль');
  end if;
  update vk_students set fails = 0, locked_until = null, last_seen = now() where id = st.id;
  return jsonb_build_object('token', vk_new_session('student', st.id), 'login', st.login, 'label', st.label,
    'state', st.state, 'rev', st.state_rev);
end $$;

create or replace function vektor_logout(p_token text) returns jsonb
language sql security definer set search_path = public, extensions as $$
  delete from vk_sessions where token_hash = encode(digest(coalesce(p_token, ''), 'sha256'), 'hex');
  select jsonb_build_object('ok', true) $$;

create or replace function vektor_state(p_token text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare uid int := vk_auth(p_token, 'student'); st vk_students;
begin
  select * into st from vk_students where id = uid;
  return jsonb_build_object('login', st.login, 'label', st.label, 'state', st.state, 'rev', st.state_rev);
end $$;

-- Сохранить прогресс и принять события; повтор того же id не создаёт дубль (Ф-08, Ф-09)
create or replace function vektor_sync(p_token text, p_state jsonb default null, p_events jsonb default '[]') returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare uid int := vk_auth(p_token, 'student'); r int; e jsonb; acc text[] := '{}';
begin
  if p_state is not null then
    if length(p_state::text) > 400000 then return jsonb_build_object('error', 'too_large', 'message', 'Прогресс слишком большой'); end if;
    update vk_students set state = p_state, state_rev = state_rev + 1, last_seen = now() where id = uid returning state_rev into r;
  end if;
  for e in select * from jsonb_array_elements(coalesce(p_events, '[]')) limit 200 loop
    continue when coalesce(e->>'id', '') !~ '^[A-Za-z0-9_-]{8,64}$' or coalesce(e->>'type', '') !~ '^[a-z_]{2,32}$'
      or length(coalesce(e->'data', 'null')::text) > 4000;
    insert into vk_events (event_id, student_id, type, data, ts_client)
      values (e->>'id', uid, e->>'type', e->'data', (e->>'ts')::bigint) on conflict (event_id) do nothing;
    acc := acc || (e->>'id');
  end loop;
  return jsonb_build_object('rev', r, 'accepted', to_jsonb(acc));
end $$;

-- ---------- учитель ----------

create or replace function vektor_teacher_login(p_login text, p_password text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare t vk_teachers;
begin
  select * into t from vk_teachers where login = lower(btrim(p_login));
  if t is null then perform pg_sleep(0.3); return jsonb_build_object('error', 'bad_login', 'message', 'Неверный логин или пароль'); end if;
  if t.locked_until > now() then return jsonb_build_object('error', 'locked', 'message', 'Слишком много ошибок, попробуйте через 5 минут'); end if;
  if t.pass_hash <> crypt(p_password, t.pass_hash) then
    update vk_teachers set fails = case when fails + 1 >= 5 then 0 else fails + 1 end,
      locked_until = case when fails + 1 >= 5 then now() + interval '5 minutes' else null end where id = t.id;
    return jsonb_build_object('error', 'bad_login', 'message', 'Неверный логин или пароль');
  end if;
  update vk_teachers set fails = 0, locked_until = null where id = t.id;
  return jsonb_build_object('token', vk_new_session('teacher', t.id), 'name', t.name);
end $$;

-- Сводка по ученикам своих классов (Ф-21, Ф-24)
create or replace function vektor_teacher_class(p_token text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare uid int := vk_auth(p_token, 'teacher'); t vk_teachers;
begin
  select * into t from vk_teachers where id = uid;
  return jsonb_build_object('students', coalesce((select jsonb_agg(jsonb_build_object(
      'login', s.login, 'label', s.label, 'class', c.name, 'last_seen', extract(epoch from s.last_seen)::bigint,
      'progress', coalesce(s.state->'progress', '{}'),
      'mastered', (select count(*) from jsonb_each(coalesce(s.state->'meta', '{}')) m where (m.value->>'mastered')::boolean),
      'failed_checks', (select coalesce(sum((m.value->>'failedChecks')::int), 0) from jsonb_each(coalesce(s.state->'meta', '{}')) m),
      'answers', coalesce((s.state->>'answers')::int, 0),
      'stars', coalesce((s.state->'game'->>'stars')::int, 0)) order by s.id)
    from vk_students s left join vk_classes c on c.id = s.class_id
    where t.is_admin or s.class_id = any(t.class_ids)), '[]'));
end $$;

-- ---------- администрирование (только из SQL Editor) ----------

-- Создать профили ученик1…ученикN и вернуть пароли — один раз, в базе остаётся только хеш (Ф-02).
-- select * from vk_seed(80, '5А:1-28,5Б:29-56,5В:57-80');
create or replace function vk_seed(p_count int, p_classes text default '')
returns table (login text, password text, class text)
language plpgsql security definer set search_path = public, extensions as $$
declare k int; p text; used text[] := '{}'; part text; cname text; a int; b int; cid int;
begin
  for k in 1..least(p_count, 500) loop
    if exists (select 1 from vk_students s where s.login = 'ученик' || k) then continue; end if;
    loop p := vk_password(); exit when not (p = any(used)); end loop;
    used := used || p;
    insert into vk_students (login, pass_hash) values ('ученик' || k, crypt(p, gen_salt('bf', 8)));
    login := 'ученик' || k; password := p; class := null; return next;
  end loop;
  foreach part in array string_to_array(coalesce(p_classes, ''), ',') loop
    continue when btrim(part) = '';
    cname := btrim(split_part(part, ':', 1)); a := split_part(split_part(part, ':', 2), '-', 1)::int; b := split_part(split_part(part, ':', 2), '-', 2)::int;
    insert into vk_classes (name) values (cname) on conflict (name) do nothing;
    select id into cid from vk_classes where name = cname;
    update vk_students s set class_id = cid where s.login in (select 'ученик' || g from generate_series(a, b) g);
  end loop;
end $$;

-- Добавить в вывод класс (удобно, если vk_seed уже вызван): select * from vk_seed_view;
create or replace view vk_seed_view as
  select s.login, c.name as class from vk_students s left join vk_classes c on c.id = s.class_id order by s.id;
revoke all on vk_seed_view from anon, authenticated;

-- Новый пароль ученику, прогресс сохраняется (Ф-06): select vk_reset('ученик17');
create or replace function vk_reset(p_login text) returns text
language plpgsql security definer set search_path = public, extensions as $$
declare p text := vk_password(); uid int;
begin
  update vk_students set pass_hash = crypt(p, gen_salt('bf', 8)), fails = 0, locked_until = null
    where login = vk_norm(p_login) returning id into uid;
  if uid is null then raise exception 'Нет ученика %', p_login; end if;
  update vk_sessions set expires = now() - interval '1 second' where role = 'student' and user_id = uid;
  return p;
end $$;

-- Учитель: select vk_teacher('uchitel', 'пароль-учителя', 'Мария Ивановна', '5А,5Б');
create or replace function vk_teacher(p_login text, p_password text, p_name text default '', p_classes text default '', p_admin boolean default false)
returns text language plpgsql security definer set search_path = public, extensions as $$
declare ids int[];
begin
  select coalesce(array_agg(id), '{}') into ids from vk_classes where name = any(string_to_array(replace(p_classes, ' ', ''), ','));
  insert into vk_teachers (login, pass_hash, name, class_ids, is_admin)
    values (lower(btrim(p_login)), crypt(p_password, gen_salt('bf', 8)), p_name, ids, p_admin)
    on conflict (login) do update set pass_hash = excluded.pass_hash, name = excluded.name, class_ids = excluded.class_ids,
      is_admin = excluded.is_admin, fails = 0, locked_until = null;
  return 'ok: ' || p_login;
end $$;

-- Открыть браузеру только функции для учеников и учителей
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function vektor_login(text, text), vektor_logout(text), vektor_state(text),
  vektor_sync(text, jsonb, jsonb), vektor_teacher_login(text, text), vektor_teacher_class(text) to anon, authenticated;

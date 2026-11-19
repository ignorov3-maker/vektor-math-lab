-- «Вектор»: песочница для команды — тестовые аккаунты, отдельно от боевых классов.
-- Выполнять после login_keys.sql (и после tools/demo/seed.sql, если нужен живой демо-класс). Можно запускать повторно.
--   select vk_sandbox_seed('общий-пароль');   -- один пароль у всех тестовых аккаунтов
--
-- Ученики (класс «Песочница»):
--   тест-новичок  — при каждом входе прогресс обнуляется: первый вход глазами ребёнка;
--   тест-прогресс — с готовым прогрессом и историей ошибок (копия лучшего бота демо-класса), изменения сохраняются;
--   тест1…тест5   — обычные чистые аккаунты, прогресс сохраняется.
-- Взрослые: тест-учитель (класс «Демо» с 25 ботами + «Песочница»), тест-репетитор (6 ботов + тест-прогресс, группа и задание),
--   тест-родитель (бот демо3 и тест-прогресс).
-- При входе тест-учителя, тест-репетитора и тест-родителя записанный урок ботов сдвигается к «сейчас» —
-- пульс и недельная сводка выглядят как живые. Пароль и логин у общих аккаунтов поменять из приложения нельзя.

alter table vk_students add column if not exists shared boolean not null default false;
alter table vk_students add column if not exists sandbox_reset boolean not null default false;
alter table vk_teachers add column if not exists shared boolean not null default false;
alter table vk_adults add column if not exists shared boolean not null default false;

-- Общий аккаунт не меняет пароль, логин и почту из приложения (только владелец из SQL Editor)
create or replace function vk_shared_guard() returns trigger language plpgsql security definer
set search_path = public, extensions as $$
begin
  if old.shared and session_user not in ('postgres', 'supabase_admin')
     and (new.pass_hash is distinct from old.pass_hash
       or (tg_table_name <> 'vk_adults' and new.login is distinct from old.login)) then
    raise exception 'Это общий тестовый аккаунт — пароль и логин здесь не меняются' using errcode = 'P0001';
  end if;
  return new;
end $$;
create or replace trigger vk_shared_guard before update on vk_students for each row execute function vk_shared_guard();
create or replace trigger vk_shared_guard before update on vk_teachers for each row execute function vk_shared_guard();
create or replace function vk_shared_guard_adult() returns trigger language plpgsql security definer
set search_path = public, extensions as $$
begin
  if old.shared and session_user not in ('postgres', 'supabase_admin')
     and (new.pass_hash is distinct from old.pass_hash or new.email is distinct from old.email) then
    raise exception 'Это общий тестовый аккаунт — пароль и логин здесь не меняются' using errcode = 'P0001';
  end if;
  return new;
end $$;
create or replace trigger vk_shared_guard before update on vk_adults for each row execute function vk_shared_guard_adult();

-- Обнулить ученика-песочницу: прогресс, события, вопросы к ИИ, тесты
create or replace function vk_sandbox_reset(p_student int) returns int language plpgsql security definer
set search_path = public, extensions as $$
declare rev int;
begin
  delete from vk_events where student_id = p_student;
  delete from vk_ai_usage where student_id = p_student;
  delete from vk_ai_questions where student_id = p_student;
  delete from vk_test_answers where student_id = p_student;
  delete from vk_test_done where student_id = p_student;
  update vk_students set state = null, state_rev = state_rev + 1, fails = 0, locked_until = null where id = p_student returning state_rev into rev;
  return rev;
end $$;

-- Записанный урок ботов и история тест-прогресса — к текущему моменту (последнее событие минуту назад)
create or replace function vk_sandbox_refresh() returns void language plpgsql security definer
set search_path = public, extensions as $$
declare ids int[]; delta interval;
begin
  select array_agg(s.id) into ids from vk_students s left join vk_classes c on c.id = s.class_id
    where c.name = 'Демо' or s.login = 'тест-прогресс';
  if ids is null then return; end if;
  select now() - interval '1 minute' - max(ts_server) into delta from vk_events where student_id = any(ids);
  if delta is null or delta < interval '5 minutes' then return; end if;
  update vk_events set ts_server = ts_server + delta where student_id = any(ids);
  update vk_students set last_seen = now() where id = any(ids) and login <> 'тест-прогресс';
end $$;

create or replace function vk_sandbox_on_session() returns trigger language plpgsql security definer
set search_path = public, extensions as $$
begin
  if (new.role = 'teacher' and exists (select 1 from vk_teachers where id = new.user_id and shared))
     or (new.role in ('parent', 'tutor') and exists (select 1 from vk_adults where id = new.user_id and shared)) then
    perform vk_sandbox_refresh();
  end if;
  return new;
end $$;
create or replace trigger vk_sandbox_on_session after insert on vk_sessions for each row execute function vk_sandbox_on_session();

-- Вход ученика: тест-новичок при каждом входе начинает с нуля (поверх версии из security_fix.sql)
create or replace function vektor_login(p_login text, p_password text, p_device text default null) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare r jsonb; l text := vk_norm(p_login); st vk_students;
begin
  if not vk_guard_start(p_device) then return jsonb_build_object('error','too_many','message','Слишком много попыток. Попробуй через 10 минут'); end if;
  if vk_login_blocked(l, 'student') then
    perform vk_guard_log(l, p_device, false);
    return jsonb_build_object('error','locked','message','Слишком много ошибок. Попробуй через 5 минут или попроси учителя сбросить пароль');
  end if;
  update vk_students set fails = 0, locked_until = null where login = l and (fails > 0 or locked_until is not null);
  r := vk_login_legacy(p_login, p_password);
  update vk_students set fails = 0, locked_until = null where login = l and (fails > 0 or locked_until is not null);
  if r ? 'token' then
    select * into st from vk_students where login = l;
    if st.sandbox_reset then r := r || jsonb_build_object('state', null, 'rev', vk_sandbox_reset(st.id)); end if;
  end if;
  perform vk_guard_log(l, p_device, r ? 'token');
  return r;
end $$;

-- Вход по QR-коду — то же правило (поверх версии из login_keys.sql)
create or replace function vektor_key_login(p_key text, p_device text default null) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare k vk_login_keys; st vk_students; t vk_teachers; a vk_adults;
begin
  if not vk_guard_start(p_device) then return jsonb_build_object('error', 'too_many', 'message', 'Слишком много попыток. Попробуй через 10 минут'); end if;
  if coalesce(p_key, '') ~ '^[0-9a-f]{32}$' then
    select * into k from vk_login_keys where key_hash = encode(digest(p_key, 'sha256'), 'hex');
  end if;
  if k.key_hash is null then
    perform vk_guard_log('qr-key', p_device, false);
    return jsonb_build_object('error', 'bad_login', 'message', 'QR-код больше не действует — попроси новую бумажку');
  end if;
  if k.role = 'student' then
    if (select sandbox_reset from vk_students where id = k.user_id) then perform vk_sandbox_reset(k.user_id); end if;
    update vk_students set last_seen = now(), fails = 0, locked_until = null where id = k.user_id returning * into st;
    perform vk_guard_log(st.login, p_device, true);
    return jsonb_build_object('role', 'student', 'token', vk_new_session('student', st.id), 'login', st.login, 'label', st.label,
      'state', st.state, 'rev', st.state_rev);
  elsif k.role = 'teacher' then
    select * into t from vk_teachers where id = k.user_id;
    perform vk_guard_log(t.login, p_device, true, 'teacher');
    return jsonb_build_object('role', 'teacher', 'token', vk_new_session('teacher', t.id), 'name', t.name, 'login', t.login);
  else
    select * into a from vk_adults where id = k.user_id and role = k.role;
    if a.id is null then return jsonb_build_object('error', 'bad_login', 'message', 'QR-код больше не действует — попроси новую бумажку'); end if;
    perform vk_guard_log(a.email, p_device, true, a.role);
    return jsonb_build_object('role', a.role, 'token', vk_new_session(a.role, a.id), 'name', a.name);
  end if;
end $$;

-- Создать или пересоздать песочницу. Только владелец.
create or replace function vk_sandbox_seed(p_password text) returns text
language plpgsql security definer set search_path = public, extensions as $$
declare cid int; demo int; sid int; src int; tid int; pid int; gid int; aid int; k int; topic text; h text := crypt(p_password, gen_salt('bf', 8));
begin
  if length(coalesce(p_password, '')) < 8 then return 'нужен пароль от 8 символов'; end if;
  insert into vk_classes (name) values ('Песочница') on conflict (name) do nothing;
  select id into cid from vk_classes where name = 'Песочница';
  select id into demo from vk_classes where name = 'Демо';
  for k in 0..6 loop
    insert into vk_students (login, pass_hash, class_id, label, shared, sandbox_reset)
      values (case k when 0 then 'тест-новичок' when 1 then 'тест-прогресс' else 'тест' || (k - 1) end, h, cid,
              case k when 0 then 'Новичок (сброс при входе)' when 1 then 'С прогрессом' else 'Тестер ' || (k - 1) end, true, k = 0)
      on conflict (login) do update set pass_hash = h, class_id = cid, label = excluded.label, shared = true, sandbox_reset = excluded.sandbox_reset,
        fails = 0, locked_until = null;
  end loop;
  -- тест-прогресс: прогресс и история лучшего бота демо-класса
  select id into sid from vk_students where login = 'тест-прогресс';
  select s.id into src from vk_students s where s.class_id = demo and s.state is not null
    order by (select count(*) from vk_events e where e.student_id = s.id) desc limit 1;
  perform vk_sandbox_reset(sid);
  if src is not null then
    update vk_students set state = (select state from vk_students where id = src), state_rev = state_rev + 1 where id = sid;
    insert into vk_events (event_id, student_id, type, data, ts_client, ts_server)
      select 'sbx' || md5(event_id), sid, type, data, ts_client, ts_server from vk_events where student_id = src
      on conflict (event_id) do nothing;
  end if;
  perform vk_teacher('тест-учитель', p_password, 'Тест-учитель', 'Демо,Песочница');
  update vk_teachers set shared = true where login = 'тест-учитель';
  -- репетитор и родитель
  insert into vk_adults (role, email, pass_hash, name, email_verified_at, shared) values
    ('tutor', 'тест-репетитор', h, 'Тест-репетитор', now(), true), ('parent', 'тест-родитель', h, 'Тест-родитель', now(), true)
    on conflict (email) do update set pass_hash = h, role = excluded.role, name = excluded.name, shared = true, fails = 0, locked_until = null;
  select id into tid from vk_adults where email = 'тест-репетитор';
  select id into pid from vk_adults where email = 'тест-родитель';
  delete from vk_links where adult_id in (tid, pid);
  delete from vk_tutor_assignments where tutor_id = tid; delete from vk_tutor_groups where tutor_id = tid;
  insert into vk_links (student_id, adult_id, kind)
    select id, tid, 'tutor' from vk_students where login in ('демо1','демо2','демо3','демо4','демо5','демо6','тест-прогресс')
    union all select id, pid, 'parent' from vk_students where login in ('демо3', 'тест-прогресс')
    on conflict do nothing;
  insert into vk_tutor_groups (tutor_id, name) values (tid, 'Группа А') returning id into gid;
  insert into vk_tutor_group_members (group_id, student_id) select gid, id from vk_students where login in ('демо1','демо2','демо3','демо4');
  select case when value ? 'reduce' then 'reduce' when jsonb_typeof(value) = 'array' then value->>0
              else (select min(tk) from jsonb_object_keys(value) tk) end into topic from vk_settings where key = 'assignment_topics';
  if topic is not null then
    insert into vk_tutor_assignments (tutor_id, topic, due) values (tid, topic, now() + interval '7 days') returning id into aid;
    insert into vk_tutor_assignment_members (assignment_id, student_id) select aid, student_id from vk_tutor_group_members where group_id = gid;
  end if;
  perform vk_sandbox_refresh();
  return 'ok: «Песочница» — тест-новичок, тест-прогресс, тест1…тест5; тест-учитель, тест-репетитор, тест-родитель';
end $$;

revoke execute on function vk_shared_guard(), vk_shared_guard_adult(), vk_sandbox_reset(int), vk_sandbox_refresh(), vk_sandbox_on_session(),
  vk_sandbox_seed(text) from public, anon, authenticated;
revoke execute on function vektor_login(text, text, text), vektor_key_login(text, text) from public;
grant execute on function vektor_login(text, text, text), vektor_key_login(text, text) to anon, authenticated;

-- «Вектор»: вход по QR-коду. На бумажке — ссылка с ключом (#k=…), камера телефона открывает её, и человек сразу в своём кабинете.
-- Ключ — 128 случайных бит, в базе только его хеш. Один ключ на аккаунт; новый пароль (учитель, родитель, владелец) гасит ключ.
-- Выполнять после pilot_adults.sql. Можно запускать повторно.
create table if not exists vk_login_keys (
  key_hash text primary key,
  role text not null check (role in ('student', 'teacher', 'parent', 'tutor')),
  user_id int not null,
  created timestamptz not null default now(),
  unique (role, user_id));
alter table vk_login_keys enable row level security;
revoke all on vk_login_keys from public, anon, authenticated;

-- Выдать ключ (старый перестаёт работать). Только владелец, из SQL Editor.
create or replace function vk_login_key(p_role text, p_login text) returns text
language plpgsql security definer set search_path = public, extensions as $$
declare uid int; k text := encode(gen_random_bytes(16), 'hex');
begin
  if p_role = 'student' then select id into uid from vk_students where login = vk_norm(p_login);
  elsif p_role = 'teacher' then select id into uid from vk_teachers where login = lower(btrim(p_login));
  elsif p_role in ('parent', 'tutor') then select id into uid from vk_adults where email = lower(btrim(p_login)) and role = p_role;
  else raise exception 'role: student, teacher, parent или tutor'; end if;
  if uid is null then raise exception 'нет аккаунта % %', p_role, p_login; end if;
  delete from vk_login_keys where role = p_role and user_id = uid;
  insert into vk_login_keys (key_hash, role, user_id) values (encode(digest(k, 'sha256'), 'hex'), p_role, uid);
  return k;
end $$;

-- Вход по ключу из браузера.
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

-- Новый пароль гасит QR-код этого аккаунта
create or replace function vk_login_keys_revoke() returns trigger language plpgsql security definer
set search_path = public, extensions as $$
begin
  if new.pass_hash is distinct from old.pass_hash then
    if tg_table_name = 'vk_students' then delete from vk_login_keys where user_id = new.id and role = 'student';
    elsif tg_table_name = 'vk_teachers' then delete from vk_login_keys where user_id = new.id and role = 'teacher';
    else delete from vk_login_keys where user_id = new.id and role in ('parent', 'tutor'); end if;
  end if;
  return new;
end $$;
drop trigger if exists vk_login_keys_revoke on vk_students;
create trigger vk_login_keys_revoke after update of pass_hash on vk_students for each row execute function vk_login_keys_revoke();
drop trigger if exists vk_login_keys_revoke on vk_teachers;
create trigger vk_login_keys_revoke after update of pass_hash on vk_teachers for each row execute function vk_login_keys_revoke();
drop trigger if exists vk_login_keys_revoke on vk_adults;
create trigger vk_login_keys_revoke after update of pass_hash on vk_adults for each row execute function vk_login_keys_revoke();

revoke execute on function vk_login_key(text, text), vk_login_keys_revoke(), vektor_key_login(text, text) from public, anon, authenticated;
grant execute on function vektor_key_login(text, text) to anon, authenticated;

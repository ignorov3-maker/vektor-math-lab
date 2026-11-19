-- «Вектор»: взрослые аккаунты пилота без регистрации — логин и пароль на бумажке, как у учеников.
-- Почта не нужна: в поле email хранится простой логин («родитель12»), он уже подтверждён.
-- Выполнять после accounts.sql. Можно запускать повторно. Функции только для владельца (SQL Editor).

-- Создать или обновить родителя/репетитора. Возвращает пароль (новый — только если аккаунта не было или p_reset).
create or replace function vk_adult(p_login text, p_role text, p_name text default '', p_reset boolean default false)
returns text language plpgsql security definer set search_path = public, extensions as $$
declare l text := lower(btrim(p_login)); pw text; ex int;
begin
  if p_role not in ('parent', 'tutor') then raise exception 'role: parent или tutor'; end if;
  if l !~ '^[a-zа-яё0-9._@-]{3,254}$' then raise exception 'login: 3+ буквы или цифры'; end if;
  select id into ex from vk_adults where email = l;
  if ex is not null and not p_reset then return null; end if;
  pw := vk_password();
  insert into vk_adults (role, email, pass_hash, name, email_verified_at)
    values (p_role, l, crypt(pw, gen_salt('bf', 8)), coalesce(p_name, ''), now())
    on conflict (email) do update set pass_hash = excluded.pass_hash, role = excluded.role, name = excluded.name,
      email_verified_at = coalesce(vk_adults.email_verified_at, now()), fails = 0, locked_until = null;
  return pw;
end $$;

-- Привязать ученика ко взрослому по логинам (то же, что код из профиля ученика).
create or replace function vk_adult_link_login(p_adult text, p_student text) returns boolean
language plpgsql security definer set search_path = public, extensions as $$
declare a vk_adults; sid int;
begin
  select * into a from vk_adults where email = lower(btrim(p_adult));
  select id into sid from vk_students where login = vk_norm(p_student);
  if a.id is null or sid is null then return false; end if;
  insert into vk_links (student_id, adult_id, kind) values (sid, a.id, a.role) on conflict do nothing;
  return true;
end $$;

revoke execute on function vk_adult(text, text, text, boolean), vk_adult_link_login(text, text) from public, anon, authenticated;

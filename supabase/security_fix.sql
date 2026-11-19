-- «Вектор»: исправления по аудиту безопасности. Выполнять после всех остальных файлов supabase/ (последним). Можно запускать повторно.
--
-- 1. Настоящий адрес клиента. Раньше брался первый адрес из X-Forwarded-For — его присылает сам браузер,
--    поэтому лимит «30 ошибок с одного адреса» обходился подделкой заголовка. Теперь — адрес, который
--    выставляет сеть Supabase (cf-connecting-ip / x-real-ip), иначе последний адрес в цепочке.
create or replace function vk_ip_hash() returns text language plpgsql stable security definer
set search_path = public, extensions as $$
declare h jsonb; ip text; salt text; parts text[];
begin
  h := coalesce(nullif(current_setting('request.headers', true), '')::jsonb, '{}');
  ip := nullif(btrim(coalesce(h->>'cf-connecting-ip', '')), '');
  if ip is null then ip := nullif(btrim(coalesce(h->>'x-real-ip', '')), ''); end if;
  if ip is null then
    parts := string_to_array(coalesce(h->>'x-forwarded-for', ''), ',');
    ip := nullif(btrim(coalesce(parts[array_length(parts, 1)], '')), '');
  end if;
  if ip is null then return null; end if;
  select value->>'salt' into salt from vk_settings where key = 'login_guard';
  return encode(digest(salt || ':' || ip, 'sha256'), 'hex');
end $$;

-- 2. Блокировка входа. Раньше 5 неверных паролей от кого угодно запирали аккаунт на 5 минут —
--    зная логин «ученик7» или «uchitel», посторонний мог не пускать ребёнка или учителя на урок.
--    Теперь: 5 ошибок по аккаунту с одного адреса — пауза только для этого адреса;
--    50 ошибок по аккаунту за час со всех адресов — общая пауза (защита от перебора с многих адресов).
create or replace function vk_login_blocked(p_login text, p_role text) returns boolean language sql stable security definer
set search_path = public, extensions as $$
  select (select count(*) from vk_login_attempts where login = p_login and actor_role = p_role and not ok
            and ip_hash is not distinct from vk_ip_hash() and ts > clock_timestamp() - interval '5 minutes') >= 5
      or (select count(*) from vk_login_attempts where login = p_login and actor_role = p_role and not ok
            and ts > clock_timestamp() - interval '1 hour') >= 50 $$;
create index if not exists vk_login_attempts_login on vk_login_attempts(login, ts) where not ok;

create or replace function vektor_login(p_login text, p_password text, p_device text default null) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare r jsonb; l text := vk_norm(p_login);
begin
  if not vk_guard_start(p_device) then return jsonb_build_object('error','too_many','message','Слишком много попыток. Попробуй через 10 минут'); end if;
  if vk_login_blocked(l, 'student') then
    perform vk_guard_log(l, p_device, false);
    return jsonb_build_object('error','locked','message','Слишком много ошибок. Попробуй через 5 минут или попроси учителя сбросить пароль');
  end if;
  update vk_students set fails = 0, locked_until = null where login = l and (fails > 0 or locked_until is not null);
  r := vk_login_legacy(p_login, p_password);
  update vk_students set fails = 0, locked_until = null where login = l and (fails > 0 or locked_until is not null);
  perform vk_guard_log(l, p_device, r ? 'token');
  return r;
end $$;

create or replace function vektor_teacher_login(p_login text, p_password text, p_device text default null) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare r jsonb; l text := lower(btrim(p_login));
begin
  if not vk_guard_start(p_device) then return jsonb_build_object('error','too_many','message','Слишком много попыток. Попробуйте через 10 минут'); end if;
  if vk_login_blocked(l, 'teacher') then
    perform vk_guard_log(l, p_device, false, 'teacher');
    return jsonb_build_object('error','locked','message','Слишком много ошибок, попробуйте через 5 минут');
  end if;
  update vk_teachers set fails = 0, locked_until = null where login = l and (fails > 0 or locked_until is not null);
  r := vk_teacher_login_legacy(p_login, p_password);
  update vk_teachers set fails = 0, locked_until = null where login = l and (fails > 0 or locked_until is not null);
  perform vk_guard_log(l, p_device, r ? 'token', 'teacher');
  return r;
end $$;

-- 3. Синхронизация: ученик не может подделать служебные события и не может забить базу.
--    «ai_flag» пишет только сервер ИИ; «push_done» — только по задаче, которую учитель отправил этому ученику;
--    не больше 3000 событий в сутки на ученика.
create or replace function vektor_sync(p_token text, p_state jsonb default null, p_events jsonb default '[]') returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare uid int := vk_auth(p_token, 'student'); r int; e jsonb; acc text[] := '{}'; lg text; room int;
begin
  if coalesce((select value='true'::jsonb from vk_settings where key='maintenance'),false) then return jsonb_build_object('error','maintenance','message','Технические работы — прогресс остаётся на устройстве');end if;
  if p_state is not null then
    if length(p_state::text) > 400000 then return jsonb_build_object('error', 'too_large', 'message', 'Прогресс слишком большой'); end if;
    p_state := p_state #- '{settings,name}'; -- имя, которое ребёнок мог вписать, на сервер не попадает
    update vk_students set state = p_state, state_rev = state_rev + 1, last_seen = now() where id = uid returning state_rev into r;
  end if;
  select login into lg from vk_students where id = uid;
  room := greatest(0, 3000 - (select count(*) from vk_events where student_id = uid and ts_server > now() - interval '1 day'))::int;
  for e in select * from jsonb_array_elements(coalesce(p_events, '[]')) limit 200 loop
    continue when coalesce(e->>'id', '') !~ '^[A-Za-z0-9_-]{8,64}$' or coalesce(e->>'type', '') !~ '^[a-z_]{2,32}$'
      or length(coalesce(e->'data', 'null')::text) > 4000;
    if e->>'type' = 'ai_flag'
       or (e->>'type' = 'push_done' and not exists (select 1 from vk_pushes p where p.id::text = e->'data'->>'push' and lg = any(p.logins)
                                                     and p.created > now() - interval '1 day')) then
      acc := acc || (e->>'id'); continue;  -- принимаем, чтобы клиент не слал повторно, но не записываем
    end if;
    if room <= 0 then acc := acc || (e->>'id'); continue; end if;
    insert into vk_events (event_id, student_id, type, data, ts_client)
      values (e->>'id', uid, e->>'type', e->'data', case when e->>'ts' ~ '^[0-9]{1,15}$' then (e->>'ts')::bigint end) on conflict (event_id) do nothing;
    if found then room := room - 1; end if;
    acc := acc || (e->>'id');
  end loop;
  return jsonb_build_object('rev', r, 'accepted', to_jsonb(acc));
end $$;

-- 4. Свой логин ученика не может выглядеть как выданный («ученик12»): иначе учитель путает детей
--    в кабинете, а новый ученик при выдаче логинов получит чужой номер.
create or replace function vektor_student_set_login(p_token text,p_login text) returns jsonb language plpgsql security definer
set search_path=public,extensions as $$ declare uid int:=vk_auth(p_token,'student'); l text:=lower(btrim(p_login)); begin
  if l !~ '^[a-zа-яё0-9]{3,24}$' then return jsonb_build_object('error','login','message','Логин: 3–24 буквы или цифры'); end if;
  l:=vk_norm(l);
  if l ~ '^(ученик|uchenik|student)[0-9]*$' then return jsonb_build_object('error','login','message','Такой логин выдаёт школа — придумай свой'); end if;
  update vk_students set login=l where id=uid;
  return jsonb_build_object('ok',true,'login',l);
exception when unique_violation then return jsonb_build_object('error','login','message','Этот логин уже занят'); end $$;

-- 5. Карточка ученика у учителя: счётчики ошибок — только числа (раньше туда можно было подложить HTML).
create or replace function vk_int_map(j jsonb) returns jsonb language sql immutable
set search_path = public, extensions as $$
  select coalesce(jsonb_object_agg(k, (v #>> '{}')::int), '{}') from jsonb_each(case when jsonb_typeof(j) = 'object' then j else '{}' end) x(k, v)
  where k ~ '^[a-z0-9-]{1,60}$' and jsonb_typeof(v) = 'number' and (v #>> '{}') ~ '^[0-9]{1,6}$' $$;
do $$ declare src text; begin
  select pg_get_functiondef('vektor_teacher_student(text,text)'::regprocedure) into src;
  if position('vk_int_map(m.value->''errors'')' in src) = 0 then
    src := replace(src, '''errors'', coalesce(m.value->''errors'', ''{}'')', '''errors'', vk_int_map(m.value->''errors'')');
    if position('vk_int_map(m.value->''errors'')' in src) = 0 then raise exception 'vektor_teacher_student: не найдено место для правки'; end if;
    execute src;
  end if;
end $$;

revoke execute on function vk_ip_hash(), vk_login_blocked(text, text), vk_int_map(jsonb) from public, anon, authenticated;
revoke execute on function vektor_login(text,text,text), vektor_teacher_login(text,text,text), vektor_sync(text,jsonb,jsonb),
  vektor_student_set_login(text,text), vektor_teacher_student(text,text) from public;
grant execute on function vektor_login(text,text,text), vektor_teacher_login(text,text,text), vektor_sync(text,jsonb,jsonb),
  vektor_student_set_login(text,text), vektor_teacher_student(text,text) to anon, authenticated;

-- 6. Класс сидит за одним школьным адресом: 30 опечаток за 10 минут на весь класс — реально в начале урока.
--    Поднимаем общий лимит с адреса до 120; перебор по одному аккаунту всё равно ограничен пунктом 2.
update vk_settings set value = jsonb_set(value, '{ip_limit}', '120') where key = 'login_guard' and (value->>'ip_limit')::int < 120;

-- «Вектор»: исправления перед пилотом (план приёмки, блокеры 1, 2, 5 и проверка дробей).
-- Выполнять после test.sql, security_fix.sql и остальных файлов. Можно запускать повторно.
--
-- 1. Прогресс школа/дом: vektor_sync принимает p_base_rev. Если на сервере уже другая ревизия
--    (ученик успел позаниматься на другом устройстве), состояние не перезаписывается: сервер
--    возвращает conflict, свою ревизию и своё состояние, браузер сливает и присылает снова.
-- 2. Сдача теста: успех — только если сдача реально записана (status: accepted). Закрытый тест
--    отвечает status: closed. Автосдача по таймеру принимается ещё 2 минуты после конца времени,
--    если тест не закрыл учитель вручную.
-- 3. vektor_state сообщает класс из ведомости: 6А → 6 класс с первого входа.
-- 4. Проверка дробей в тесте — точная: 50000/100001 больше не равно 1/2.

-- ---------- 4. точная дробь ----------
-- «3/4», «-3/4», «2 1/3», «5» → {числитель, знаменатель > 0}; null — не прочитано или знаменатель 0
create or replace function vk_frac_q(s text) returns numeric[] language plpgsql immutable as $$
declare t text := regexp_replace(btrim(replace(coalesce(s, ''), '−', '-')), '\s+', ' ', 'g'); m text[];
begin
  if t ~ '^-?\d+$' then return array[t::numeric, 1]; end if;
  m := regexp_match(t, '^(-?\d+)\s*/\s*(-?\d+)$');
  if m is not null then
    if m[2]::numeric = 0 then return null; end if;
    return array[m[1]::numeric * sign(m[2]::numeric), abs(m[2]::numeric)];
  end if;
  m := regexp_match(t, '^(-?)(\d+) (\d+)\s*/\s*(\d+)$');
  if m is not null then
    if m[4]::numeric = 0 then return null; end if;
    return array[(m[2]::numeric * m[4]::numeric + m[3]::numeric) * (case when m[1] = '-' then -1 else 1 end), m[4]::numeric];
  end if;
  return null;
end $$;

create or replace function vk_test_ok(p_input text, p_rule text, p_answer text) returns boolean language plpgsql immutable as $$
declare t text := regexp_replace(btrim(coalesce(p_input, '')), '\s+', ' ', 'g'); q numeric[] := vk_frac_q(t); a numeric[] := vk_frac_q(p_answer); m text[];
begin
  if p_rule = 'sign' then return t = p_answer; end if;
  if q is null or a is null or q[1] * a[2] <> a[1] * q[2] then return false; end if;
  if p_rule = 'simplest' then
    m := regexp_match(t, '(\d+)\s*/\s*(\d+)$');
    return m is null or gcd(m[1]::numeric, m[2]::numeric) = 1;
  end if;
  if p_rule = 'mixed' then
    m := regexp_match(t, '^(\d+) (\d+)\s*/\s*(\d+)$');
    return m is not null and m[2]::numeric < m[3]::numeric;
  end if;
  return true;
end $$;
revoke execute on function vk_frac_q(text), vk_test_ok(text, text, text) from public, anon, authenticated;

-- ---------- 2. сдача теста ----------
alter table vk_tests add column if not exists closed_early boolean not null default false;

-- Тест, в который ещё можно сохранить ответ и сдать: открыт, либо время вышло меньше 2 минут назад
-- и учитель не закрывал его вручную (автосдача по таймеру не теряется на последней секунде)
create or replace function vk_finishable_test(p_uid int) returns vk_tests
language sql stable security definer set search_path = public as $$
  select t.* from vk_tests t join vk_students s on s.class_id = t.class_id
  where s.id = p_uid and t.opened_at is not null
    and (t.closes_at > now() or (not t.closed_early and t.closes_at > now() - interval '2 minutes'))
    and not exists (select 1 from vk_test_done d where d.student_id = p_uid and d.phase = t.phase)
  order by t.opened_at desc limit 1 $$;
revoke execute on function vk_finishable_test(int) from public, anon, authenticated;

create or replace function vektor_test_answer(p_token text, p_n int, p_answer text, p_sec int default null) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare uid int := vk_auth(p_token, 'student'); t vk_tests := vk_finishable_test(uid); it vk_test_items;
begin
  if t.class_id is null then return jsonb_build_object('error', 'closed', 'status', 'closed', 'message', 'Тест уже закрыт — этот ответ не записан'); end if;
  select * into it from vk_test_items where form = t.form and n = p_n;
  if it.n is null then return jsonb_build_object('error', 'bad_item', 'message', 'Нет такого задания'); end if;
  insert into vk_test_answers (student_id, phase, n, answer, ok, sec)
    values (uid, t.phase, p_n, left(p_answer, 40), vk_test_ok(left(p_answer, 40), it.rule, it.answer), p_sec)
    on conflict (student_id, phase, n) do update set answer = excluded.answer, ok = excluded.ok, sec = excluded.sec, at = now();
  return jsonb_build_object('ok', true, 'status', 'saved');
end $$;

-- Ответ: status accepted — сдача записана (в том числе повторный вызов после обрыва или двойное нажатие);
-- status closed — тест закрыт, сдачи нет. Сколько ответов успело сохраниться — в saved.
create or replace function vektor_test_finish(p_token text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare uid int := vk_auth(p_token, 'student'); t vk_tests := vk_finishable_test(uid); last vk_tests; sc int; tot int; d vk_test_done;
begin
  if t.class_id is null then
    select t2.* into last from vk_tests t2 join vk_students s on s.class_id = t2.class_id
      where s.id = uid and t2.opened_at is not null order by t2.opened_at desc limit 1;
    select * into d from vk_test_done where student_id = uid and phase = last.phase;
    if d.student_id is not null then
      return jsonb_build_object('ok', true, 'status', 'accepted', 'already', true, 'answered', (select count(*) from vk_test_answers a where a.student_id = uid and a.phase = d.phase), 'total', d.total);
    end if;
    return jsonb_build_object('error', 'closed', 'status', 'closed', 'message', 'Тест уже закрыт — сдача не записана. Скажи учителю.',
      'saved', (select count(*) from vk_test_answers a where a.student_id = uid and a.phase = last.phase));
  end if;
  select count(*) into tot from vk_test_items where form = t.form;
  select count(*) into sc from vk_test_answers where student_id = uid and phase = t.phase and ok;
  insert into vk_test_done (student_id, phase, form, score, total) values (uid, t.phase, t.form, sc, tot) on conflict do nothing;
  return jsonb_build_object('ok', true, 'status', 'accepted', 'answered', (select count(*) from vk_test_answers a where a.student_id = uid and a.phase = t.phase), 'total', tot);
end $$;

-- Учитель закрыл тест вручную — без 2 минут на досдачу
create or replace function vektor_teacher_test(p_token text, p_class text, p_phase text, p_open boolean, p_minutes int default 40)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare uid int := vk_auth(p_token, 'teacher'); tr vk_teachers; cid int; f char(1);
begin
  select * into tr from vk_teachers where id = uid;
  select id into cid from vk_classes where name = p_class;
  if cid is null or not (tr.is_admin or cid = any(tr.class_ids)) then return jsonb_build_object('error', 'forbidden', 'message', 'Нет доступа к классу'); end if;
  if p_phase not in ('pre', 'post') then return jsonb_build_object('error', 'bad_phase', 'message', 'pre или post'); end if;
  f := case when (cid % 2 = 1) = (p_phase = 'pre') then 'A' else 'B' end;
  insert into vk_tests (class_id, phase, form) values (cid, p_phase, f) on conflict (class_id, phase) do nothing;
  if p_open then
    update vk_tests set opened_at = now(), closes_at = now() + make_interval(mins => least(greatest(p_minutes, 5), 90)), closed_early = false where class_id = cid and phase = p_phase;
  else
    update vk_tests set closes_at = least(closes_at, now()), closed_early = true where class_id = cid and phase = p_phase;
  end if;
  return jsonb_build_object('ok', true, 'form', f);
end $$;

-- ---------- 1. прогресс без перезаписи ----------
drop function if exists vektor_sync(text, jsonb, jsonb);
create or replace function vektor_sync(p_token text, p_state jsonb default null, p_events jsonb default '[]', p_base_rev int default null) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare uid int := vk_auth(p_token, 'student'); r int; e jsonb; acc text[] := '{}'; lg text; room int; cur_rev int; cur_state jsonb; conflict boolean := false;
begin
  if coalesce((select value = 'true'::jsonb from vk_settings where key = 'maintenance'), false) then return jsonb_build_object('error', 'maintenance', 'message', 'Технические работы — прогресс остаётся на устройстве'); end if;
  if p_state is not null then
    if length(p_state::text) > 400000 then return jsonb_build_object('error', 'too_large', 'message', 'Прогресс слишком большой'); end if;
    select state_rev, state into cur_rev, cur_state from vk_students where id = uid for update;
    -- p_base_rev не передан — старый клиент: пишем как раньше
    if p_base_rev is not null and p_base_rev is distinct from cur_rev then
      conflict := true;
    else
      p_state := p_state #- '{settings,name}';
      update vk_students set state = p_state, state_rev = state_rev + 1, last_seen = now() where id = uid returning state_rev into r;
    end if;
  end if;
  select login into lg from vk_students where id = uid;
  room := greatest(0, 3000 - (select count(*) from vk_events where student_id = uid and ts_server > now() - interval '1 day'))::int;
  for e in select * from jsonb_array_elements(coalesce(p_events, '[]')) limit 200 loop
    continue when coalesce(e->>'id', '') !~ '^[A-Za-z0-9_-]{8,64}$' or coalesce(e->>'type', '') !~ '^[a-z_]{2,32}$'
      or length(coalesce(e->'data', 'null')::text) > 4000;
    if e->>'type' = 'ai_flag'
       or (e->>'type' = 'push_done' and not exists (select 1 from vk_pushes p where p.id::text = e->'data'->>'push' and lg = any(p.logins)
                                                     and p.created > now() - interval '1 day')) then
      acc := acc || (e->>'id'); continue;
    end if;
    if room <= 0 then acc := acc || (e->>'id'); continue; end if;
    insert into vk_events (event_id, student_id, type, data, ts_client)
      values (e->>'id', uid, e->>'type', e->'data', case when e->>'ts' ~ '^[0-9]{1,15}$' then (e->>'ts')::bigint end) on conflict (event_id) do nothing;
    if found then room := room - 1; end if;
    acc := acc || (e->>'id');
  end loop;
  if conflict then
    update vk_students set last_seen = now() where id = uid;
    return jsonb_build_object('conflict', true, 'rev', cur_rev, 'state', cur_state, 'accepted', to_jsonb(acc));
  end if;
  return jsonb_build_object('rev', r, 'accepted', to_jsonb(acc));
end $$;
revoke execute on function vektor_sync(text, jsonb, jsonb, int) from public, anon, authenticated;
grant execute on function vektor_sync(text, jsonb, jsonb, int) to anon, authenticated;

-- ---------- 5. класс из ведомости ----------
create or replace function vektor_state(p_token text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare uid int := vk_auth(p_token, 'student'); st vk_students; cls text;
begin
  select * into st from vk_students where id = uid;
  select name into cls from vk_classes where id = st.class_id;
  return jsonb_build_object('login', st.login, 'label', st.label, 'state', st.state, 'rev', st.state_rev,
    'class', cls, 'grade', (substring(cls from '^([5-9])'))::int);
end $$;

grant execute on function vektor_test_answer(text, int, text, int), vektor_test_finish(text),
  vektor_teacher_test(text, text, text, boolean, int), vektor_state(text) to anon, authenticated;

-- PostgREST: перечитать список функций (vektor_sync сменила параметры)
notify pgrst, 'reload schema';

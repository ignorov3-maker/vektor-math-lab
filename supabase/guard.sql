-- CX-14. После schema.sql. Только миграция; не запускать на боевой БД из Codex.
insert into vk_settings values ('login_guard', jsonb_build_object('ip_limit',30,'device_limit',10,
  'salt',encode(extensions.gen_random_bytes(32),'hex'))) on conflict (key) do nothing;
create table if not exists vk_login_attempts (
  ts timestamptz not null default clock_timestamp(), ip_hash text, device_hash text, login text, ok boolean not null);
create index if not exists vk_login_attempts_ip on vk_login_attempts(ip_hash,ts) where not ok;
create index if not exists vk_login_attempts_device on vk_login_attempts(device_hash,ts) where not ok;
alter table vk_login_attempts enable row level security;
revoke all on vk_login_attempts from public, anon, authenticated;

create or replace function vk_ip_hash() returns text language plpgsql stable security definer
set search_path = public, extensions as $$
declare ip text; salt text;
begin
  ip := btrim(split_part(coalesce(nullif(current_setting('request.headers',true),'')::jsonb->>'x-forwarded-for',''),',',1));
  if ip = '' then return null; end if;
  select value->>'salt' into salt from vk_settings where key='login_guard';
  return encode(digest(salt || ':' || ip,'sha256'),'hex');
end $$;
create or replace function vk_device_hash(p_device text) returns text language sql stable security definer
set search_path = public, extensions as $$
 select case when coalesce(p_device,'') <> '' then encode(digest((select value->>'salt' from vk_settings where key='login_guard')
   || ':' || left(p_device,200),'sha256'),'hex') end $$;
create or replace function vk_guard_start(p_device text) returns boolean language plpgsql security definer
set search_path = public, extensions as $$
declare ip text := vk_ip_hash(); dev text := vk_device_hash(p_device); cfg jsonb;
begin
  -- Одинаковый порядок блокировок предотвращает гонки между запросами и deadlock.
  if ip is not null then perform pg_advisory_xact_lock(hashtextextended('ip:'||ip,0)); end if;
  if dev is not null then perform pg_advisory_xact_lock(hashtextextended('device:'||dev,0)); end if;
  select value into cfg from vk_settings where key='login_guard';
  return (ip is null or (select count(*) from vk_login_attempts where ip_hash=ip and not ok and ts>clock_timestamp()-interval '10 minutes') < (cfg->>'ip_limit')::int)
    and (dev is null or (select count(*) from vk_login_attempts where device_hash=dev and not ok and ts>clock_timestamp()-interval '10 minutes') < (cfg->>'device_limit')::int);
end $$;
create or replace function vk_guard_log(p_login text,p_device text,p_ok boolean) returns void language sql security definer
set search_path = public, extensions as $$
 insert into vk_login_attempts(ip_hash,device_hash,login,ok) values(vk_ip_hash(),vk_device_hash(p_device),left(p_login,254),p_ok) $$;

-- Сохраняем проверенное старое поведение и закрываем обход защиты через старую сигнатуру.
do $$ begin
  if to_regprocedure('vektor_login(text,text)') is not null then
    drop function if exists vk_login_legacy(text,text);
    alter function vektor_login(text,text) rename to vk_login_legacy;
  end if;
  if to_regprocedure('vektor_teacher_login(text,text)') is not null then
    drop function if exists vk_teacher_login_legacy(text,text);
    alter function vektor_teacher_login(text,text) rename to vk_teacher_login_legacy;
  end if;
end $$;
create or replace function vektor_login(p_login text,p_password text,p_device text default null) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare r jsonb;
begin
  if not vk_guard_start(p_device) then return jsonb_build_object('error','too_many','message','Слишком много попыток. Попробуй через 10 минут'); end if;
  r := vk_login_legacy(p_login,p_password);
  perform vk_guard_log(vk_norm(p_login),p_device,r ? 'token');
  return r;
end $$;
create or replace function vektor_teacher_login(p_login text,p_password text,p_device text default null) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare r jsonb;
begin
  if not vk_guard_start(p_device) then return jsonb_build_object('error','too_many','message','Слишком много попыток. Попробуйте через 10 минут'); end if;
  r := vk_teacher_login_legacy(p_login,p_password);
  perform vk_guard_log(lower(btrim(p_login)),p_device,r ? 'token');
  return r;
end $$;
create or replace function vk_cleanup() returns void language plpgsql security definer
set search_path = public, extensions as $$ begin
  delete from vk_login_attempts where ts < now()-interval '30 days';
  delete from vk_sessions where expires < now();
end $$;
revoke execute on function vk_ip_hash(),vk_device_hash(text),vk_guard_start(text),vk_guard_log(text,text,boolean),
  vk_login_legacy(text,text),vk_teacher_login_legacy(text,text),vk_cleanup(),vektor_login(text,text,text),vektor_teacher_login(text,text,text)
  from public,anon,authenticated;
grant execute on function vektor_login(text,text,text),vektor_teacher_login(text,text,text) to anon,authenticated;

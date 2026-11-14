-- CX-16. После schema.sql и guard.sql. Все аккаунты используют прежнюю систему сессий.
create table if not exists vk_adults (
  id serial primary key, role text not null check(role in ('parent','tutor')),
  email text not null unique check(email=lower(btrim(email))), email_verified_at timestamptz,
  pass_hash text not null, name text not null default '', fails int not null default 0,
  locked_until timestamptz, created timestamptz not null default now());
create table if not exists vk_links (
  student_id int not null references vk_students(id) on delete cascade,
  adult_id int not null references vk_adults(id) on delete cascade,
  kind text not null check(kind in ('parent','tutor')), created timestamptz not null default now(),
  primary key(student_id,adult_id));
create index if not exists vk_links_adult on vk_links(adult_id,student_id);
alter table vk_adults enable row level security;
alter table vk_links enable row level security;
revoke all on vk_adults,vk_links from public,anon,authenticated;

create or replace function vk_adult_auth(p_token text) returns int language plpgsql stable security definer
set search_path = public, extensions as $$
declare uid int; r text;
begin
  select role into r from vk_sessions where token_hash=encode(digest(coalesce(p_token,''),'sha256'),'hex');
  if r is null then raise exception 'no_session' using errcode='P0401'; end if;
  if r not in ('parent','tutor') then raise exception 'forbidden' using errcode='P0403'; end if;
  uid := vk_auth(p_token,r);
  if not exists(select 1 from vk_adults where id=uid and role=r) then raise exception 'no_session' using errcode='P0401'; end if;
  return uid;
end $$;
create or replace function vk_can_see(p_adult int,p_student int) returns boolean language sql stable security definer
set search_path = public, extensions as $$
 select exists(select 1 from vk_links l join vk_adults a on a.id=l.adult_id
   where l.adult_id=p_adult and l.student_id=p_student and l.kind=a.role) $$;
revoke execute on function vk_adult_auth(text),vk_can_see(int,int) from public,anon,authenticated;

-- CX-18. В production расширение http включает владелец; без него сервис закрыт.
create table if not exists vk_mail_tokens (
  token_hash text primary key,adult_id int references vk_adults(id) on delete cascade,
  student_id int references vk_students(id) on delete cascade,purpose text not null,
  email text,expires timestamptz not null,used_at timestamptz,created timestamptz not null default now());
create table if not exists vk_consents (
  id bigserial primary key,adult_id int references vk_adults(id),student_id int references vk_students(id),
  version text not null,text_sha256 text not null,ts timestamptz not null default now(),ip_hash text);
alter table vk_mail_tokens enable row level security;
alter table vk_consents enable row level security;
revoke all on vk_mail_tokens,vk_consents from public,anon,authenticated;
insert into vk_settings values('signup_open','false'),('consent','{}'),('site','{}') on conflict(key) do nothing;

-- Из Vault читается только служебный доступ к mail; ключи провайдеров остаются в Edge Secrets.
create or replace function vk_secret(p_name text) returns text language plpgsql stable security definer
set search_path=public,extensions as $$ declare v text; begin
  execute 'select decrypted_secret from vault.decrypted_secrets where name=$1 limit 1' into v using p_name;
  return v;
exception when undefined_table or invalid_schema_name then return null; end $$;
create or replace function vk_mail(p_action text,p_data jsonb) returns jsonb language plpgsql security definer
set search_path=public,extensions as $$
declare endpoint text:=vk_secret('VEKTOR_MAIL_URL'); secret text:=vk_secret('VEKTOR_MAIL_SERVICE_KEY'); status int; content text;
begin
  if endpoint is null or secret is null or endpoint !~ '^https://' then raise exception 'mail_not_configured'; end if;
  execute $q$select status,content from extensions.http(('POST',$1,
    array[extensions.http_header('Authorization','Bearer '||$2)],'application/json',$3::text)::extensions.http_request)$q$
    into status,content using endpoint,secret,jsonb_build_object('action',p_action,'data',p_data);
  if status<>200 then raise exception 'mail_unavailable'; end if;
  return content::jsonb;
end $$;
create or replace function vk_issue_mail(p_adult int,p_student int,p_purpose text,p_email text,p_hours int) returns void
language plpgsql security definer set search_path=public,extensions as $$
declare t text:=encode(gen_random_bytes(32),'hex'); site text; page text;
begin
  select value->>'url' into site from vk_settings where key='site';
  if site is null or site !~ '^https://' then raise exception 'site_not_configured'; end if;
  update vk_mail_tokens set used_at=now() where adult_id is not distinct from p_adult
    and student_id is not distinct from p_student and purpose=p_purpose and used_at is null;
  insert into vk_mail_tokens(token_hash,adult_id,student_id,purpose,email,expires)
    values(encode(digest(t,'sha256'),'hex'),p_adult,p_student,p_purpose,p_email,now()+make_interval(hours=>p_hours));
  page:=case when p_student is null then '/parent.html' else '/index.html' end;
  perform vk_mail('send',jsonb_build_object('to',p_email,'kind',case when p_purpose like '%reset' then 'reset' else 'confirm' end,
    'url',rtrim(site,'/')||page||'#'||p_purpose||'='||t));
end $$;
create or replace function vektor_public_config() returns jsonb language sql stable security definer
set search_path=public,extensions as $$
 select jsonb_build_object('signup_open',coalesce((select value='true'::jsonb from vk_settings where key='signup_open'),false),
   'consent_version',(select value->>'version' from vk_settings where key='consent')) $$;
create or replace function vektor_adult_register(p_email text,p_password text,p_role text,p_consent_version text,p_captcha text) returns jsonb
language plpgsql security definer set search_path=public,extensions as $$
declare a int; cfg jsonb; v_email text:=lower(btrim(p_email));
begin
  if not coalesce((select value='true'::jsonb from vk_settings where key='signup_open'),false) then return jsonb_build_object('error','soon','message','Регистрация скоро откроется'); end if;
  select value into cfg from vk_settings where key='consent';
  if coalesce(p_consent_version,'')='' or p_consent_version is distinct from cfg->>'version' or coalesce(cfg->>'sha256','') !~ '^[a-f0-9]{64}$' then
    return jsonb_build_object('error','consent','message','Проверьте актуальное согласие'); end if;
  if p_role not in ('parent','tutor') or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or length(v_email)>254
    or length(coalesce(p_password,''))<8 or octet_length(p_password)>72 then return jsonb_build_object('error','invalid','message','Проверьте почту и пароль: от 8 символов'); end if;
  if not coalesce((vk_mail('captcha',jsonb_build_object('token',p_captcha))->>'ok')::boolean,false) then return jsonb_build_object('error','captcha','message','Пройдите проверку капчи'); end if;
  insert into vk_adults(role,email,pass_hash) values(p_role,v_email,crypt(p_password,gen_salt('bf',10)))
    on conflict(email) do nothing returning id into a;
  if a is not null then
    insert into vk_consents(adult_id,version,text_sha256,ip_hash) values(a,p_consent_version,cfg->>'sha256',vk_ip_hash());
    perform vk_issue_mail(a,null,'adult_confirm',v_email,24);
  end if;
  return jsonb_build_object('ok',true,'message','Проверьте почту: если аккаунт создан, письмо отправлено');
end $$;
create or replace function vektor_adult_confirm(p_token text) returns jsonb language plpgsql security definer
set search_path=public,extensions as $$ declare a int; begin
  update vk_mail_tokens set used_at=now() where token_hash=encode(digest(coalesce(p_token,''),'sha256'),'hex')
    and purpose='adult_confirm' and used_at is null and expires>now() returning adult_id into a;
  if a is null then return jsonb_build_object('error','token','message','Ссылка недействительна или устарела'); end if;
  update vk_adults set email_verified_at=now() where id=a;
  return jsonb_build_object('ok',true);
end $$;
create or replace function vektor_adult_login(p_email text,p_password text,p_device text default null) returns jsonb
language plpgsql security definer set search_path=public,extensions as $$ declare a vk_adults; v_email text:=lower(btrim(p_email)); begin
  if not vk_guard_start(p_device) then return jsonb_build_object('error','too_many','message','Слишком много попыток. Попробуйте через 10 минут'); end if;
  select * into a from vk_adults where email=v_email for update;
  if a.id is not null and a.locked_until>now() then return jsonb_build_object('error','locked','message','Попробуйте через 5 минут'); end if;
  if a.id is null or a.pass_hash<>crypt(coalesce(p_password,''),a.pass_hash) then
    update vk_adults set fails=case when fails+1>=5 then 0 else fails+1 end,
      locked_until=case when fails+1>=5 then now()+interval '5 minutes' else null end where id=a.id;
    perform vk_guard_log(v_email,p_device,false);
    return jsonb_build_object('error','bad_login','message','Неверная почта или пароль');
  end if;
  perform vk_guard_log(v_email,p_device,true);
  if a.email_verified_at is null then return jsonb_build_object('error','unverified','message','Сначала подтвердите почту'); end if;
  update vk_adults set fails=0,locked_until=null where id=a.id;
  return jsonb_build_object('token',vk_new_session(a.role,a.id),'role',a.role,'name',a.name);
end $$;
create or replace function vektor_adult_reset_request(p_email text,p_captcha text) returns jsonb language plpgsql security definer
set search_path=public,extensions as $$ declare a vk_adults; begin
  if not coalesce((vk_mail('captcha',jsonb_build_object('token',p_captcha))->>'ok')::boolean,false) then return jsonb_build_object('error','captcha','message','Пройдите проверку капчи'); end if;
  select * into a from vk_adults where email=lower(btrim(p_email)) and email_verified_at is not null;
  if a.id is not null then perform vk_issue_mail(a.id,null,'adult_reset',a.email,1); end if;
  return jsonb_build_object('ok',true,'message','Если такая почта есть, письмо отправлено');
end $$;
create or replace function vektor_adult_reset(p_token text,p_password text) returns jsonb language plpgsql security definer
set search_path=public,extensions as $$ declare a int; begin
  if length(coalesce(p_password,''))<8 or octet_length(p_password)>72 then return jsonb_build_object('error','password','message','Пароль от 8 символов'); end if;
  update vk_mail_tokens set used_at=now() where token_hash=encode(digest(coalesce(p_token,''),'sha256'),'hex')
    and purpose='adult_reset' and used_at is null and expires>now() returning adult_id into a;
  if a is null then return jsonb_build_object('error','token','message','Ссылка недействительна или устарела'); end if;
  update vk_adults set pass_hash=crypt(p_password,gen_salt('bf',10)),fails=0,locked_until=null where id=a;
  delete from vk_sessions where role in ('parent','tutor') and user_id=a;
  return jsonb_build_object('ok',true);
end $$;
revoke execute on function vk_secret(text),vk_mail(text,jsonb),vk_issue_mail(int,int,text,text,int),vektor_public_config(),
 vektor_adult_register(text,text,text,text,text),vektor_adult_confirm(text),vektor_adult_login(text,text,text),
 vektor_adult_reset_request(text,text),vektor_adult_reset(text,text) from public,anon,authenticated;
grant execute on function vektor_public_config(),vektor_adult_register(text,text,text,text,text),vektor_adult_confirm(text),
 vektor_adult_login(text,text,text),vektor_adult_reset_request(text,text),vektor_adult_reset(text,text) to anon,authenticated;

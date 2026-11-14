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
  if r not in ('parent','tutor') or r is null then raise exception 'forbidden' using errcode='P0403'; end if;
  uid := vk_auth(p_token,r);
  if not exists(select 1 from vk_adults where id=uid and role=r) then raise exception 'no_session' using errcode='P0401'; end if;
  return uid;
end $$;
create or replace function vk_can_see(p_adult int,p_student int) returns boolean language sql stable security definer
set search_path = public, extensions as $$
 select exists(select 1 from vk_links l join vk_adults a on a.id=l.adult_id
   where l.adult_id=p_adult and l.student_id=p_student and l.kind=a.role) $$;
revoke execute on function vk_adult_auth(text),vk_can_see(int,int) from public,anon,authenticated;

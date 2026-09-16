-- Synthetic subset of the observed production schema. NEVER apply to production.
create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;
create role supabase_auth_admin nologin bypassrls;
create schema auth;
grant usage on schema public, auth to anon, authenticated, service_role, supabase_auth_admin;
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;
create table auth.users (
  id uuid primary key,
  email text,
  raw_user_meta_data jsonb default '{}'::jsonb
);
grant insert on auth.users to supabase_auth_admin;
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text, email text, avatar_url text, criado_em timestamptz default now(),
  cargo text, role text not null default 'membro' check (role in ('admin', 'membro')),
  aceitou_termo_em timestamptz
);
alter table public.profiles enable row level security;
grant all on public.profiles to anon, authenticated, service_role;
-- Exercise removal of stale per-column grants as well as table grants.
grant update(role), insert(role) on public.profiles to authenticated;
create function public.is_admin() returns boolean language sql stable security definer
set search_path = public as $$
  select exists(select 1 from public.profiles where id=auth.uid() and role='admin');
$$;
create policy profiles_own on public.profiles for all using (auth.uid()=id);
create policy profiles_select_authenticated on public.profiles for select to authenticated using (true);
create policy profiles_update_own_or_admin on public.profiles for update to authenticated
using(id=auth.uid() or public.is_admin());
create function public.handle_new_user() returns trigger language plpgsql security definer
set search_path=public as $$
begin
  insert into public.profiles(id,nome,email)
    values(new.id,coalesce(new.raw_user_meta_data->>'name',split_part(new.email,'@',1)),new.email)
    on conflict(id) do nothing;
  return new;
exception when others then return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();
insert into auth.users(id,email) values
 ('00000000-0000-0000-0000-000000000001','member-a@example.invalid'),
 ('00000000-0000-0000-0000-000000000002','member-b@example.invalid'),
 ('00000000-0000-0000-0000-000000000003','admin@example.invalid');
update public.profiles set role='admin' where id='00000000-0000-0000-0000-000000000003';

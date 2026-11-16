create role anon;
create role authenticated;
create role service_role bypassrls;
create schema auth;
create schema talki_private;
grant usage on schema public, auth, talki_private to authenticated, service_role;
create function auth.uid() returns uuid language sql stable as
$$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;

create table public.profiles(id uuid primary key);
create table public.plans(
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  descricao text,
  criado_por uuid not null references public.profiles(id),
  cor text not null default '#A8632F',
  criado_em timestamptz not null default now()
);
create table public.plan_members(
  plan_id uuid not null references public.plans(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  primary key(plan_id, user_id)
);
create table public.buckets(
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans(id) on delete cascade,
  nome text not null,
  ordem integer not null default 0
);
create table public.tasks(
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans(id) on delete cascade,
  bucket_id uuid not null references public.buckets(id) on delete cascade,
  titulo text not null,
  descricao text,
  prioridade text not null default 'media',
  status text not null default 'nao_iniciada',
  inicio date,
  prazo date,
  inicio_hora time,
  prazo_hora time,
  ordem integer not null default 0,
  criado_por uuid not null references public.profiles(id),
  criado_em timestamptz not null default now(),
  concluida_em timestamptz,
  cor text
);
create table public.task_assignees(
  task_id uuid not null references public.tasks(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  criado_em timestamptz not null default now(),
  atribuido_por uuid references public.profiles(id),
  primary key(task_id, user_id)
);
create table public.talki_google_connections(
  owner_id uuid primary key references public.profiles(id) on delete cascade
);

create function public.is_plan_member(p_plan_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(
    select 1 from public.plan_members
    where plan_id = p_plan_id and user_id = (select auth.uid())
  )
$$;

alter table public.plans enable row level security;
alter table public.plan_members enable row level security;
alter table public.buckets enable row level security;
alter table public.tasks enable row level security;
alter table public.task_assignees enable row level security;
create policy plans_all on public.plans for all to authenticated
  using(public.is_plan_member(id) or criado_por = (select auth.uid()))
  with check(criado_por = (select auth.uid()));
create policy members_all on public.plan_members for all to authenticated
  using(public.is_plan_member(plan_id))
  with check(user_id = (select auth.uid()));
create policy buckets_all on public.buckets for all to authenticated
  using(public.is_plan_member(plan_id)) with check(public.is_plan_member(plan_id));
create policy tasks_all on public.tasks for all to authenticated
  using(public.is_plan_member(plan_id)) with check(public.is_plan_member(plan_id));
create policy assignees_all on public.task_assignees for all to authenticated
  using(exists(select 1 from public.tasks where id = task_id))
  with check(exists(select 1 from public.tasks where id = task_id));

grant select, insert, update, delete on public.plans, public.plan_members,
  public.buckets, public.tasks, public.task_assignees to authenticated;
grant all on all tables in schema public to service_role;

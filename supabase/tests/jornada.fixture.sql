create table public.plans(id uuid primary key default gen_random_uuid(),nome text not null,criado_por uuid references public.profiles(id),descricao text,cor text default '#6366F1',criado_em timestamptz default now());
create table public.plan_members(plan_id uuid references public.plans(id),user_id uuid references public.profiles(id),primary key(plan_id,user_id));
create table public.tasks(id uuid primary key default gen_random_uuid(),plan_id uuid references public.plans(id),titulo text);
create function public.is_plan_member(p_plan_id uuid) returns boolean language sql security definer set search_path=public as $$select public.is_admin() or exists(select 1 from public.plan_members where plan_id=p_plan_id and user_id=auth.uid());$$;
create function public.is_plan_owner(p_plan_id uuid) returns boolean language sql security definer set search_path=public as $$select public.is_admin() or exists(select 1 from public.plans where id=p_plan_id and criado_por=auth.uid());$$;
insert into public.plans(id,nome,criado_por) values('00000000-0000-0000-0000-000000000010','Private plan','00000000-0000-0000-0000-000000000001');
insert into public.plan_members values('00000000-0000-0000-0000-000000000010','00000000-0000-0000-0000-000000000001');
insert into public.tasks(id,plan_id,titulo) values('00000000-0000-0000-0000-000000000011','00000000-0000-0000-0000-000000000010','Private task');

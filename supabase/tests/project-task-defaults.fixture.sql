-- Extend the shared planner fixture with project settings/ownership.
create function public.is_plan_owner(p_plan_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.plans where id = p_plan_id and criado_por = auth.uid())
$$;
create table public.talki_plan_settings(
  plan_id uuid primary key references public.plans(id),
  area_id uuid,
  ativo boolean not null default true
);
alter table public.talki_plan_settings enable row level security;
create policy read_settings on public.talki_plan_settings for select to authenticated
using(public.is_plan_member(plan_id));
grant select on public.talki_plan_settings to authenticated;

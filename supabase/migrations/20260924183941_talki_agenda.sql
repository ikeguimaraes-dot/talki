-- Agenda is isolated from the shared project's other event tables.
create table public.talki_agenda_events (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
 plan_id uuid references public.plans(id) on delete cascade,
 titulo text not null check(length(btrim(titulo)) between 1 and 240),
 descricao text not null default '' check(length(descricao)<=10000),
 tipo text not null check(tipo in ('reuniao','entrega')),
 inicio timestamptz not null,
 fim timestamptz not null check(fim>inicio),
 dia_inteiro boolean not null default false,
 local text not null default '' check(length(local)<=500),
 link text not null default '' check(length(link)<=2000 and (link='' or link ~* '^https?://')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 check(not dia_inteiro or ((inicio at time zone 'America/Sao_Paulo')::time='00:00'::time and (fim at time zone 'America/Sao_Paulo')::time='00:00'::time))
);
create index talki_agenda_owner_start on public.talki_agenda_events(owner_id,inicio);
create index talki_agenda_plan_start on public.talki_agenda_events(plan_id,inicio) where plan_id is not null;
alter table public.talki_agenda_events enable row level security;
revoke all on public.talki_agenda_events from public,anon,authenticated;
grant select,delete on public.talki_agenda_events to authenticated;
grant insert(owner_id,plan_id,titulo,descricao,tipo,inicio,fim,dia_inteiro,local,link) on public.talki_agenda_events to authenticated;
grant update(plan_id,titulo,descricao,tipo,inicio,fim,dia_inteiro,local,link) on public.talki_agenda_events to authenticated;
grant all on public.talki_agenda_events to service_role;
create policy agenda_read on public.talki_agenda_events for select to authenticated
 using(owner_id=(select auth.uid()) or (plan_id is not null and public.is_plan_member(plan_id)));
create policy agenda_create on public.talki_agenda_events for insert to authenticated
 with check(owner_id=(select auth.uid()) and (plan_id is null or public.is_plan_member(plan_id)));
create policy agenda_update on public.talki_agenda_events for update to authenticated
 using(owner_id=(select auth.uid()))
 with check(owner_id=(select auth.uid()) and (plan_id is null or public.is_plan_member(plan_id)));
create policy agenda_delete on public.talki_agenda_events for delete to authenticated
 using(owner_id=(select auth.uid()));
create function talki_private.agenda_updated_at() returns trigger language plpgsql security invoker set search_path='' as $$
begin new.updated_at:=now(); return new; end; $$;
revoke all on function talki_private.agenda_updated_at() from public,anon,authenticated;
create trigger agenda_updated_at before update on public.talki_agenda_events for each row execute function talki_private.agenda_updated_at();

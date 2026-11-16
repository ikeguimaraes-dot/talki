create table public.talki_notes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  titulo text not null check(length(btrim(titulo)) between 1 and 200),
  conteudo text not null default '' check(length(conteudo) <= 100000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index talki_notes_owner_updated
  on public.talki_notes(owner_id, updated_at desc);

alter table public.talki_notes enable row level security;
revoke all on public.talki_notes from public, anon, authenticated;
grant select, insert, update, delete on public.talki_notes to authenticated;
grant all on public.talki_notes to service_role;

create policy talki_notes_select on public.talki_notes
  for select to authenticated
  using(owner_id = (select auth.uid()));

create policy talki_notes_insert on public.talki_notes
  for insert to authenticated
  with check(owner_id = (select auth.uid()));

create policy talki_notes_update on public.talki_notes
  for update to authenticated
  using(owner_id = (select auth.uid()))
  with check(owner_id = (select auth.uid()));

create policy talki_notes_delete on public.talki_notes
  for delete to authenticated
  using(owner_id = (select auth.uid()));

create function talki_private.notes_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function talki_private.notes_updated_at()
  from public, anon, authenticated;

create trigger talki_notes_updated_at
before update on public.talki_notes
for each row execute function talki_private.notes_updated_at();

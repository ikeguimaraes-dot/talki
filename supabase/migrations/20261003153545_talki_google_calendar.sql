-- Secrets and synchronization metadata are accessible only to the server.
create table public.talki_google_connections (
 owner_id uuid primary key references public.profiles(id) on delete cascade,
 calendar_id text not null,
 label text not null,
 refresh_token text,
 enabled boolean not null default true,
 lease_id uuid,
 lease_until timestamptz,
 last_sync_at timestamptz,
 last_attempt_at timestamptz,
 last_error text,
 created_at timestamptz not null default now()
);
create table public.talki_google_oauth_states (
 state_hash text primary key,
 owner_id uuid not null references public.profiles(id) on delete cascade,
 verifier text not null,
 browser_hash text not null,
 expires_at timestamptz not null
);
create table public.talki_google_event_links (
 owner_id uuid not null references public.talki_google_connections(owner_id) on delete cascade,
 local_id uuid not null,
 remote_id text not null,
 baseline jsonb,
 local_deleted boolean not null default false,
 remote_created boolean not null default true,
 remote_deleted boolean not null default false,
 read_only boolean not null default false,
 primary key(owner_id,local_id),
 unique(owner_id,remote_id)
);
alter table public.talki_google_connections enable row level security;
alter table public.talki_google_oauth_states enable row level security;
alter table public.talki_google_event_links enable row level security;
revoke all on public.talki_google_connections,public.talki_google_oauth_states,public.talki_google_event_links from public,anon,authenticated;
grant all on public.talki_google_connections,public.talki_google_oauth_states,public.talki_google_event_links to service_role;
alter table public.talki_agenda_events add column google_read_only boolean not null default false;
alter table public.talki_agenda_events add column google_linked boolean not null default false;
-- The existing column grants intentionally exclude these server-managed flags.
create function talki_private.google_agenda_guard() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if current_setting('talki.google_import',true)='yes' then
  if tg_op='DELETE' then return old; else return new; end if;
 end if;
 if old.google_read_only then raise exception 'Edite este convite no Google Agenda.'; end if;
 if tg_op='DELETE' then
  update public.talki_google_event_links set local_deleted=true where owner_id=old.owner_id and local_id=old.id;
  return old;
 end if;
 if old.google_linked and new.plan_id is not null then
  raise exception 'Um compromisso sincronizado deve permanecer pessoal.';
 end if;
 return new;
end $$;
revoke all on function talki_private.google_agenda_guard() from public,anon,authenticated;
create trigger google_agenda_guard before update or delete on public.talki_agenda_events
 for each row execute function talki_private.google_agenda_guard();

-- CAS protects a local edit made while the server was talking to Google.
create function public.talki_google_apply(p_owner uuid,p_local uuid,p_remote text,p_expected timestamptz,p_event jsonb,p_read_only boolean default false)
returns boolean language plpgsql security invoker set search_path='' as $$
declare current_event public.talki_agenda_events; link public.talki_google_event_links;
begin
 select * into link from public.talki_google_event_links where owner_id=p_owner and local_id=p_local for update;
 if found and link.local_deleted then return false; end if;
 select * into current_event from public.talki_agenda_events where id=p_local and owner_id=p_owner for update;
 if found then
  if p_expected is null or current_event.updated_at<>p_expected or current_event.plan_id is not null then return false; end if;
 elsif p_expected is not null then return false;
 end if;
 perform set_config('talki.google_import','yes',true);
 if p_event is null then
  delete from public.talki_agenda_events where id=p_local and owner_id=p_owner;
  update public.talki_google_event_links set remote_deleted=true where owner_id=p_owner and local_id=p_local;
 else
  insert into public.talki_agenda_events(id,owner_id,titulo,descricao,tipo,inicio,fim,dia_inteiro,local,link,google_linked,google_read_only)
  values(p_local,p_owner,p_event->>'titulo',p_event->>'descricao','reuniao',(p_event->>'inicio')::timestamptz,(p_event->>'fim')::timestamptz,(p_event->>'dia_inteiro')::boolean,p_event->>'local',p_event->>'link',true,p_read_only)
  on conflict(id) do update set titulo=excluded.titulo,descricao=excluded.descricao,inicio=excluded.inicio,fim=excluded.fim,dia_inteiro=excluded.dia_inteiro,local=excluded.local,link=excluded.link,google_linked=true,google_read_only=excluded.google_read_only;
  insert into public.talki_google_event_links(owner_id,local_id,remote_id,baseline,read_only)
  values(p_owner,p_local,p_remote,p_event,p_read_only)
  on conflict(owner_id,local_id) do update set baseline=excluded.baseline,read_only=excluded.read_only,remote_deleted=false;
 end if;
 return true;
end $$;
revoke all on function public.talki_google_apply(uuid,uuid,text,timestamptz,jsonb,boolean) from public,anon,authenticated;
grant execute on function public.talki_google_apply(uuid,uuid,text,timestamptz,jsonb,boolean) to service_role;

create function public.talki_google_claim(p_owner uuid,p_lease uuid) returns setof public.talki_google_connections
language sql security invoker set search_path='' as $$
 update public.talki_google_connections set lease_id=p_lease,lease_until=now()+interval '330 seconds',last_attempt_at=now()
 where owner_id=p_owner and enabled and refresh_token is not null and (lease_until is null or lease_until<now()) returning *;
$$;
revoke all on function public.talki_google_claim(uuid,uuid) from public,anon,authenticated;
grant execute on function public.talki_google_claim(uuid,uuid) to service_role;

-- Reserve exports atomically, before contacting Google, and freeze personal visibility.
create function public.talki_google_prepare(p_owner uuid,p_local uuid,p_remote text,p_expected timestamptz,p_baseline jsonb)
returns setof public.talki_agenda_events language plpgsql security invoker set search_path='' as $$
begin
 perform 1 from public.talki_agenda_events where id=p_local and owner_id=p_owner and plan_id is null and updated_at=p_expected and not google_linked for update;
 if not found then return; end if;
 insert into public.talki_google_event_links(owner_id,local_id,remote_id,baseline,remote_created)
 values(p_owner,p_local,p_remote,p_baseline,false);
 return query update public.talki_agenda_events set google_linked=true where id=p_local and owner_id=p_owner returning *;
end $$;
revoke all on function public.talki_google_prepare(uuid,uuid,text,timestamptz,jsonb) from public,anon,authenticated;
grant execute on function public.talki_google_prepare(uuid,uuid,text,timestamptz,jsonb) to service_role;

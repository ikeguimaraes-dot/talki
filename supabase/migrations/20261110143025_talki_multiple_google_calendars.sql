-- Refuse to migrate while an old worker has a remote operation in flight.
lock table public.talki_google_connections in access exclusive mode;
do $$ begin
 if exists(select 1 from public.talki_google_connections where lease_until>now()) then
  raise exception 'Aguarde a sincronização atual antes de aplicar a migração.';
 end if;
end $$;
-- Each row is one calendar. Existing credentials, event IDs and tombstones survive.
alter table public.talki_google_event_links drop constraint talki_google_event_links_owner_id_fkey;
alter table public.talki_google_task_links drop constraint talki_google_task_links_owner_id_fkey;
alter table public.talki_google_connections drop constraint talki_google_connections_pkey;
alter table public.talki_google_connections add column id uuid not null default gen_random_uuid(),
 add column account_id text, add column access_role text not null default 'owner',
 add column color text not null default '#4285F4', add column is_default boolean not null default false;
update public.talki_google_connections set account_id=calendar_id,is_default=(enabled and refresh_token is not null);
alter table public.talki_google_connections alter column account_id set not null;
alter table public.talki_google_connections add primary key(id),
 add unique(owner_id,calendar_id), add unique(owner_id,id),
 add check(access_role in ('owner','writer','reader','writerWithoutPrivateAccess')),
 add check(color ~ '^#[0-9a-fA-F]{6}$');
create unique index talki_google_one_default on public.talki_google_connections(owner_id) where is_default;
create index talki_google_account on public.talki_google_connections(owner_id,account_id);
alter table public.talki_google_event_links add column connection_id uuid;
update public.talki_google_event_links l set connection_id=c.id from public.talki_google_connections c where c.owner_id=l.owner_id;
alter table public.talki_google_event_links alter column connection_id set not null;
alter table public.talki_google_event_links add foreign key(owner_id,connection_id) references public.talki_google_connections(owner_id,id) on delete cascade;
alter table public.talki_google_event_links drop constraint talki_google_event_links_owner_id_remote_id_key;
alter table public.talki_google_event_links add unique(connection_id,remote_id);
alter table public.talki_google_task_links add foreign key(owner_id) references public.profiles(id) on delete cascade;
-- Namespace Tasks identifiers per Google account without changing local task IDs.
update public.talki_google_task_links l set tasklist_id=c.account_id || ':' || l.tasklist_id
 from public.talki_google_connections c where c.owner_id=l.owner_id;
alter table public.talki_agenda_events add column google_calendar_id uuid references public.talki_google_connections(id) on delete no action deferrable initially deferred;
select set_config('talki.google_import','yes',true);
update public.talki_agenda_events e set google_calendar_id=c.id from public.talki_google_connections c where c.owner_id=e.owner_id and e.google_linked;
select set_config('talki.google_import','no',true);
grant insert(google_calendar_id), update(google_calendar_id) on public.talki_agenda_events to authenticated;

-- Serialize configuration changes with leases; RPCs are server-only.
create function talki_private.google_configuration_lock(p_owner uuid) returns void
language plpgsql security invoker set search_path='' as $$
begin
 perform pg_advisory_xact_lock(hashtextextended('google-config:'||p_owner::text,0));
 if exists(select 1 from public.talki_google_connections where owner_id=p_owner and lease_until>now()) then
  raise exception 'Aguarde a sincronização terminar e tente novamente.';
 end if;
end $$;
revoke all on function talki_private.google_configuration_lock(uuid) from public,anon,authenticated;
grant execute on function talki_private.google_configuration_lock(uuid) to service_role;

create function public.talki_google_connect(p_owner uuid,p_account text,p_refresh text,p_scopes text[],p_calendars jsonb) returns void
language plpgsql security invoker set search_path='' as $$
declare item jsonb; existing public.talki_google_connections; target uuid; has_default boolean;
begin
 perform talki_private.google_configuration_lock(p_owner);
 select exists(select 1 from public.talki_google_connections where owner_id=p_owner and is_default) into has_default;
 for item in select value from jsonb_array_elements(p_calendars) loop
  select * into existing from public.talki_google_connections where owner_id=p_owner and calendar_id=item->>'id';
  -- A shared calendar already connected through another account keeps one source.
  if found and existing.account_id<>p_account then continue; end if;
  insert into public.talki_google_connections(owner_id,calendar_id,account_id,label,refresh_token,granted_scopes,enabled,access_role,color,is_default)
  values(p_owner,item->>'id',p_account,item->>'label',p_refresh,p_scopes,
   coalesce((item->>'primary')::boolean,false),item->>'access_role',item->>'color',
   not has_default and coalesce((item->>'primary')::boolean,false) and (existing.id is null or existing.enabled or existing.refresh_token is null))
  on conflict(owner_id,calendar_id) do update set label=excluded.label,refresh_token=excluded.refresh_token,
   granted_scopes=excluded.granted_scopes,is_default=public.talki_google_connections.is_default or excluded.is_default,access_role=excluded.access_role,color=excluded.color,last_error=null,
   enabled=case when public.talki_google_connections.refresh_token is null then excluded.enabled else public.talki_google_connections.enabled end
  returning id into target;
  select exists(select 1 from public.talki_google_connections where owner_id=p_owner and is_default) into has_default;
 end loop;
end $$;
revoke all on function public.talki_google_connect(uuid,text,text,text[],jsonb) from public,anon,authenticated;
grant execute on function public.talki_google_connect(uuid,text,text,text[],jsonb) to service_role;

create function public.talki_google_configure(p_owner uuid,p_connection uuid,p_action text,p_enabled boolean default null) returns void
language plpgsql security invoker set search_path='' as $$
declare target public.talki_google_connections;
begin
 perform talki_private.google_configuration_lock(p_owner);
 select * into strict target from public.talki_google_connections where owner_id=p_owner and id=p_connection for update;
 if p_action='disconnect' then
  update public.talki_google_connections set enabled=false,is_default=false,refresh_token=null,last_error=null
   where owner_id=p_owner and account_id=target.account_id;
 elsif p_action='default' then
  if not target.enabled or target.refresh_token is null or target.access_role not in ('owner','writer') then raise exception 'Escolha uma agenda conectada com permissão de edição.'; end if;
  update public.talki_google_connections set is_default=false where owner_id=p_owner and is_default;
  update public.talki_google_connections set is_default=true where id=target.id;
 elsif p_action='toggle' and p_enabled is not null then
  if target.refresh_token is null then raise exception 'Reconecte esta conta Google.'; end if;
  if target.is_default and not p_enabled then raise exception 'Escolha outra agenda padrão antes de desativar esta.'; end if;
  update public.talki_google_connections set enabled=p_enabled where id=target.id;
 else raise exception 'Ação inválida.';
 end if;
end $$;
revoke all on function public.talki_google_configure(uuid,uuid,text,boolean) from public,anon,authenticated;
grant execute on function public.talki_google_configure(uuid,uuid,text,boolean) to service_role;

drop function public.talki_google_claim(uuid,uuid);
create function public.talki_google_claim(p_owner uuid,p_lease uuid,p_connection uuid) returns setof public.talki_google_connections
language plpgsql security invoker set search_path='' as $$
begin
 perform pg_advisory_xact_lock(hashtextextended('google-config:'||p_owner::text,0));
 return query update public.talki_google_connections set lease_id=p_lease,lease_until=now()+interval '330 seconds',last_attempt_at=now()
 where owner_id=p_owner and id=p_connection and enabled and refresh_token is not null and (lease_until is null or lease_until<now()) returning *;
end $$;
revoke all on function public.talki_google_claim(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.talki_google_claim(uuid,uuid,uuid) to service_role;

create or replace function talki_private.google_agenda_guard() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if current_setting('talki.google_import',true)='yes' then
  if tg_op='DELETE' then return old; else return new; end if;
 end if;
 if tg_op<>'INSERT' then
  if tg_op='DELETE' and not exists(select 1 from public.profiles where id=old.owner_id) then return old; end if;
  if old.google_read_only then raise exception 'Edite este compromisso no Google Agenda.'; end if;
  if tg_op='DELETE' then
   update public.talki_google_event_links set local_deleted=true where owner_id=old.owner_id and local_id=old.id;
   return old;
  end if;
  if old.google_linked and (new.plan_id is not null or new.google_calendar_id is distinct from old.google_calendar_id) then
   raise exception 'Um compromisso sincronizado deve permanecer pessoal e na agenda de origem.';
  end if;
 end if;
 if new.google_calendar_id is not null then
  if new.plan_id is not null then raise exception 'A sincronização Google é pessoal.'; end if;
  if not exists(select 1 from public.talki_google_connections where id=new.google_calendar_id and owner_id=new.owner_id
   and enabled and refresh_token is not null and access_role in ('owner','writer')) then
   raise exception 'Escolha uma agenda sua conectada com permissão de edição.';
  end if;
 end if;
 return new;
end $$;
drop trigger google_agenda_guard on public.talki_agenda_events;
create trigger google_agenda_guard before insert or update or delete on public.talki_agenda_events for each row execute function talki_private.google_agenda_guard();

drop function public.talki_google_apply(uuid,uuid,text,timestamptz,jsonb,boolean);
create function public.talki_google_apply(p_owner uuid,p_local uuid,p_remote text,p_expected timestamptz,p_event jsonb,p_connection uuid,p_read_only boolean default false)
returns boolean language plpgsql security invoker set search_path='' as $$
declare current_event public.talki_agenda_events; link public.talki_google_event_links;
begin
 if not exists(select 1 from public.talki_google_connections where id=p_connection and owner_id=p_owner) then raise exception 'Agenda inválida.'; end if;
 select * into link from public.talki_google_event_links where owner_id=p_owner and local_id=p_local for update;
 if found and (link.local_deleted or link.connection_id<>p_connection or link.remote_id<>p_remote) then return false; end if;
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
  insert into public.talki_agenda_events(id,owner_id,titulo,descricao,tipo,inicio,fim,dia_inteiro,local,link,google_linked,google_read_only,google_calendar_id)
  values(p_local,p_owner,p_event->>'titulo',p_event->>'descricao','reuniao',(p_event->>'inicio')::timestamptz,(p_event->>'fim')::timestamptz,(p_event->>'dia_inteiro')::boolean,p_event->>'local',p_event->>'link',true,p_read_only,p_connection)
  on conflict(id) do update set titulo=excluded.titulo,descricao=excluded.descricao,inicio=excluded.inicio,fim=excluded.fim,dia_inteiro=excluded.dia_inteiro,local=excluded.local,link=excluded.link,google_linked=true,google_read_only=excluded.google_read_only;
  insert into public.talki_google_event_links(owner_id,local_id,remote_id,baseline,read_only,connection_id)
  values(p_owner,p_local,p_remote,p_event,p_read_only,p_connection)
  on conflict(owner_id,local_id) do update set baseline=excluded.baseline,read_only=excluded.read_only,remote_deleted=false;
 end if;
 return true;
end $$;
revoke all on function public.talki_google_apply(uuid,uuid,text,timestamptz,jsonb,uuid,boolean) from public,anon,authenticated;
grant execute on function public.talki_google_apply(uuid,uuid,text,timestamptz,jsonb,uuid,boolean) to service_role;


drop function public.talki_google_prepare(uuid,uuid,text,timestamptz,jsonb);
create function public.talki_google_prepare(p_owner uuid,p_local uuid,p_remote text,p_expected timestamptz,p_baseline jsonb,p_connection uuid)
returns setof public.talki_agenda_events language plpgsql security invoker set search_path='' as $$
begin
 if not exists(select 1 from public.talki_google_connections where id=p_connection and owner_id=p_owner and enabled and refresh_token is not null and access_role in ('owner','writer')) then return; end if;
 perform 1 from public.talki_agenda_events where id=p_local and owner_id=p_owner and plan_id is null and updated_at=p_expected and not google_linked and (google_calendar_id=p_connection or (google_calendar_id is null and exists(select 1 from public.talki_google_connections where id=p_connection and is_default))) for update;
 if not found then return; end if;
 insert into public.talki_google_event_links(owner_id,local_id,remote_id,baseline,remote_created,connection_id)
 values(p_owner,p_local,p_remote,p_baseline,false,p_connection);
 return query update public.talki_agenda_events set google_linked=true,google_calendar_id=p_connection where id=p_local and owner_id=p_owner returning *;
end $$;
revoke all on function public.talki_google_prepare(uuid,uuid,text,timestamptz,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.talki_google_prepare(uuid,uuid,text,timestamptz,jsonb,uuid) to service_role;

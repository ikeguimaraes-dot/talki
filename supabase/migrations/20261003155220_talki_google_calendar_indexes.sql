create index talki_google_oauth_owner on public.talki_google_oauth_states(owner_id);
create index talki_google_oauth_expiry on public.talki_google_oauth_states(expires_at);
create index talki_google_sync_order on public.talki_google_connections(last_attempt_at) where enabled;
-- Explicitly document the server-only access model. Browser roles retain no grants.
create policy google_connection_server on public.talki_google_connections for all to service_role using(true) with check(true);
create policy google_oauth_server on public.talki_google_oauth_states for all to service_role using(true) with check(true);
create policy google_links_server on public.talki_google_event_links for all to service_role using(true) with check(true);
create or replace function talki_private.google_agenda_guard() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if current_setting('talki.google_import',true)='yes' then
  if tg_op='DELETE' then return old; else return new; end if;
 end if;
 -- Do not prevent account removal through the existing foreign-key cascades.
 if tg_op='DELETE' and not exists(select 1 from public.profiles where id=old.owner_id) then return old; end if;
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

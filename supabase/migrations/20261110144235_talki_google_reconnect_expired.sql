-- Restore selected calendars when replacing an expired authorization.
create or replace function public.talki_google_connect(p_owner uuid,p_account text,p_refresh text,p_scopes text[],p_calendars jsonb) returns void
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
   not has_default and coalesce((item->>'primary')::boolean,false) and (existing.id is null or existing.enabled or existing.refresh_token is null or existing.last_error like 'Sua autorização expirou.%'))
  on conflict(owner_id,calendar_id) do update set label=excluded.label,refresh_token=excluded.refresh_token,
   granted_scopes=excluded.granted_scopes,is_default=public.talki_google_connections.is_default or excluded.is_default,access_role=excluded.access_role,color=excluded.color,last_error=null,
   enabled=case when public.talki_google_connections.refresh_token is null then excluded.enabled when public.talki_google_connections.last_error like 'Sua autorização expirou.%' then true else public.talki_google_connections.enabled end
  returning id into target;
  select exists(select 1 from public.talki_google_connections where owner_id=p_owner and is_default) into has_default;
 end loop;
end $$;
revoke all on function public.talki_google_connect(uuid,text,text,text[],jsonb) from public,anon,authenticated;
grant execute on function public.talki_google_connect(uuid,text,text,text[],jsonb) to service_role;


-- Scope: public.profiles only. Auth provisioning runs as SECURITY DEFINER;
-- privileged administration continues through service_role/server-side code.
-- Browser callers (including Talki admins) may edit only presentation fields.
-- Column revocation alone is insufficient while table-level grants exist.
set local lock_timeout = '5s';

drop policy if exists profiles_own on public.profiles;

alter policy profiles_update_own_or_admin on public.profiles
  to authenticated
  using (id = (select auth.uid()) or (select public.is_admin()))
  with check (id = (select auth.uid()) or (select public.is_admin()));

revoke insert, update, delete, truncate, references, trigger
  on public.profiles from public, anon, authenticated;

-- Remove any old per-column grants too, including columns added outside this repo.
do $$
declare
  column_list text;
begin
  select string_agg(quote_ident(attname), ', ' order by attnum)
    into column_list
    from pg_attribute
    where attrelid = 'public.profiles'::regclass
      and attnum > 0 and not attisdropped;
  execute format(
    'revoke insert (%1$s), update (%1$s), references (%1$s) on public.profiles from public, anon, authenticated',
    column_list
  );
end;
$$;

grant update (nome, avatar_url, cargo, aceitou_termo_em)
  on public.profiles to authenticated;

-- Preserve the existing read model (directory + joins) and trusted provisioning.
grant select on public.profiles to authenticated;
grant select, insert, update, delete on public.profiles to service_role;

comment on column public.profiles.role is
  'Talki global role. Writable only through trusted server/database administration, never browser profile updates.';

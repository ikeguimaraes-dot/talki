\set ON_ERROR_STOP on
begin;
do $$ begin
 if has_table_privilege('authenticated','public.talki_google_connections','SELECT') then raise exception 'Secrets exposed'; end if;
 if has_table_privilege('anon','public.talki_google_oauth_states','SELECT') then raise exception 'OAuth state exposed'; end if;
 if has_function_privilege('authenticated','public.talki_google_apply(uuid,uuid,text,timestamptz,jsonb,boolean)','EXECUTE') then raise exception 'Import exposed'; end if;
 if has_column_privilege('authenticated','public.talki_agenda_events','google_linked','UPDATE') then raise exception 'Flags writable'; end if;
end $$;
insert into talki_google_connections(owner_id,calendar_id,label,refresh_token) values('11111111-1111-1111-1111-111111111111','primary','Test','encrypted');
set local role service_role;
select * from talki_google_claim('11111111-1111-1111-1111-111111111111','aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
do $$ begin
 if exists(select * from talki_google_claim('11111111-1111-1111-1111-111111111111','bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb')) then raise exception 'Double lease'; end if;
end $$;
select talki_google_apply('11111111-1111-1111-1111-111111111111','33333333-3333-3333-3333-333333333333','event1',null,'{"titulo":"Importado","descricao":"","inicio":"2026-10-03T12:00:00Z","fim":"2026-10-03T13:00:00Z","dia_inteiro":false,"local":"","link":""}',false);
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','22222222-2222-2222-2222-222222222222',true);
do $$ begin if exists(select * from talki_agenda_events) then raise exception 'Cross-user read'; end if; end $$;
select set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',true);
-- Reset the per-transaction import flag; real HTTP RPCs use separate transactions.
select set_config('talki.google_import','no',true);
update talki_agenda_events set titulo='Edição local' where id='33333333-3333-3333-3333-333333333333';
reset role;
set local role service_role;
do $$ begin
 if talki_google_apply('11111111-1111-1111-1111-111111111111','33333333-3333-3333-3333-333333333333','event1','2000-01-01',null,false) then raise exception 'CAS missed newer edit'; end if;
 if (select titulo from talki_agenda_events where id='33333333-3333-3333-3333-333333333333')<>'Edição local' then raise exception 'Edit lost'; end if;
end $$;
reset role;
set local role authenticated;
delete from talki_agenda_events where id='33333333-3333-3333-3333-333333333333';
reset role;
do $$ begin if not(select local_deleted from talki_google_event_links where remote_id='event1') then raise exception 'Delete not queued'; end if; end $$;
-- A remote pull cannot resurrect a locally deleted event.
set local role service_role;
do $$ begin
 if talki_google_apply('11111111-1111-1111-1111-111111111111','33333333-3333-3333-3333-333333333333','event1',null,'{"titulo":"Ressurreição"}',false) then raise exception 'Deleted event resurrected'; end if;
end $$;
select talki_google_apply('11111111-1111-1111-1111-111111111111','44444444-4444-4444-4444-444444444444','invite1',null,'{"titulo":"Convite","descricao":"","inicio":"2026-10-03T12:00:00Z","fim":"2026-10-03T13:00:00Z","dia_inteiro":false,"local":"","link":""}',true);
reset role;
set local role authenticated;
select set_config('talki.google_import','no',true);
do $$ begin
 begin update talki_agenda_events set titulo='Não permitido' where id='44444444-4444-4444-4444-444444444444';raise exception 'Readonly failure';exception when raise_exception then if sqlerrm='Readonly failure' then raise;end if;end;
end $$;
reset role;
set local role service_role;
insert into talki_agenda_events(id,owner_id,titulo,tipo,inicio,fim) values('55555555-5555-5555-5555-555555555555','11111111-1111-1111-1111-111111111111','Exportar','reuniao','2026-10-03T12:00:00Z','2026-10-03T13:00:00Z');
do $$ declare stamp timestamptz; begin
 select updated_at into stamp from talki_agenda_events where id='55555555-5555-5555-5555-555555555555';
 if not exists(select * from talki_google_prepare('11111111-1111-1111-1111-111111111111','55555555-5555-5555-5555-555555555555','export1',stamp,'{}')) then raise exception 'Export reservation missing';end if;
 if exists(select * from talki_google_prepare('11111111-1111-1111-1111-111111111111','55555555-5555-5555-5555-555555555555','export1',stamp,'{}')) then raise exception 'Duplicate export reservation';end if;
 if not exists(select 1 from talki_google_event_links where remote_id='export1' and not remote_created) then raise exception 'Outbox missing';end if;
end $$;
reset role;
insert into plans values('66666666-6666-6666-6666-666666666666');
do $$ begin
 begin update talki_agenda_events set plan_id='66666666-6666-6666-6666-666666666666' where id='55555555-5555-5555-5555-555555555555';raise exception 'Shared synced event';exception when raise_exception then if sqlerrm='Shared synced event' then raise;end if;end;
end $$;
-- Removing the account must still cascade even when imported invitations are read-only.
delete from profiles where id='11111111-1111-1111-1111-111111111111';
do $$ begin if exists(select * from talki_agenda_events) then raise exception 'Account cascade failed';end if;end $$;
rollback;

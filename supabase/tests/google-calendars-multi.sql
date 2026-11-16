\set ON_ERROR_STOP on
begin;
-- Existing identities, events, default calendar and Tasks survive the migration.
do $$ begin
 if not exists(select 1 from talki_agenda_events e join talki_google_connections c on c.id=e.google_calendar_id join talki_google_event_links l on l.local_id=e.id and l.connection_id=c.id
 where e.id='33333333-3333-3333-3333-333333333333' and c.is_default and c.account_id='first@example.test') then raise exception 'Legacy binding lost'; end if;
 if not exists(select 1 from talki_google_task_links l join tasks t on t.id=l.task_id where l.tasklist_id='first@example.test:legacy-list' and t.titulo='Preservar tarefa') then raise exception 'Legacy task lost'; end if;
 if has_table_privilege('authenticated','talki_google_connections','SELECT') then raise exception 'Secrets exposed'; end if;
 if has_function_privilege('authenticated','public.talki_google_connect(uuid,text,text,text[],jsonb)','EXECUTE') then raise exception 'Connect exposed'; end if;
 if has_function_privilege('authenticated','public.talki_google_apply(uuid,uuid,text,timestamptz,jsonb,uuid,boolean)','EXECUTE') then raise exception 'Import exposed'; end if;
 if has_column_privilege('authenticated','talki_agenda_events','google_linked','UPDATE') then raise exception 'Flags exposed'; end if;
end $$;
set local role service_role;
select talki_google_connect('11111111-1111-1111-1111-111111111111','second@example.test','encrypted2',array['scope'],
 '[{"id":"second@example.test","primary":true,"label":"Segunda conta","access_role":"owner","color":"#123456"},{"id":"team","label":"Equipe","access_role":"reader","color":"#654321"}]');
select talki_google_connect('22222222-2222-2222-2222-222222222222','other@example.test','encrypted3',array['scope'],
 '[{"id":"other@example.test","primary":true,"label":"Outra pessoa","access_role":"owner","color":"#123456"}]');
do $$ declare a uuid;b uuid;c uuid;stamp timestamptz;event jsonb := '{"titulo":"Mesmo ID remoto","descricao":"","inicio":"2026-11-10T12:00:00Z","fim":"2026-11-10T13:00:00Z","dia_inteiro":false,"local":"","link":""}';begin
 select id into a from talki_google_connections where calendar_id='first@example.test';
 select id into b from talki_google_connections where calendar_id='second@example.test';
 select id into c from talki_google_connections where calendar_id='team';
 if (select count(*) from talki_google_connections where owner_id='11111111-1111-1111-1111-111111111111' and is_default)<>1 then raise exception 'Default changed';end if;
 if (select enabled from talki_google_connections where id=c) then raise exception 'Secondary selected without permission';end if;
 perform talki_google_configure('11111111-1111-1111-1111-111111111111',c,'toggle',true);
 perform talki_google_apply('11111111-1111-1111-1111-111111111111','44444444-4444-4444-4444-444444444444','same-remote',null,event,a,false);
 perform talki_google_apply('11111111-1111-1111-1111-111111111111','55555555-5555-5555-5555-555555555555','same-remote',null,event,b,false);
 if (select count(*) from talki_google_event_links where remote_id='same-remote')<>2 then raise exception 'Remote IDs collided';end if;
 if talki_google_apply('11111111-1111-1111-1111-111111111111','44444444-4444-4444-4444-444444444444','same-remote',null,event,b,false) then raise exception 'Cross-calendar overwrite';end if;
 perform talki_google_apply('11111111-1111-1111-1111-111111111111','66666666-6666-6666-6666-666666666666','read-only',null,event,c,true);
 perform set_config('talki.google_import','no',true);
 insert into talki_agenda_events(id,owner_id,titulo,tipo,inicio,fim) values('77777777-7777-7777-7777-777777777777','11111111-1111-1111-1111-111111111111','Local','reuniao','2026-11-10T12:00Z','2026-11-10T13:00Z');
 select updated_at into stamp from talki_agenda_events where id='77777777-7777-7777-7777-777777777777';
 if exists(select * from talki_google_prepare('11111111-1111-1111-1111-111111111111','77777777-7777-7777-7777-777777777777','export',stamp,'{}',b)) then raise exception 'Nondefault exported';end if;
 if not exists(select * from talki_google_prepare('11111111-1111-1111-1111-111111111111','77777777-7777-7777-7777-777777777777','export',stamp,'{}',a)) then raise exception 'Default export failed';end if;
 if exists(select * from talki_google_prepare('11111111-1111-1111-1111-111111111111','77777777-7777-7777-7777-777777777777','export',stamp,'{}',a)) then raise exception 'Duplicate export';end if;
 perform talki_google_configure('11111111-1111-1111-1111-111111111111',b,'default');
 if not (select is_default from talki_google_connections where id=b) then raise exception 'Default selection failed';end if;
 if talki_google_apply('11111111-1111-1111-1111-111111111111','55555555-5555-5555-5555-555555555555','same-remote','2000-01-01',null,b,false) then raise exception 'CAS failed';end if;
 if not exists(select * from talki_google_claim('11111111-1111-1111-1111-111111111111',gen_random_uuid(),a)) then raise exception 'Lease failed';end if;
 if exists(select * from talki_google_claim('11111111-1111-1111-1111-111111111111',gen_random_uuid(),a)) then raise exception 'Double lease';end if;
 begin perform talki_google_configure('11111111-1111-1111-1111-111111111111',b,'disconnect');raise exception 'Lease ignored';exception when raise_exception then if sqlerrm='Lease ignored' then raise;end if;end;
 update talki_google_connections set lease_id=null,lease_until=null;
 perform talki_google_configure('11111111-1111-1111-1111-111111111111',b,'disconnect');
 perform talki_google_connect('11111111-1111-1111-1111-111111111111','second@example.test','new-token',array['scope'],
  '[{"id":"second@example.test","primary":true,"label":"Reconectada","access_role":"owner","color":"#123456"}]');
 if not exists(select 1 from talki_google_connections where id=b and is_default and enabled and refresh_token='new-token') then raise exception 'Reconnect failed'; end if;
 perform talki_google_connect('11111111-1111-1111-1111-111111111111','first@example.test','new-token',array['scope'],
  '[{"id":"team","label":"Shared elsewhere","access_role":"reader","color":"#654321"}]');
 if (select account_id from talki_google_connections where id=c)<>'second@example.test' or (select count(*) from talki_google_connections where calendar_id='team')<>1 then raise exception 'Shared calendar duplicated';end if;
 perform talki_google_task_apply('11111111-1111-1111-1111-111111111111','first@example.test:list','same-task','{"title":"Conta 1","status":"needsAction","due":"2026-11-10T00:00:00Z"}');
 perform talki_google_task_apply('11111111-1111-1111-1111-111111111111','second@example.test:list','same-task','{"title":"Conta 2","status":"needsAction","due":"2026-11-10T00:00:00Z"}');
 if (select count(*) from talki_google_task_links where remote_id='same-task')<>2 then raise exception 'Task accounts collided';end if;
 update talki_google_connections set enabled=false,is_default=false,last_error='Sua autorização expirou. Reconecte o Google.' where id=b;
 perform talki_google_connect('11111111-1111-1111-1111-111111111111','second@example.test','renewed-token',array['scope'],
  '[{"id":"second@example.test","primary":true,"label":"Renovada","access_role":"owner","color":"#123456"}]');
 if not exists(select 1 from talki_google_connections where id=b and enabled and is_default and last_error is null) then raise exception 'Expired authorization not reactivated'; end if;

end $$;
reset role;
select set_config('talki.test.other_calendar',(select id::text from talki_google_connections where calendar_id='other@example.test'),true);
set local role authenticated;
select set_config('request.jwt.claim.sub','11111111-1111-1111-1111-111111111111',true);
select set_config('talki.google_import','no',true);
do $$ declare other_id uuid; begin
 -- IDs of other people's calendars must be rejected by the trigger even if known.
 begin update talki_agenda_events set google_calendar_id='00000000-0000-0000-0000-000000000001' where id='44444444-4444-4444-4444-444444444444';raise exception 'Move allowed';exception when raise_exception then if sqlerrm='Move allowed' then raise;end if;end;
 begin update talki_agenda_events set titulo='Forbidden' where id='66666666-6666-6666-6666-666666666666';raise exception 'Readonly failed';exception when raise_exception then if sqlerrm='Readonly failed' then raise;end if;end;
 begin insert into talki_agenda_events(owner_id,titulo,tipo,inicio,fim,google_calendar_id) values('11111111-1111-1111-1111-111111111111','Forbidden','reuniao','2026-11-10T12:00Z','2026-11-10T13:00Z',current_setting('talki.test.other_calendar')::uuid);raise exception 'Invalid calendar allowed';exception when raise_exception then if sqlerrm='Invalid calendar allowed' then raise;end if;end;
 update talki_agenda_events set titulo='Edição local' where id='44444444-4444-4444-4444-444444444444';
 delete from talki_agenda_events where id='55555555-5555-5555-5555-555555555555';
end $$;
reset role;
do $$ begin if not (select local_deleted from talki_google_event_links where local_id='55555555-5555-5555-5555-555555555555') then raise exception 'Tombstone lost';end if;end $$;
set local role authenticated;
select set_config('request.jwt.claim.sub','22222222-2222-2222-2222-222222222222',true);
do $$ begin if exists(select * from talki_agenda_events) then raise exception 'Cross-user read';end if;end $$;
reset role;
-- Deleting a profile still cascades through read-only imports and calendars.
delete from plans where criado_por='11111111-1111-1111-1111-111111111111';
delete from profiles where id='11111111-1111-1111-1111-111111111111';
set constraints all immediate;
do $$ begin if exists(select * from talki_agenda_events) then raise exception 'Cascade failed';end if;end $$;
rollback;

begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
insert into public.talki_agenda_events(titulo,tipo,inicio,fim) values('Personal','reuniao','2026-09-24 09:00-03','2026-09-24 10:00-03');
insert into public.talki_agenda_events(titulo,tipo,inicio,fim,plan_id) values('Shared','entrega','2026-09-24 09:00-03','2026-09-24 10:00-03','00000000-0000-0000-0000-000000000010');
do $$ begin
 if (select count(*) from public.talki_agenda_events)<>2 then raise exception 'Owner cannot see both events';end if;
 begin
  insert into public.talki_agenda_events(owner_id,titulo,tipo,inicio,fim) values('00000000-0000-0000-0000-000000000002','Spoof','reuniao',now(),now()+interval '1 hour');raise exception 'Spoofed owner accepted';
 exception when insufficient_privilege then null;end;
 begin
  update public.talki_agenda_events set owner_id='00000000-0000-0000-0000-000000000002';raise exception 'Ownership transfer allowed';
 exception when insufficient_privilege then null;end;
 begin
  insert into public.talki_agenda_events(titulo,tipo,inicio,fim) values('Invalid time','reuniao',now(),now());raise exception 'Empty range accepted';
 exception when check_violation then null;end;
 begin
  insert into public.talki_agenda_events(titulo,tipo,inicio,fim,link) values('Unsafe link','reuniao',now(),now()+interval '1 hour','javascript:alert(1)');raise exception 'Unsafe link accepted';
 exception when check_violation then null;end;
 begin
  insert into public.talki_agenda_events(titulo,tipo,inicio,fim,dia_inteiro) values('Invalid all day','entrega','2026-09-24 10:00-03','2026-09-25 00:00-03',true);raise exception 'Non-midnight all day accepted';
 exception when check_violation then null;end;
end; $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',true);
do $$ begin
 if exists(select 1 from public.talki_agenda_events) then raise exception 'Nonmember can see events';end if;
 begin
  insert into public.talki_agenda_events(titulo,tipo,inicio,fim,plan_id) values('Forbidden project','reuniao',now(),now()+interval '1 hour','00000000-0000-0000-0000-000000000010');raise exception 'Unauthorized sharing accepted';
 exception when insufficient_privilege then null;end;
end; $$;
reset role;
insert into public.plan_members values('00000000-0000-0000-0000-000000000010','00000000-0000-0000-0000-000000000002');
set local role authenticated;
do $$ declare changed int; begin
 if (select count(*) from public.talki_agenda_events)<>1 then raise exception 'Member must see only project event';end if;
 update public.talki_agenda_events set titulo='Hacked';get diagnostics changed=row_count;
 if changed<>0 then raise exception 'Member can edit another owner event';end if;
 delete from public.talki_agenda_events;get diagnostics changed=row_count;
 if changed<>0 then raise exception 'Member can delete another owner event';end if;
end; $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
update public.talki_agenda_events set titulo='Updated' where titulo='Personal';
do $$ begin if not exists(select 1 from public.talki_agenda_events where titulo='Updated') then raise exception 'Owner update failed';end if;end; $$;
delete from public.talki_agenda_events where titulo='Updated';
do $$ begin if (select count(*) from public.talki_agenda_events)<>1 then raise exception 'Owner delete failed';end if;end; $$;
reset role;
set local role anon;
do $$ begin
 begin perform 1 from public.talki_agenda_events;raise exception 'Anonymous access allowed';exception when insufficient_privilege then null;end;
end; $$;
reset role;
rollback;
select 'Agenda ownership, sharing, validation, CRUD and anonymous access: passed' as result;

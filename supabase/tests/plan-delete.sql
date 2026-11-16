-- Run in an isolated database after applying plan-delete.fixture.sql and applying
-- 20261001152852_talki_plan_settings_delete_cascade.sql.
begin;
insert into public.plans(id) values (1), (2);
insert into public.talki_plan_settings(plan_id) values (1), (2);
insert into public.talki_registros(id,plan_id) values (1,1), (2,2);
delete from public.plans where id=1;
do $$ begin
  assert not exists(select 1 from public.talki_plan_settings where plan_id=1), 'Deleted project settings remain';
  assert exists(select 1 from public.talki_registros where id=1 and plan_id is null), 'Jornada history must survive';
  assert exists(select 1 from public.talki_plan_settings where plan_id=2), 'Other project settings changed';
  assert exists(select 1 from public.talki_registros where id=2 and plan_id=2), 'Other project history changed';
end $$;
rollback;

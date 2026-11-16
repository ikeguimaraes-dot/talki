-- Settings belong to the project and should not prevent its deletion.
-- Jornada records retain their existing ON DELETE SET NULL relationships.
alter table public.talki_plan_settings
  drop constraint talki_plan_settings_plan_id_fkey,
  add constraint talki_plan_settings_plan_id_fkey
    foreign key (plan_id) references public.plans(id) on delete cascade;

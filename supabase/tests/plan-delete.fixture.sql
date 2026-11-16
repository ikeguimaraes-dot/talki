create table public.plans(id int primary key);
create table public.talki_plan_settings(plan_id int primary key constraint talki_plan_settings_plan_id_fkey references public.plans(id) on delete restrict);
create table public.talki_registros(id int primary key,plan_id int references public.plans(id) on delete set null);

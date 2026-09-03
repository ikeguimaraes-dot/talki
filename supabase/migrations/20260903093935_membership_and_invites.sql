-- Reconcilia o conceito legado de "team_members" (sem vínculo com auth)
-- com usuários reais (profiles), e renomeia convites pro vocabulário novo.

-- task_assignees: passa a apontar pra profiles em vez de team_members ----
alter table public.task_assignees drop constraint if exists task_assignees_member_id_fkey;
delete from public.task_assignees where member_id not in (select id from public.profiles);
alter table public.task_assignees rename column member_id to user_id;
alter table public.task_assignees
  add constraint task_assignees_user_id_fkey foreign key (user_id) references public.profiles(id) on delete cascade;

-- plan_members: a tabela antiga (0 linhas) apontava pra team_members;
-- recria do zero apontando pra profiles, como no schema novo.
drop table public.plan_members;
create table public.plan_members (
  plan_id uuid not null references public.plans(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  primary key (plan_id, user_id)
);

-- garante que o criador de cada plano migrado já é membro dele
insert into public.plan_members (plan_id, user_id)
select id, criado_por from public.plans
on conflict do nothing;

-- plan_invites (renomeada de project_invites) ----------------------------
alter table public.project_invites drop constraint if exists project_invites_created_by_fkey;
alter table public.project_invites rename to plan_invites;
alter table public.plan_invites rename column project_id to plan_id;
alter table public.plan_invites rename column created_at to criado_em;
alter table public.plan_invites rename column created_by to criado_por;
alter table public.plan_invites
  add constraint plan_invites_criado_por_fkey foreign key (criado_por) references public.profiles(id);

-- tabelas superadas pelo schema novo (0 registros aproveitáveis) ---------
drop table public.project_members;
drop table public.team_members;

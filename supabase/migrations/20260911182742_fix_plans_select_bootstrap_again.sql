-- A migration anterior (20260911182149_restore_per_project_permissions.sql)
-- recriou plans_select_members usando só is_plan_member(id), derrubando sem
-- querer o fix de bootstrap que já existia em
-- 20260903100600_fix_plans_select_bootstrap.sql: no insert de um plano novo,
-- create-plan-dialog.tsx faz .insert(...).select().single(), e nesse
-- instante o criador ainda não está em plan_members (isso só acontece na
-- chamada seguinte). Sem o "or criado_por = auth.uid()", o RETURNING do
-- insert falha silenciosamente pra quem não é membro de nenhum outro plano.
drop policy if exists "plans_select_members" on public.plans;

create policy "plans_select_members" on public.plans
  for select to authenticated using (public.is_plan_member(id) or criado_por = auth.uid());

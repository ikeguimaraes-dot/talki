-- SOURCE ONLY. Freeze destination and reconcile any new Talki records before rollback.
begin;
drop trigger if exists pareto_retired_read_only on public.profiles;
drop trigger if exists pareto_retired_read_only on public.areas;
drop trigger if exists pareto_retired_read_only on public.categorias_atividade;
drop trigger if exists pareto_retired_read_only on public.projetos;
drop trigger if exists pareto_retired_read_only on public.registros;
drop trigger if exists pareto_retired_read_only on public.pontuacao_diaria;
drop function if exists pareto_migration.reject_legacy_write();
commit;

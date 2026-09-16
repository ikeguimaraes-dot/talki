-- SOURCE ONLY: afxsrcezmetipzgosdvb. Never apply to Talki.
set local lock_timeout='5s';
create schema if not exists pareto_migration;
revoke all on schema pareto_migration from public,anon,authenticated;
create function pareto_migration.reject_legacy_write() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
 raise exception 'O Pareto foi integrado ao Talki. Acesse https://talki.freneze.com.br/jornada' using errcode='55000';
end; $$;
revoke all on function pareto_migration.reject_legacy_write() from public,anon,authenticated;
create trigger pareto_retired_read_only before insert or update or delete or truncate on public.profiles for each statement execute function pareto_migration.reject_legacy_write();
create trigger pareto_retired_read_only before insert or update or delete or truncate on public.areas for each statement execute function pareto_migration.reject_legacy_write();
create trigger pareto_retired_read_only before insert or update or delete or truncate on public.categorias_atividade for each statement execute function pareto_migration.reject_legacy_write();
create trigger pareto_retired_read_only before insert or update or delete or truncate on public.projetos for each statement execute function pareto_migration.reject_legacy_write();
create trigger pareto_retired_read_only before insert or update or delete or truncate on public.registros for each statement execute function pareto_migration.reject_legacy_write();
create trigger pareto_retired_read_only before insert or update or delete or truncate on public.pontuacao_diaria for each statement execute function pareto_migration.reject_legacy_write();

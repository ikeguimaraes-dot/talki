-- Resíduo do bug de case-sensitivity documentado no checkplan.md original:
-- tabelas capitalizadas órfãs (0-4 linhas, nada as referencia) que nunca
-- foram usadas pelo app — só as minúsculas (public.projects, public.tasks
-- etc.) estão em uso.
drop table if exists public."Comments" cascade;
drop table if exists public."Task_Assignees" cascade;
drop table if exists public."Tasks" cascade;
drop table if exists public."Projects" cascade;
drop table if exists public."Team_Members" cascade;

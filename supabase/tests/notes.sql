\set ON_ERROR_STOP on
begin;

insert into public.profiles(id) values
  ('11111111-1111-1111-1111-111111111111'),
  ('22222222-2222-2222-2222-222222222222');

set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
insert into public.talki_notes(titulo, conteudo) values('Minha nota', 'Conteúdo privado');

do $$ begin
  if (select count(*) from public.talki_notes) <> 1 then raise exception 'Proprietário não leu a nota'; end if;
end $$;

select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', true);
do $$ begin
  if exists(select 1 from public.talki_notes) then raise exception 'Nota privada exposta'; end if;
end $$;
update public.talki_notes set titulo = 'Invadida';
delete from public.talki_notes;

select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);
do $$ begin
  if not exists(select 1 from public.talki_notes where titulo = 'Minha nota') then raise exception 'Outro usuário alterou a nota'; end if;
end $$;
update public.talki_notes set titulo = 'Nota atualizada';
delete from public.talki_notes;

do $$ begin
  if exists(select 1 from public.talki_notes) then raise exception 'Proprietário não excluiu a nota'; end if;
  if has_table_privilege('anon', 'public.talki_notes', 'SELECT') then raise exception 'Notas expostas ao anônimo'; end if;
end $$;

rollback;

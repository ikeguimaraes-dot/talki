begin;
insert into public.talki_categorias_atividade(id,nome) values('00000000-0000-0000-0000-000000000020','Trabalho focado');
insert into public.talki_areas(id,nome) values('00000000-0000-0000-0000-000000000021','Área');
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
select public.talki_jornada_ensure();
do $$ declare r public.talki_registros; n int; begin
 r:=public.talki_jornada_save('start',jsonb_build_object('descricao','First','categoria_id','00000000-0000-0000-0000-000000000020','task_id','00000000-0000-0000-0000-000000000011'));
 if r.plan_id is null or r.tarefa_titulo<>'Private task' then raise exception 'Task link failed'; end if;
 begin
  perform public.talki_jornada_save('start',jsonb_build_object('descricao','Invalid category','categoria_id','00000000-0000-0000-0000-000000000099'));
  raise exception 'Bad category accepted';
 exception when foreign_key_violation then null; end;
 select count(*) into n from public.talki_registros where fim is null;
 if n<>1 then raise exception 'Failed switch closed original timer'; end if;
 r:=public.talki_jornada_save('start',jsonb_build_object('descricao','Second','categoria_id','00000000-0000-0000-0000-000000000020'));
 select count(*) into n from public.talki_registros where fim is null;
 if n<>1 then raise exception 'Multiple timers'; end if;
 perform public.talki_jornada_save('end');perform public.talki_jornada_save('end');
 if (select count(*) from public.talki_registros where descricao='Fim do expediente')<>1 then raise exception 'Duplicate end marker'; end if;
 begin
  update public.talki_colaboradores set papel='gestor',moedas=999;
  raise exception 'Unauthorized role or balance mutation';
 exception when insufficient_privilege then null;end;
 begin
  insert into public.talki_registros(user_id,categoria_id,descricao,inicio) values(auth.uid(),'00000000-0000-0000-0000-000000000020','Bypass',now());
  raise exception 'Direct insert allowed';
 exception when insufficient_privilege then null;end;
end; $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',true);
select public.talki_jornada_ensure();
do $$ begin
 if (select count(*) from public.talki_registros)<>0 then raise exception 'Another member records visible';end if;
 begin
  perform public.talki_jornada_save('start',jsonb_build_object('descricao','Forbidden','categoria_id','00000000-0000-0000-0000-000000000020','task_id','00000000-0000-0000-0000-000000000011'));
  raise exception 'Private task accepted';
 exception when insufficient_privilege then null;end;
 begin
  perform public.talki_jornada_admin('area','{"nome":"Forbidden"}');raise exception 'Unauthorized management';
 exception when insufficient_privilege then null;end;
end; $$;
reset role;
insert into public.talki_registros(user_id,categoria_id,descricao,inicio,fim)
values('00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-000000000020','Yesterday',date_trunc('day',now())-interval '1 day'+interval '4 hours',date_trunc('day',now())-interval '1 day'+interval '12 hours');
set local role authenticated;
select public.talki_jornada_score();select public.talki_jornada_score();
do $$ begin
 if (select moedas from public.talki_colaboradores where user_id=auth.uid())<>5 then raise exception 'Score double applied';end if;
 if (select count(*) from public.talki_pontuacao_diaria)<>1 then raise exception 'Score duplicated';end if;
end; $$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',true);
select public.talki_jornada_ensure();
select public.talki_jornada_admin('area','{"nome":"Management created"}');
do $$ begin
 if (select count(*) from public.talki_colaboradores)<>3 then raise exception 'Manager cannot read team';end if;
end; $$;
reset role;
set local role anon;
select set_config('request.jwt.claim.sub','',true);
do $$ begin
 begin perform public.talki_jornada_ensure();raise exception 'Anonymous initialization allowed';exception when insufficient_privilege then null;end;
 begin perform public.talki_jornada_save('finish');raise exception 'Anonymous RPC allowed';exception when insufficient_privilege then null;end;
end; $$;
reset role;
rollback;
select 'Jornada authorization, timer atomicity and scoring: passed' as result;

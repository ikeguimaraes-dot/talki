begin;
insert into public.talki_categorias_atividade(id,nome) values('00000000-0000-0000-0000-000000000020','Trabalho focado');
insert into public.talki_areas(id,nome) values('00000000-0000-0000-0000-000000000021','Área');
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
select public.talki_jornada_ensure();
do $$ declare r public.talki_registros; first_r public.talki_registros; n int; begin
 r:=public.talki_jornada_save('start',jsonb_build_object('descricao','First','categoria_id','00000000-0000-0000-0000-000000000020','task_id','00000000-0000-0000-0000-000000000011'));
 first_r:=r;
 if r.plan_id is null or r.tarefa_titulo<>'Private task' then raise exception 'Task link failed'; end if;
 begin
  perform public.talki_jornada_save('start',jsonb_build_object('descricao','Invalid category','categoria_id','00000000-0000-0000-0000-000000000099'));
  raise exception 'Bad category accepted';
 exception when foreign_key_violation then null; end;
 select count(*) into n from public.talki_registros where fim is null;
 if n<>1 then raise exception 'Failed start changed original timer'; end if;
 for n in 2..5 loop
  r:=public.talki_jornada_save('start',jsonb_build_object('descricao','Activity '||n,'categoria_id','00000000-0000-0000-0000-000000000020'));
 end loop;
 if (select count(*) from public.talki_registros where fim is null)<>5 then raise exception 'Five simultaneous timers not preserved'; end if;
 if (select inicio from public.talki_registros where id=first_r.id)<>first_r.inicio then raise exception 'Start changed original timestamp'; end if;
 begin
  perform public.talki_jornada_save('finish');
  raise exception 'Ambiguous finish allowed';
 exception when raise_exception then
  if sqlerrm<>'Selecione a atividade que deseja encerrar.' then raise; end if;
 end;
 perform public.talki_jornada_save('finish',jsonb_build_object('id',r.id));
 perform public.talki_jornada_save('finish',jsonb_build_object('id',r.id));
 if (select count(*) from public.talki_registros where fim is null)<>4 then raise exception 'Individual finish affected other timers'; end if;
 -- Reopening and editing overlapping activities must be allowed.
 r:=public.talki_jornada_save('edit',jsonb_build_object('id',r.id,'descricao','Reopened','categoria_id',r.categoria_id,'inicio',r.inicio));
 if r.fim is not null or (select count(*) from public.talki_registros where fim is null)<>5 then raise exception 'Overlapping edit failed'; end if;
 begin
  perform public.talki_jornada_save('pause',jsonb_build_object('descricao','Invalid pause','categoria_id','00000000-0000-0000-0000-000000000099'));
  raise exception 'Bad pause accepted';
 exception when foreign_key_violation then null; end;
 if (select count(*) from public.talki_registros where fim is null)<>5 then raise exception 'Failed pause closed timers'; end if;
 r:=public.talki_jornada_save('pause',jsonb_build_object('descricao','Pausa','categoria_id',r.categoria_id));
 if (select count(*) from public.talki_registros where fim is null)<>1 or r.descricao<>'Pausa' then raise exception 'Pause did not close all activities'; end if;
 perform public.talki_jornada_save('finish');
 if exists(select 1 from public.talki_registros where fim is null) then raise exception 'Legacy single finish failed'; end if;
 -- Leave five running again to verify end-of-day closes all of them.
 for n in 1..5 loop
  perform public.talki_jornada_save('start',jsonb_build_object('descricao','End test '||n,'categoria_id',r.categoria_id));
 end loop;
 perform public.talki_jornada_save('end');perform public.talki_jornada_save('end');
 if exists(select 1 from public.talki_registros where fim is null) then raise exception 'End left running activities'; end if;
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
select set_config('test.other_record_id',(select id::text from public.talki_registros limit 1),true);
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',true);
select public.talki_jornada_ensure();
do $$ begin
 begin
  perform public.talki_jornada_save('finish',jsonb_build_object('id',current_setting('test.other_record_id')));
  raise exception 'Another users activity can be finished';
 exception when insufficient_privilege then null;end;
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

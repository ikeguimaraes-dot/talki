-- Independent concurrent activities; preserve the partial lookup index without uniqueness.
drop index public.talki_registro_aberto;
create index talki_registro_aberto on public.talki_registros(user_id) where fim is null;

create or replace function talki_private.jornada_save(p_action text,p_data jsonb) returns public.talki_registros language plpgsql security definer set search_path='' as $$
declare
 u uuid:=auth.uid(); r public.talki_registros; old_r public.talki_registros; target_id uuid:=nullif(p_data->>'id','')::uuid;
 t public.tasks; p public.plans; start_at timestamptz; stop_at timestamptz; category uuid;
begin
 if not talki_private.jornada_active() then raise exception 'Jornada indisponível para esta conta.' using errcode='42501'; end if;
 perform 1 from public.talki_colaboradores where user_id=u for update;
 if p_action in ('finish','end','pause') then
  -- Older clients may omit the id only when a single activity is running.
  if p_action='finish' and target_id is null then
   if (select count(*) from public.talki_registros where user_id=u and fim is null)>1 then
    raise exception 'Selecione a atividade que deseja encerrar.';
   end if;
   select id into target_id from public.talki_registros where user_id=u and fim is null;
  end if;
  if p_action='finish' and target_id is not null and not exists(
   select 1 from public.talki_registros where id=target_id and user_id=u
  ) then raise exception 'Registro não encontrado.' using errcode='42501'; end if;
  for old_r in select * from public.talki_registros
   where user_id=u and fim is null and (p_action in ('end','pause') or id=target_id) for update
  loop
   update public.talki_registros set fim=greatest(now(),inicio),updated_at=now() where id=old_r.id returning * into r;
   insert into talki_private.jornada_audit(actor,entity,entity_id,operation,before_row,after_row)
   values(u,'registro',r.id,'finish',to_jsonb(old_r),to_jsonb(r));
  end loop;
  if p_action='end' then
   select id into category from public.talki_categorias_atividade order by (nome ilike '%pausa%') desc,nome limit 1;
   if category is null then raise exception 'Cadastre uma categoria.'; end if;
   if not exists(select 1 from public.talki_registros where user_id=u and descricao='Fim do expediente' and inicio=fim and (inicio at time zone 'America/Sao_Paulo')::date=(now() at time zone 'America/Sao_Paulo')::date) then
    insert into public.talki_registros(user_id,categoria_id,descricao,inicio,fim) values(u,category,'Fim do expediente',now(),now()) returning * into r;
    insert into talki_private.jornada_audit(actor,entity,entity_id,operation,after_row) values(u,'registro',r.id,'end',to_jsonb(r));
   end if;
  end if;
  if p_action<>'pause' then return r; end if;
  p_action:='start';
  old_r:=null;
 end if;
 if p_action not in ('start','edit') then raise exception 'Ação inválida.'; end if;
 if p_action='edit' then
  select * into old_r from public.talki_registros where id=(p_data->>'id')::uuid and user_id=u for update;
  if old_r.id is null then raise exception 'Registro não encontrado.' using errcode='42501'; end if;
  if exists(select 1 from public.talki_pontuacao_diaria where user_id=u and data=(old_r.inicio at time zone 'America/Sao_Paulo')::date) then raise exception 'Este dia já foi avaliado. Solicite uma correção à gestão.'; end if;
 end if;
 start_at:=coalesce(nullif(p_data->>'inicio','')::timestamptz,now());
 stop_at:=nullif(p_data->>'fim','')::timestamptz;
 if start_at>now()+interval '1 minute' or stop_at>now()+interval '1 minute' or stop_at<start_at then raise exception 'Confira o início e o fim da atividade.'; end if;
 if exists(select 1 from public.talki_pontuacao_diaria where user_id=u and data=(start_at at time zone 'America/Sao_Paulo')::date) then raise exception 'Este dia já foi avaliado.'; end if;
 if length(btrim(coalesce(p_data->>'descricao','')))=0 then raise exception 'Informe a descrição.'; end if;
 if nullif(p_data->>'task_id','') is not null then
  select * into t from public.tasks where id=(p_data->>'task_id')::uuid;
  if t.id is null or not public.is_plan_member(t.plan_id) then raise exception 'Sem acesso à tarefa.' using errcode='42501'; end if;
  if nullif(p_data->>'plan_id','') is not null and t.plan_id<>(p_data->>'plan_id')::uuid then raise exception 'Tarefa e projeto incompatíveis.'; end if;
 end if;
 if coalesce(t.plan_id,nullif(p_data->>'plan_id','')::uuid) is not null then
  select * into p from public.plans where id=coalesce(t.plan_id,nullif(p_data->>'plan_id','')::uuid);
  if p.id is null or not public.is_plan_member(p.id) then raise exception 'Sem acesso ao projeto.' using errcode='42501'; end if;
  if exists(select 1 from public.talki_plan_settings where plan_id=p.id and not ativo) then raise exception 'Projeto arquivado.'; end if;
 end if;
 if p_action='start' then
  insert into public.talki_registros(user_id,categoria_id,area_id,plan_id,task_id,projeto_nome,tarefa_titulo,descricao,participantes,inicio,fim)
  values(u,(p_data->>'categoria_id')::uuid,nullif(p_data->>'area_id','')::uuid,p.id,t.id,p.nome,t.titulo,btrim(p_data->>'descricao'),nullif(p_data->>'participantes',''),start_at,stop_at) returning * into r;
 else
  update public.talki_registros set categoria_id=(p_data->>'categoria_id')::uuid,area_id=nullif(p_data->>'area_id','')::uuid,
   plan_id=p.id,task_id=t.id,projeto_nome=p.nome,tarefa_titulo=t.titulo,descricao=btrim(p_data->>'descricao'),participantes=nullif(p_data->>'participantes',''),inicio=start_at,fim=stop_at,updated_at=now()
  where id=old_r.id returning * into r;
 end if;
 insert into talki_private.jornada_audit(actor,entity,entity_id,operation,before_row,after_row) values(u,'registro',r.id,p_action,case when old_r.id is not null then to_jsonb(old_r) end,to_jsonb(r));
 return r;
end; $$;

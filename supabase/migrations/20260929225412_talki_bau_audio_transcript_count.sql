-- Count generated audio transcripts alongside uploaded documents.
create or replace function public.talki_bau_search(search_text text default '',project_filter uuid default null,from_day date default null,to_day date default null,scope text default 'all',page_offset int default 0)
returns table(id uuid,owner_id uuid,titulo text,data_reuniao date,participantes text,plan_id uuid,compartilhar_projeto boolean,created_at timestamptz,audios bigint,transcricoes bigint)
language sql stable security invoker set search_path='' as $$
 select e.id,e.owner_id,e.titulo,e.data_reuniao,e.participantes,e.plan_id,e.compartilhar_projeto,e.created_at,
 (select count(*) from public.talki_bau_files f where f.entry_id=e.id and f.pronto and f.tipo='audio'),
 (select count(*) from public.talki_bau_files f where f.entry_id=e.id and f.pronto and (f.tipo='transcricao' or (f.tipo='audio' and exists(select 1 from public.talki_bau_ai_jobs j where j.file_id=f.id and j.audio_complete and j.transcript<>''))))+case when e.transcricao<>'' then 1 else 0 end
 from public.talki_bau_entries e
 where (project_filter is null or e.plan_id=project_filter) and (from_day is null or e.data_reuniao>=from_day) and (to_day is null or e.data_reuniao<=to_day)
 and (scope='all' or (scope='mine' and e.owner_id=auth.uid()) or (scope='shared' and e.owner_id<>auth.uid()))
 and (btrim(search_text)='' or e.titulo ilike '%'||search_text||'%' or e.busca @@ websearch_to_tsquery('portuguese',search_text)
 or exists(select 1 from public.talki_bau_files f where f.entry_id=e.id and f.pronto and f.busca @@ websearch_to_tsquery('portuguese',search_text)))
 order by e.data_reuniao desc,e.created_at desc,e.id limit 31 offset greatest(0,page_offset);
$$;

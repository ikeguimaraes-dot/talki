begin;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
insert into public.talki_bau_entries(id,titulo) values('00000000-0000-0000-0000-000000000031','Reunião IA') returning id;
insert into public.talki_bau_files(id,entry_id,nome,tipo,mime,tamanho,path) values('00000000-0000-0000-0000-000000000041','00000000-0000-0000-0000-000000000031','audio.mp3','audio','audio/mpeg',100,'00000000-0000-0000-0000-000000000001/00000000-0000-0000-0000-000000000031/00000000-0000-0000-0000-000000000041') returning id;
do $$ begin
 begin perform public.talki_bau_enqueue_audio('00000000-0000-0000-0000-000000000041');raise exception 'unfinished audio queued';exception when raise_exception then if sqlerrm='unfinished audio queued' then raise;end if;end;
 begin perform public.talki_bau_claim_audio();raise exception 'user claimed job';exception when insufficient_privilege then null;end;
 begin update public.talki_bau_ai_jobs set status='completed';raise exception 'user changed state';exception when insufficient_privilege then null;end;
end;$$;
insert into storage.objects(bucket_id,name,metadata) values('talki-bau','00000000-0000-0000-0000-000000000001/00000000-0000-0000-0000-000000000031/00000000-0000-0000-0000-000000000041','{"size":100}');
select public.talki_bau_finish_upload('00000000-0000-0000-0000-000000000041');
select public.talki_bau_enqueue_audio('00000000-0000-0000-0000-000000000041');
do $$ begin if (select count(file_id) from public.talki_bau_ai_jobs)<>1 then raise exception 'automatic/idempotent queue failed';end if;end;$$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',true);
do $$ begin
 if exists(select file_id from public.talki_bau_ai_jobs) then raise exception 'private job leaked';end if;
 begin perform public.talki_bau_enqueue_audio('00000000-0000-0000-0000-000000000041');raise exception 'nonowner enqueue allowed';exception when insufficient_privilege then null;end;
end;$$;
reset role;
set local role service_role;
do $$ declare j public.talki_bau_ai_jobs;begin
 select * into j from public.talki_bau_claim_audio();
 if j.file_id is null or j.lease_token is null then raise exception 'worker failed to claim';end if;
 if exists(select 1 from public.talki_bau_claim_audio()) then raise exception 'double claim allowed';end if;
 update public.talki_bau_ai_jobs set transcript='Decisão sobre contratação',cursor_seconds=298,lease_until=now()-interval '1 second' where file_id=j.file_id;
 select * into j from public.talki_bau_claim_audio();
 if j.cursor_seconds<>298 or j.transcript<>'Decisão sobre contratação' then raise exception 'checkpoint lost';end if;
 update public.talki_bau_ai_jobs set status='error',audio_complete=true,lease_token=null,lease_until=null;
end;$$;
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
select public.talki_bau_enqueue_audio('00000000-0000-0000-0000-000000000041');
do $$ begin
 if (select cursor_seconds from public.talki_bau_ai_jobs)<>298 then raise exception 'retry reset progress';end if;
 if (select transcricoes from public.talki_bau_search('contratação'))<>1 then raise exception 'audio transcript not counted';end if;
 if not exists(select 1 from public.talki_bau_search('contratação')) then raise exception 'audio text not searchable';end if;
end;$$;
select public.talki_bau_set_sharing('00000000-0000-0000-0000-000000000031',false,array['00000000-0000-0000-0000-000000000002'::uuid]);
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',true);
do $$ begin if not exists(select transcript from public.talki_bau_ai_jobs) then raise exception 'shared transcript invisible';end if;end;$$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',true);
delete from storage.objects;
delete from public.talki_bau_files;
do $$ begin if exists(select file_id from public.talki_bau_ai_jobs) then raise exception 'deleted file retained AI output';end if;end;$$;
rollback;
select 'AI queue ownership, sharing, checkpoint recovery, duplicate prevention and deletion: passed';

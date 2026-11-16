import {audioChunk,transcribe,summarize,mergeTranscript,CHUNK_SECONDS,ProviderError} from './bau-ai.mjs';

export async function processJob(db,job,deps={audioChunk,transcribe,summarize}){
 const save=async patch=>{
  const {data,error}=await db.from('talki_bau_ai_jobs').update({...patch,updated_at:new Date().toISOString(),lease_token:null,lease_until:null}).eq('file_id',job.file_id).eq('lease_token',job.lease_token).select('file_id');
  if(error)throw new Error('Falha ao salvar o processamento.');
  return data?.length===1;
 };
 try{
  const {data:file,error}=await db.from('talki_bau_files').select('path,nome,pronto,tipo,entry_id,owner_id').eq('id',job.file_id).single();
  if(error||!file||!file.pronto||file.tipo!=='audio'||file.owner_id!==job.owner_id||file.entry_id!==job.entry_id)throw new Error('Áudio indisponível.');
  if(job.audio_complete){
   const {data:entry,error}=await db.from('talki_bau_entries').select('titulo,data_reuniao,participantes').eq('id',job.entry_id).single();if(error)throw new Error('Reunião indisponível.');
   const summary=await deps.summarize(job.transcript,entry);
   await save({status:'completed',summary,error:null,attempts:0});
  }else{
   const {data,error}=await db.storage.from('talki-bau').createSignedUrl(file.path,300);if(error)throw new Error('Não foi possível acessar o áudio.');
   const formats={mp3:'mp3',m4a:'mov',mp4:'mov',wav:'wav',ogg:'ogg',opus:'ogg',webm:'matroska',flac:'flac',aac:'aac'};
   const format=formats[file.nome?.split('.').pop()?.toLowerCase()];
   if(!format)throw new Error('Formato de áudio não suportado.');
   const chunk=await deps.audioChunk(data.signedUrl,job.cursor_seconds,{format});
   if(chunk.seconds===0&&job.cursor_seconds===0)throw new Error('O arquivo não contém áudio legível.');
   const text=chunk.seconds>0.2?await deps.transcribe(chunk.bytes):'';
   const transcript=mergeTranscript(job.transcript,text);
   if(transcript.length>500000)throw new Error('A gravação excedeu 500 mil caracteres. Divida-a em arquivos menores.');
   await save({transcript,audio_complete:chunk.complete,cursor_seconds:job.cursor_seconds+(chunk.complete?chunk.seconds:CHUNK_SECONDS-2),status:chunk.complete?'summarizing':'transcribing',error:null,attempts:0,next_attempt_at:new Date().toISOString()});
  }
 }catch(error){
  const retry=job.attempts<3&&(!(error instanceof ProviderError)||error.retryable);
  // Do not store provider payloads, signed URLs, user text or credentials in errors/logs.
  const message=error instanceof ProviderError?error.message:error?.name==='TimeoutError'?'O processamento demorou demais. Tente novamente.':'Não foi possível concluir este trecho. Tente novamente; o progresso salvo será mantido.';
  await save({status:retry?job.status:'error',error:message,next_attempt_at:new Date(Date.now()+60000*job.attempts).toISOString()});
 }
}
export async function runWorker(db,target=null){
 const started=Date.now();let processed=0;
 // Only start another step within the first 80s. A step is bounded to 180s,
 // leaving headroom under the 300s function limit even when a provider is slow.
 while(processed<10&&Date.now()-started<80000){
  const {data,error}=await db.rpc('talki_bau_claim_audio',{target});
  if(error)throw new Error('Fila de transcrição indisponível.');
  if(!data?.[0])break;
  await processJob(db,data[0]);processed++;
 }
 return processed;
}

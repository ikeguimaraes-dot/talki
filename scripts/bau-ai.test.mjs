import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {execFileSync} from 'node:child_process';
import ffmpeg from 'ffmpeg-static';
import {audioChunk,mergeTranscript,parseSummary,ProviderError,CHUNK_SECONDS} from '../server/bau-ai.mjs';
import {processJob} from '../server/bau-worker.mjs';

test('chunk overlap removes duplicated words without discarding new speech',()=>{
 assert.equal(mergeTranscript('Decidimos entregar o projeto na sexta-feira.','o projeto na sexta-feira. Depois vamos revisar.'),'Decidimos entregar o projeto na sexta-feira.\n\nDepois vamos revisar.');
 assert.equal(mergeTranscript('','Olá equipe.'),'Olá equipe.');
 assert.equal(mergeTranscript('Conteúdo anterior.',''),'Conteúdo anterior.');
});
test('truncated/refused summaries are not treated as completed',()=>{
 assert.throws(()=>parseSummary({status:'incomplete',output:[]}));
 assert.throws(()=>parseSummary({status:'completed',output:[{content:[{type:'refusal'}]}]}));
 assert.equal(new ProviderError(429,'insufficient_quota').retryable,false);
 assert.equal(new ProviderError(429,'rate_limit_exceeded').retryable,true);
});
test('real converter handles MP3, M4A, WAV and a final partial chunk',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'talki-ai-'));
 try{for(const ext of ['mp3','m4a','wav']){
  const path=join(dir,'sample.'+ext);execFileSync(ffmpeg,['-v','error','-f','lavfi','-i','sine=frequency=600:duration=3','-y',path]);
  const result=await audioChunk(path,1);assert.equal(result.complete,true);assert.ok(result.seconds>1.8&&result.seconds<2.3);assert.ok(result.bytes.length>1000);
  const end=await audioChunk(path,10);assert.equal(end.complete,true);assert.equal(end.seconds,0);
 }}finally{await rm(dir,{recursive:true,force:true});}
});
function fakeDb(){
 const writes=[];
 return {
  writes,
  storage:{from:()=>({createSignedUrl:async()=>({data:{signedUrl:'https://example.test/audio'}})})},
  from(table){
   if(table==='talki_bau_files')return {select:()=>({eq:()=>({single:async()=>({data:{path:'x',nome:'audio.mp3',tipo:'audio',pronto:true,owner_id:'u',entry_id:'e'}})})})};
   if(table==='talki_bau_entries')return {select:()=>({eq:()=>({single:async()=>({data:{titulo:'Reunião'}})})})};
   return {update(patch){
    const filters=[];
    return {eq(key,value){filters.push([key,value]);return this;},async select(){writes.push({patch,filters});return {data:[{file_id:'f'}]};}};
   }};
  }
 };
}
const job={file_id:'f',entry_id:'e',owner_id:'u',lease_token:'lease',attempts:1,status:'transcribing',cursor_seconds:0,transcript:'',audio_complete:false};
test('checkpoint is fenced by lease and keeps transcription when summary fails',async()=>{
 const db=fakeDb();await processJob(db,job,{audioChunk:async()=>({seconds:CHUNK_SECONDS,bytes:new Uint8Array(),complete:false}),transcribe:async()=>'Texto falado.'});
 assert.equal(db.writes[0].patch.cursor_seconds,CHUNK_SECONDS-2);assert.equal(db.writes[0].patch.transcript,'Texto falado.');assert.deepEqual(db.writes[0].filters,[['file_id','f'],['lease_token','lease']]);
 await processJob(db,{...job,audio_complete:true,status:'summarizing',transcript:'Texto falado.'},{summarize:async()=>{throw new ProviderError(429,'insufficient_quota');}});
 assert.equal(db.writes[1].patch.status,'error');assert.equal(db.writes[1].patch.transcript,undefined);assert.equal(db.writes[1].patch.summary,undefined);
});

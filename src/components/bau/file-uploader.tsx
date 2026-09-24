import {useEffect,useRef,useState} from 'react';
import {Upload as TusUpload} from 'tus-js-client';
import {Pause,Play,UploadCloud} from 'lucide-react';
import {toast} from 'sonner';
import {supabase} from '@/supabase';
import {bauDb,errorMessage,type BauFile} from '@/lib/bau';
import {BAU_ACCEPT,BAU_BUCKET,MAX_AUDIO_BYTES,fileDetails,formatBytes,storagePath} from '@/lib/bau-files';
import {Button} from '@/components/ui/button';
export function FileUploader({entryId,userId,pending,onChange,onBusyChange}:{entryId:string;userId:string;pending:BauFile[];onChange:()=>void;onBusyChange:(busy:boolean)=>void}){
 const [state,setState]=useState<'idle'|'preparing'|'uploading'|'paused'|'error'>('idle');
 const [progress,setProgress]=useState(0),[name,setName]=useState(''),[error,setError]=useState('');
 const upload=useRef<TusUpload|null>(null),input=useRef<HTMLInputElement>(null),resumeFile=useRef<BauFile|null>(null),mounted=useRef(true);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;void upload.current?.abort();};},[]);
 useEffect(()=>{if(!['preparing','uploading'].includes(state))return;const prevent=(event:BeforeUnloadEvent)=>{event.preventDefault();};window.addEventListener('beforeunload',prevent);return()=>window.removeEventListener('beforeunload',prevent);},[state]);
 async function finish(id:string){const {error}=await bauDb.rpc('talki_bau_finish_upload',{target:id});if(error)throw error;}
 async function send(file:File,existing?:BauFile){
  if(state==='preparing'||state==='uploading'||state==='paused')return;
  let row=existing;
  setState('preparing');setName(file.name);setProgress(0);setError('');
  try{
   const details=fileDetails(file);
   if(row&&(row.nome!==file.name||row.tamanho!==file.size))throw new Error('Selecione o mesmo arquivo do envio pendente, com o mesmo nome e tamanho.');
   if(row){try{await finish(row.id);if(mounted.current){setState('idle');onChange();toast.success('Arquivo concluído.');}return;}catch{/* Not uploaded yet; resume below. */}}
   if(!row){
    let texto='';if(details.tipo==='transcricao'){const {extractTranscript}=await import('@/lib/bau-transcript');const result=await extractTranscript(file);texto=result.text;if(result.warning)toast.warning(result.warning);}
    if(!mounted.current)return;
    const id=crypto.randomUUID();
    const {data,error}=await bauDb.from('talki_bau_files').insert({id,entry_id:entryId,owner_id:userId,nome:file.name,tipo:details.tipo,mime:details.mime,tamanho:file.size,path:storagePath(userId,entryId,id),texto}).select('*').single();if(error)throw error;row=data as BauFile;onChange();
   }
   const target=row!;
   const endpoint=new URL(import.meta.env.VITE_SUPABASE_URL);if(endpoint.hostname.endsWith('.supabase.co'))endpoint.hostname=endpoint.hostname.replace('.supabase.co','.storage.supabase.co');
   endpoint.pathname='/storage/v1/upload/resumable';
   const task=new TusUpload(file,{
    endpoint:endpoint.toString(),chunkSize:6*1024*1024,retryDelays:[0,3000,5000,10000,20000],uploadDataDuringCreation:true,removeFingerprintOnSuccess:true,
    fingerprint:async()=>`talki-bau:${target.path}:${file.size}:${file.lastModified}`,
    metadata:{bucketName:BAU_BUCKET,objectName:target.path,contentType:target.mime,cacheControl:'3600'},
    onBeforeRequest:async request=>{const {data:{session}}=await supabase.auth.getSession();if(!session)throw new Error('Entre novamente para continuar o envio.');request.setHeader('Authorization',`Bearer ${session.access_token}`);request.setHeader('apikey',import.meta.env.VITE_SUPABASE_ANON_KEY);},
    onProgress:(sent,total)=>{if(mounted.current)setProgress(Math.round(sent/total*100));},
    onError:()=>{if(mounted.current){setState('error');setError('O envio foi interrompido. Use “Retomar envio” e selecione o mesmo arquivo.');onChange();}},
    onSuccess:()=>{void finish(target.id).then(()=>{if(mounted.current){setState('idle');toast.success('Arquivo guardado no Baú.');onChange();}}).catch(e=>{if(mounted.current){setState('error');setError(errorMessage(e));onChange();}});},
   });
   upload.current=task;const previous=await task.findPreviousUploads();if(previous.length)task.resumeFromPreviousUpload(previous[0]);
   if(!mounted.current)return;setState('uploading');task.start();
  }catch(e){if(mounted.current){setState('error');setError(errorMessage(e));onChange();}}
 }
 const blocked=['preparing','uploading','paused'].includes(state);
 useEffect(()=>{onBusyChange(blocked);return()=>onBusyChange(false);},[blocked,onBusyChange]);
 return <div className="space-y-3">
  <input ref={input} type="file" accept={BAU_ACCEPT} className="sr-only" aria-label="Selecionar áudio ou transcrição" disabled={blocked} onChange={e=>{const file=e.target.files?.[0];if(file)void send(file,resumeFile.current??undefined);resumeFile.current=null;e.target.value='';}}/>
  <button disabled={blocked} onClick={()=>{resumeFile.current=null;input.current?.click();}} className="flex w-full flex-col items-center gap-2 rounded-2xl border border-dashed border-primary/40 bg-primary/5 px-5 py-7 text-center transition hover:bg-primary/10 disabled:opacity-50"><UploadCloud className="size-7 text-primary"/><span className="text-sm font-medium">Adicionar áudio ou transcrição</span><span className="text-xs text-muted-foreground">Áudios até {formatBytes(MAX_AUDIO_BYTES)} · TXT, MD, SRT, VTT, DOCX e PDF até 20 MB</span></button>
  {state!=='idle'&&<div className="space-y-2 rounded-xl border border-border p-3"><div className="flex items-center justify-between gap-3"><p className="truncate text-sm">{name}</p><span className="text-xs tabular-nums">{state==='preparing'?'Preparando…':`${progress}%`}</span></div><progress aria-label="Progresso do envio" className="h-2 w-full accent-primary" value={progress} max={100}/>{state==='uploading'&&<Button size="sm" variant="outline" onClick={async()=>{await upload.current?.abort();setState('paused');}}><Pause/>Pausar envio</Button>}{state==='paused'&&<Button size="sm" variant="outline" onClick={()=>{setState('uploading');upload.current?.start();}}><Play/>Continuar envio</Button>}{error&&<p role="alert" className="text-xs text-destructive">{error}</p>}<p className="text-xs text-muted-foreground">Ao sair desta página, o envio é pausado. Selecione o mesmo arquivo para retomá-lo.</p></div>}
  {pending.length>0&&<div className="space-y-2">{pending.map(file=><div key={file.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-muted/40 p-3"><div className="min-w-0"><p className="max-w-xs truncate text-sm">{file.nome}</p><p className="text-xs text-muted-foreground">Envio pendente · {formatBytes(file.tamanho)}</p></div><Button variant="outline" size="sm" disabled={blocked} onClick={()=>{resumeFile.current=file;input.current?.click();}}>Retomar envio</Button></div>)}</div>}
 </div>;
}

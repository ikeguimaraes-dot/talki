import {useCallback,useEffect,useState} from 'react';
import {Download,FileText,LoaderCircle,Sparkles} from 'lucide-react';
import {toast} from 'sonner';
import {Button} from '@/components/ui/button';
import {bauDb,errorMessage,type BauFile} from '@/lib/bau';
import {requestAudioProcessing} from '@/lib/bau-ai';

type MeetingSummary={titulo:string;informacoes:{data:string;local:string;participantes:string[]};temas:{titulo:string;pontos:string[]}[];proximos_passos:{acao:string;responsavel:string;prazo:string}[];sugestoes:string[]};
type AudioJob={file_id:string;status:'queued'|'transcribing'|'summarizing'|'completed'|'error';cursor_seconds:number;transcript:string;summary:MeetingSummary|null;error:string|null};
const labels={queued:'Na fila',transcribing:'Transcrevendo áudio',summarizing:'Gerando resumo',completed:'Concluído',error:'Processamento interrompido'};
function summaryText(summary:MeetingSummary){return [summary.titulo,'','Informações da Reunião',`Data: ${summary.informacoes.data}`,`Local: ${summary.informacoes.local}`,`Participantes: ${summary.informacoes.participantes.join(', ')||'Não informado'}`,'','Notas da Reunião',...summary.temas.flatMap(t=>[t.titulo,...t.pontos.map(p=>'• '+p),'']),'Próximos Passos',...summary.proximos_passos.map(p=>`• ${p.acao}\nResponsável: ${p.responsavel} · Prazo: ${p.prazo}`),'','Sugestões da IA',...summary.sugestoes.map(p=>'• '+p)].join('\n');}
function downloadText(name:string,text:string){const url=URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
export function AudioResults({entryId,files,owner}:{entryId:string;files:BauFile[];owner:boolean}){
 const [jobs,setJobs]=useState<AudioJob[]>([]),[error,setError]=useState(''),[starting,setStarting]=useState<string|null>(null);
 const audioIds=files.filter(f=>f.tipo==='audio'&&f.pronto).map(f=>f.id).join(',');
 const load=useCallback(async()=>{const {data,error}=await bauDb.from('talki_bau_ai_jobs').select('file_id,status,cursor_seconds,transcript,summary,error').eq('entry_id',entryId);if(error){setError('Não foi possível carregar as transcrições automáticas.');return;}setJobs(data??[]);setError('');},[entryId]);
 // eslint-disable-next-line react-hooks/set-state-in-effect -- Fetch persisted processing results when the meeting files change.
 useEffect(()=>{void load();},[load,audioIds]);
 const active=jobs.some(j=>!['completed','error'].includes(j.status));
 useEffect(()=>{if(!active)return;const timer=setInterval(()=>void load(),10000);return()=>clearInterval(timer);},[active,load]);
 useEffect(()=>{const refresh=()=>void load();window.addEventListener('focus',refresh);return()=>window.removeEventListener('focus',refresh);},[load]);
 async function start(fileId:string){setStarting(fileId);try{await requestAudioProcessing(fileId);toast.success('Transcrição e resumo iniciados. Você pode sair desta página.');await load();}catch(e){toast.error(errorMessage(e));}finally{setStarting(null);}}
 if(!audioIds)return null;
 return <section className="space-y-4" aria-label="Transcrições e resumos dos áudios"><h3 className="flex items-center gap-2 text-lg font-semibold"><Sparkles className="size-5 text-primary"/>Gerado a partir dos áudios</h3>{error&&<p role="alert" className="text-sm text-destructive">{error} <button className="underline" onClick={()=>void load()}>Tentar novamente</button></p>}
  {files.filter(f=>f.tipo==='audio'&&f.pronto).map(file=>{const job=jobs.find(j=>j.file_id===file.id);const processing=job&&!['completed','error'].includes(job.status);return <article key={file.id} className="space-y-4 rounded-2xl border border-border bg-card/50 p-5"><div className="flex flex-wrap items-center justify-between gap-3"><h4 className="break-words font-medium">{file.nome}</h4>{job&&<span role="status" className="flex items-center gap-2 text-xs text-muted-foreground">{processing&&<LoaderCircle className="size-3.5 animate-spin"/>}{labels[job.status]}</span>}</div>
   {processing&&<p className="text-sm text-muted-foreground">{job.status==='summarizing'?'A transcrição terminou. Estamos organizando o resumo da reunião.':job.cursor_seconds>0?`${Math.floor(job.cursor_seconds/60)} minutos de áudio processados.`:'O áudio está na fila de processamento.'} Você pode fechar a página; o processamento continua.</p>}
   {job?.error&&<p role="alert" className="text-sm text-destructive">{job.error}</p>}
   {owner&&(!job||job.status==='error')&&<Button disabled={starting!==null} onClick={()=>void start(file.id)}><Sparkles/>{starting===file.id?'Iniciando…':job?'Tentar novamente':'Gerar transcrição e resumo'}</Button>}
   {!job&&!owner&&<p className="text-sm text-muted-foreground">A transcrição ainda não foi solicitada pelo responsável.</p>}
   {job?.summary&&<div className="space-y-5 text-sm leading-7"><div className="flex flex-wrap items-center justify-between gap-2"><h4 className="text-lg font-semibold">{job.summary.titulo}</h4><Button variant="outline" size="sm" onClick={()=>downloadText(`${file.nome}-resumo.txt`,summaryText(job.summary!))}><Download/>Baixar resumo</Button></div>
    <div><h5 className="font-semibold">Informações da Reunião</h5><p>Data: {job.summary.informacoes.data}</p><p>Local: {job.summary.informacoes.local}</p><p>Participantes: {job.summary.informacoes.participantes.join(', ')||'Não informado'}</p></div>
    <div className="space-y-4"><h5 className="font-semibold">Notas da Reunião</h5>{job.summary.temas.map((tema,i)=><div key={i}><h6 className="font-medium">{tema.titulo}</h6><ul className="mt-2 list-disc space-y-2 pl-5">{tema.pontos.map((p,n)=><li key={n} className="whitespace-pre-wrap break-words">{p}</li>)}</ul></div>)}</div>
    <div><h5 className="font-semibold">Próximos Passos</h5>{job.summary.proximos_passos.length?<ul className="mt-2 list-disc space-y-3 pl-5">{job.summary.proximos_passos.map((p,i)=><li key={i}><p className="break-words">{p.acao}</p><p className="text-xs text-muted-foreground">Responsável: {p.responsavel} · Prazo: {p.prazo}</p></li>)}</ul>:<p className="text-muted-foreground">Nenhuma ação combinada foi identificada.</p>}</div>
    <div><h5 className="font-semibold">Sugestões da IA</h5><p className="text-xs text-muted-foreground">Recomendações geradas pela IA; não representam decisões tomadas na reunião.</p><ul className="mt-2 list-disc space-y-2 pl-5">{job.summary.sugestoes.map((p,i)=><li key={i} className="break-words">{p}</li>)}</ul></div>
   </div>}
   {job?.transcript&&<details className="rounded-xl border border-border p-4"><summary className="cursor-pointer text-sm font-medium">{job.status==='completed'||job.status==='summarizing'?'Transcrição completa':'Transcrição disponível até agora'}</summary><Button size="sm" variant="outline" className="my-3" onClick={()=>downloadText(`${file.nome}-transcricao.txt`,job.transcript)}><FileText/>Baixar transcrição</Button><p className="max-h-[560px] overflow-y-auto whitespace-pre-wrap break-words text-sm leading-7">{job.transcript}</p></details>}
  </article>;})}
 </section>;
}

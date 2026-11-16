import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { canSend, canReview, checklistComplete, formatDeliveryDate, stateLabels, type Execution, type DeliveryEvent } from '@/lib/entregas';
import { saveChecklist, moveDelivery, deliveryHistory } from '@/lib/entregas-api';
export function ExecutionCard({execution:e,userId,reload}:{execution:Execution;userId:string;reload:()=>Promise<void>}){
 const [checked,setChecked]=useState(e.checklist_respostas);
 const [text,setText]=useState('');const [busy,setBusy]=useState(false);
 const [history,setHistory]=useState<DeliveryEvent[]|null>(null);const [historyError,setHistoryError]=useState('');
 const editable=canSend(e,userId);const review=canReview(e,userId);
 const dirty=checked.length!==e.checklist_respostas.length||checked.some(s=>!e.checklist_respostas.includes(s));
 async function act(action:'checklist'|'enviar'|'aceitar'|'devolver'){
  if((action==='enviar'||action==='devolver')&&text.trim().length<10){toast.error('Descreva a evidência ou motivo com pelo menos 10 caracteres.');return;}
  setBusy(true);
  try{if(action==='checklist')await saveChecklist(e,checked);else await moveDelivery(e,action,text.trim());toast.success(action==='checklist'?'Checklist salvo.':'Entrega atualizada.');await reload();}
  catch(error){toast.error(error instanceof Error?error.message:'Não foi possível salvar.');}
  finally{setBusy(false);}
 }
 return <article className="rounded-2xl border border-border bg-card p-5 space-y-4" id={`entrega-${e.id}`}>
  <div className="flex flex-wrap justify-between gap-2 text-sm text-muted-foreground"><span>{stateLabels[e.status]??e.status}</span><span>Prazo: {formatDeliveryDate(e.vence_em)}</span></div>
  <h2 className="text-lg font-semibold">{e.titulo}</h2><p>{e.contexto}</p>
  <p className="text-sm text-muted-foreground">Responsável: {e.responsavel_nome} · Gestor: {e.gestor_nome}</p>
  <details><summary className="cursor-pointer py-2">Critérios da entrega</summary><p className="whitespace-pre-wrap text-sm">{e.criterios}</p></details>
  {e.checklist.length>0&&<fieldset disabled={!editable||busy} className="space-y-2"><legend className="font-medium">Checklist · {e.checklist_respostas.length}/{e.checklist.length} etapas salvas</legend>{e.checklist.map(step=><label key={step} className="flex gap-3 py-2 text-sm"><input className="mt-1 size-4 shrink-0 accent-primary" type="checkbox" checked={checked.includes(step)} onChange={ev=>setChecked(ev.target.checked?[...checked,step]:checked.filter(s=>s!==step))}/><span>{step}</span></label>)}{editable&&<Button variant="outline" disabled={busy||!dirty} onClick={()=>void act('checklist')}>Salvar checklist</Button>}</fieldset>}
  {e.evidencia&&<div><h3 className="font-medium">Evidência enviada</h3><p className="whitespace-pre-wrap break-words text-sm">{e.evidencia}</p></div>}
  {e.motivo&&<p className="whitespace-pre-wrap text-sm">Devolução: {e.motivo}</p>}
  {(editable||review)&&<div className="space-y-3"><label className="block space-y-2"><span className="text-sm">{editable?'Evidência: resumo e link do documento':'Comentário da controladoria / gestor'}</span><Textarea value={text} onChange={ev=>setText(ev.target.value)} maxLength={8000} rows={3}/></label><div className="flex flex-wrap gap-2">{editable?<Button disabled={busy||dirty||!checklistComplete(e)||text.trim().length<10} onClick={()=>void act('enviar')}>Enviar para validação</Button>:<><Button disabled={busy} onClick={()=>void act('aceitar')}>Aceitar entrega</Button><Button variant="outline" disabled={busy||text.trim().length<10} onClick={()=>void act('devolver')}>Devolver com motivo</Button></>}</div>{editable&&<p className="text-xs text-muted-foreground">Salve todas as etapas e informe a evidência. A conclusão depende do aceite do gestor.</p>}</div>}
  <details onToggle={ev=>{if(ev.currentTarget.open&&history===null)void deliveryHistory(e.id).then(setHistory).catch(()=>setHistoryError('Não foi possível carregar o histórico.'));}}><summary className="cursor-pointer py-2 text-sm">Histórico de conferência</summary>{historyError?<p role="alert">{historyError}</p>:history===null?<p>Carregando…</p>:history.length===0?<p>Sem eventos registrados.</p>:history.map(h=><p className="text-sm whitespace-pre-wrap break-words my-3" key={h.id}><strong>{h.acao}</strong> · {formatDeliveryDate(h.criado_em)}<br/>{h.texto}</p>)}</details>
 </article>;
}

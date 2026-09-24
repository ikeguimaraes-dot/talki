import {useState,type FormEvent} from 'react';
import {toast} from 'sonner';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {bauDb,errorMessage,type BauEntry,type BauOptions} from '@/lib/bau';
import {agendaDay,dayLabel} from '@/lib/agenda';
export function EntryDialog({entry,options,userId,onClose,onSaved}:{entry?:BauEntry;options:BauOptions;userId:string;onClose:()=>void;onSaved:(id:string)=>void}){
 const [title,setTitle]=useState(entry?.titulo??''),[day,setDay]=useState(entry?.data_reuniao??agendaDay()),[participants,setParticipants]=useState(entry?.participantes??''),[notes,setNotes]=useState(entry?.notas??''),[plan,setPlan]=useState(entry?.plan_id??''),[agenda,setAgenda]=useState(entry?.agenda_event_id??''),[busy,setBusy]=useState(false);
 async function save(e:FormEvent){e.preventDefault();if(!title.trim()||busy)return;setBusy(true);try{
  const payload={titulo:title.trim(),data_reuniao:day,participantes:participants.trim(),notas:notes.trim(),plan_id:plan||null,agenda_event_id:agenda||null};
  const {data,error}=entry?await bauDb.from('talki_bau_entries').update(payload).eq('id',entry.id).eq('owner_id',userId).select('id').single():await bauDb.from('talki_bau_entries').insert({...payload,owner_id:userId}).select('id').single();if(error)throw error;
  toast.success(entry?'Registro atualizado.':'Registro criado. Agora adicione os arquivos.');onSaved(data.id);onClose();
 }catch(e){toast.error(errorMessage(e));}finally{setBusy(false);}}
 return <Dialog open onOpenChange={open=>{if(!open&&!busy)onClose();}}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl"><DialogHeader><DialogTitle>{entry?'Editar reunião':'Guardar uma reunião'}</DialogTitle><DialogDescription>Áudios, transcrições e contexto no mesmo lugar.</DialogDescription></DialogHeader><form onSubmit={save} className="space-y-4">
  <div className="space-y-2"><Label htmlFor="bau-title">Título</Label><Input id="bau-title" required autoFocus maxLength={240} placeholder="Ex.: Alinhamento semanal da equipe" value={title} onChange={e=>setTitle(e.target.value)}/></div>
  <div className="space-y-2"><Label htmlFor="bau-day">Data da reunião</Label><Input id="bau-day" required type="date" value={day} onChange={e=>setDay(e.target.value)}/></div>
  <div className="space-y-2"><Label htmlFor="bau-people">Participantes</Label><Input id="bau-people" maxLength={4000} placeholder="Nomes dos participantes" value={participants} onChange={e=>setParticipants(e.target.value)}/></div>
  <div className="space-y-2"><Label htmlFor="bau-plan">Projeto (opcional)</Label><select id="bau-plan" className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm" value={plan} onChange={e=>setPlan(e.target.value)}><option value="">Sem projeto</option>{options.projects.map(p=><option key={p.id} value={p.id}>{p.nome}</option>)}{plan&&!options.projects.some(p=>p.id===plan)&&<option value={plan}>Projeto indisponível</option>}</select><p className="text-xs text-muted-foreground">Vincular ao projeto não compartilha o registro.{entry?.compartilhar_projeto&&plan!==entry.plan_id?' Ao trocar o projeto, o compartilhamento com ele será desativado.':''}</p></div>
  <div className="space-y-2"><Label htmlFor="bau-agenda">Compromisso da Agenda (opcional)</Label><select id="bau-agenda" className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm" value={agenda} onChange={e=>{setAgenda(e.target.value);const event=options.events.find(a=>a.id===e.target.value);if(event){if(!title)setTitle(event.titulo);setDay(agendaDay(event.inicio));if(!plan&&event.plan_id)setPlan(event.plan_id);}}}><option value="">Sem compromisso vinculado</option>{options.events.map(a=><option key={a.id} value={a.id}>{dayLabel(agendaDay(a.inicio))} · {a.titulo}</option>)}{agenda&&!options.events.some(a=>a.id===agenda)&&<option value={agenda}>Compromisso indisponível</option>}</select></div>
  <div className="space-y-2"><Label htmlFor="bau-notes">Contexto e observações</Label><textarea id="bau-notes" className="min-h-24 w-full rounded-lg border border-input bg-background p-3 text-sm" maxLength={20000} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Pauta e informações que ajudam a encontrar esta reunião depois"/></div>
  <div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={busy} onClick={onClose}>Cancelar</Button><Button disabled={busy}>{busy?'Salvando…':entry?'Salvar':'Criar registro'}</Button></div>
 </form></DialogContent></Dialog>;
}

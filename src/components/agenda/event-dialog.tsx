import { useState, type FormEvent } from 'react';
import { ExternalLink, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { agendaDay, agendaTime, dayInstant, EVENT_KINDS, shiftDay, validMeetingLink, type AgendaEvent, type AgendaKind } from '@/lib/agenda';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/supabase';
const db:SupabaseClient=supabase;
export interface AgendaDraft {event?:AgendaEvent;day:string;time:string}
export function EventDialog({draft,userId,projects,onClose,onSaved}:{draft:AgendaDraft;userId:string;projects:{id:string;nome:string}[];onClose:()=>void;onSaved:()=>void}) {
 const event=draft.event;
 const [title,setTitle]=useState(event?.titulo??'');
 const [kind,setKind]=useState<AgendaKind>(event?.tipo??'reuniao');
 const [allDay,setAllDay]=useState(event?.dia_inteiro??false);
 const [startDay,setStartDay]=useState(event?agendaDay(event.inicio):draft.day);
 const [endDay,setEndDay]=useState(event?agendaDay(event.dia_inteiro?new Date(Date.parse(event.fim)-1):event.fim):draft.time==='23:30'?shiftDay(draft.day,1):draft.day);
 const [startTime,setStartTime]=useState(event?agendaTime(event.inicio):draft.time);
 const [endTime,setEndTime]=useState(event?agendaTime(event.fim):agendaTime(new Date(Date.parse(dayInstant(draft.day,draft.time))+30*60000).toISOString()));
 const [plan,setPlan]=useState(event?.plan_id??'');
 const [location,setLocation]=useState(event?.local??'');
 const [link,setLink]=useState(event?.link??'');
 const [description,setDescription]=useState(event?.descricao??'');
 const [busy,setBusy]=useState(false),[confirmDelete,setConfirmDelete]=useState(false);
 const editable=!event||event.owner_id===userId;
 async function save(e:FormEvent){
  e.preventDefault();if(!editable||busy)return;
  const inicio=dayInstant(startDay,allDay?'00:00':startTime),fim=dayInstant(allDay?shiftDay(endDay,1):endDay,allDay?'00:00':endTime);
  if(!title.trim()){toast.error('Informe o título do compromisso.');return;}
  if(Date.parse(fim)<=Date.parse(inicio)){toast.error('O término deve ser depois do início.');return;}
  if(!validMeetingLink(link)){toast.error('Use um link completo começando com https:// ou http://.');return;}
  setBusy(true);
  try{
   const payload={titulo:title.trim(),tipo:kind,dia_inteiro:allDay,inicio,fim,plan_id:plan||null,local:location.trim(),link:link.trim(),descricao:description.trim()};
   const result=event?await db.from('talki_agenda_events').update(payload).eq('id',event.id).eq('owner_id',userId).select('id').single():await db.from('talki_agenda_events').insert({...payload,owner_id:userId}).select('id').single();
   if(result.error)throw result.error;
   toast.success(event?'Compromisso atualizado.':'Compromisso criado.');onSaved();onClose();
  }catch(error){toast.error(error instanceof Error?error.message:'Não foi possível salvar. Tente novamente.');}finally{setBusy(false);}
 }
 async function remove(){if(!event||!editable||busy)return;setBusy(true);try{const {error}=await db.from('talki_agenda_events').delete().eq('id',event.id).eq('owner_id',userId).select('id').single();if(error)throw error;toast.success('Compromisso excluído.');onSaved();onClose();}catch{toast.error('Não foi possível excluir o compromisso.');}finally{setBusy(false);}}
 return <Dialog open onOpenChange={open=>{if(!open&&!busy)onClose();}}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[580px]"><DialogHeader><DialogTitle>{event?editable?'Editar compromisso':'Detalhes do compromisso':'Novo compromisso'}</DialogTitle><DialogDescription>{editable?'Organize seu tempo. Horários de São Paulo.':'Compartilhado com o projeto. Somente quem criou pode editar.'}</DialogDescription></DialogHeader>
  <form onSubmit={save} className="space-y-5">
   <fieldset disabled={!editable||busy} className="space-y-4 disabled:opacity-90">
    <div className="space-y-2"><Label htmlFor="agenda-title">Título</Label><Input id="agenda-title" autoFocus required maxLength={240} placeholder="Ex.: Reunião de alinhamento" value={title} onChange={e=>setTitle(e.target.value)}/></div>
    <div className="flex flex-wrap items-center gap-2">{(['reuniao','entrega'] as const).map(type=><Button key={type} type="button" variant={kind===type?'default':'outline'} size="sm" aria-pressed={kind===type} onClick={()=>setKind(type)}>{EVENT_KINDS[type].label}</Button>)}<label className="ml-auto flex items-center gap-2 text-sm"><input type="checkbox" checked={allDay} onChange={e=>setAllDay(e.target.checked)}/>Dia inteiro</label></div>
    <div className="grid grid-cols-2 gap-3">
     <div className="space-y-2"><Label htmlFor="agenda-start">Início</Label><Input id="agenda-start" type="date" required value={startDay} onChange={e=>{setStartDay(e.target.value);if(e.target.value>endDay)setEndDay(e.target.value);}}/></div>
     <div className="space-y-2"><Label htmlFor="agenda-end">{allDay?'Último dia':'Término'}</Label><Input id="agenda-end" type="date" min={startDay} required value={endDay} onChange={e=>setEndDay(e.target.value)}/></div>
     {!allDay&&<><div className="space-y-2"><Label htmlFor="agenda-start-time">Das</Label><Input id="agenda-start-time" type="time" required value={startTime} onChange={e=>setStartTime(e.target.value)}/></div><div className="space-y-2"><Label htmlFor="agenda-end-time">Até</Label><Input id="agenda-end-time" type="time" required value={endTime} onChange={e=>setEndTime(e.target.value)}/></div></>}
    </div>
    <div className="space-y-2"><Label htmlFor="agenda-project">Visibilidade</Label><select id="agenda-project" className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm" value={plan} onChange={e=>setPlan(e.target.value)}><option value="">Pessoal · só você</option>{projects.map(p=><option key={p.id} value={p.id}>Projeto · {p.nome}</option>)}{plan&&!projects.some(p=>p.id===plan)&&<option value={plan}>Projeto indisponível</option>}</select><p className="text-xs text-muted-foreground">{plan?'Os membros do projeto podem visualizar este compromisso.':'Este compromisso fica visível apenas para você.'}</p></div>
    <div className="space-y-2"><Label htmlFor="agenda-location">Local</Label><Input id="agenda-location" maxLength={500} placeholder="Sala, endereço ou reunião online" value={location} onChange={e=>setLocation(e.target.value)}/></div>
    <div className="space-y-2"><Label htmlFor="agenda-link">Link da reunião</Label><Input id="agenda-link" type="url" maxLength={2000} placeholder="https://meet.google.com/..." value={link} onChange={e=>setLink(e.target.value)}/></div>
    <div className="space-y-2"><Label htmlFor="agenda-description">Descrição</Label><textarea id="agenda-description" className="min-h-24 w-full rounded-lg border border-input bg-background p-3 text-sm" maxLength={10000} placeholder="Pauta, participantes ou detalhes da entrega" value={description} onChange={e=>setDescription(e.target.value)}/></div>
   </fieldset>
   {event?.link&&validMeetingLink(event.link)&&<a href={event.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-sm text-primary"><ExternalLink className="size-4"/>Abrir link da reunião</a>}
   {confirmDelete?<div className="space-y-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4"><p className="text-sm">Excluir “{event?.titulo}” da agenda?</p><div className="flex gap-2"><Button type="button" variant="destructive" disabled={busy} onClick={()=>void remove()}>Excluir compromisso</Button><Button type="button" variant="outline" disabled={busy} onClick={()=>setConfirmDelete(false)}>Cancelar</Button></div></div>:<div className="flex items-center justify-between gap-2">{event&&editable?<Button type="button" variant="ghost" className="text-destructive" disabled={busy} onClick={()=>setConfirmDelete(true)}><Trash2/>Excluir</Button>:<span/>}<div className="flex gap-2"><Button type="button" variant="outline" disabled={busy} onClick={onClose}>{editable?'Cancelar':'Fechar'}</Button>{editable&&<Button type="submit" disabled={busy}>{busy?'Salvando…':'Salvar compromisso'}</Button>}</div></div>}
  </form>
 </DialogContent></Dialog>;
}

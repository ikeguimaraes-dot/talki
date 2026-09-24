import { useEffect, useMemo, useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { CalendarDays, ChevronLeft, ChevronRight, Plus, RefreshCw, Search } from 'lucide-react';
import { supabase } from '@/supabase';
import { useCurrentUser } from '@/hooks/use-current-user';
import { usePageHeader } from '@/hooks/use-page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MonthView, TimeView, ListView } from '@/components/agenda/calendar-views';
import { EventDialog, type AgendaDraft } from '@/components/agenda/event-dialog';
import { buildMonthGrid, DIAS_SEMANA, toIso } from '@/lib/calendar-grid';
import { agendaDay, dayDate, dayInstant, dayLabel, EVENT_KINDS, shiftDay, weekDays, type AgendaEvent, type AgendaKind } from '@/lib/agenda';
import { cn } from '@/lib/utils';
const db:SupabaseClient=supabase;
type View='dia'|'semana'|'mes'|'lista';
const views:{id:View;label:string}[]=[{id:'dia',label:'Dia'},{id:'semana',label:'Semana'},{id:'mes',label:'Mês'},{id:'lista',label:'Lista'}];
export function AgendaPage(){
 usePageHeader({title:'Agenda'});
 const user=useCurrentUser();
 const [anchor,setAnchor]=useState(()=>agendaDay()),[view,setView]=useState<View>(()=>window.innerWidth<768?'lista':'semana');
 const [events,setEvents]=useState<AgendaEvent[]>([]),[projects,setProjects]=useState<{id:string;nome:string}[]>([]);
 const [loading,setLoading]=useState(true),[error,setError]=useState(''),[revision,setRevision]=useState(0),[draft,setDraft]=useState<AgendaDraft|null>(null);
 const [search,setSearch]=useState(''),[scope,setScope]=useState('all'),[types,setTypes]=useState<AgendaKind[]>(['reuniao','entrega']);
 const monthDays=useMemo(()=>buildMonthGrid(dayDate(anchor)).map(toIso),[anchor]);
 const first=monthDays[0],last=shiftDay(monthDays[41],1);
 useEffect(()=>{
  let live=true;
  async function load(){setLoading(true);setError('');try{
   const rows:AgendaEvent[]=[];
   for(let offset=0;;offset+=500){const {data,error}=await db.from('talki_agenda_events').select('*').lt('inicio',dayInstant(last)).gt('fim',dayInstant(first)).order('inicio').order('id').range(offset,offset+499);if(error)throw error;rows.push(...data);if(data.length<500)break;}
   const plans:{id:string;nome:string}[]=[];
   for(let offset=0;;offset+=500){const {data,error}=await db.from('plans').select('id,nome').order('id').range(offset,offset+499);if(error)throw error;plans.push(...data);if(data.length<500)break;}
   if(live){setEvents(rows);setProjects(plans.sort((a,b)=>a.nome.localeCompare(b.nome)));}
  }catch(e){if(live)setError(e instanceof Error?e.message:'Não foi possível carregar a agenda. Tente novamente.');}finally{if(live)setLoading(false);}}
  void load();return()=>{live=false;};
 },[first,last,revision,user.id]);
 useEffect(()=>{const refresh=()=>setRevision(n=>n+1);window.addEventListener('focus',refresh);return()=>window.removeEventListener('focus',refresh);},[]);
 const filtered=events.filter(e=>types.includes(e.tipo)&&(scope==='all'||(scope==='personal'?!e.plan_id:e.plan_id===scope))&&`${e.titulo} ${e.descricao} ${e.local}`.toLocaleLowerCase('pt-BR').includes(search.toLocaleLowerCase('pt-BR')));
 const days=view==='dia'?[anchor]:view==='semana'?weekDays(anchor):monthDays.filter(day=>day.slice(0,7)===anchor.slice(0,7));
 function navigate(direction:number){if(view==='mes'||view==='lista'){const date=dayDate(anchor);setAnchor(toIso(new Date(date.getFullYear(),date.getMonth()+direction,1)));}else setAnchor(shiftDay(anchor,direction*(view==='semana'?7:1)));}
 function create(day=anchor,time='09:00'){setDraft({day,time});}
 function open(event:AgendaEvent){setDraft({event,day:agendaDay(event.inicio),time:'09:00'});}
 const heading=view==='dia'?dayLabel(anchor,{day:'numeric',month:'long',year:'numeric'}):view==='semana'?`${dayLabel(days[0],{day:'numeric',month:'short'})} – ${dayLabel(days[6],{day:'numeric',month:'short',year:'numeric'})}`:dayLabel(anchor,{month:'long',year:'numeric'});
 return <div className="space-y-5 pb-5">
  <section className="flex flex-wrap items-end justify-between gap-4"><div><p className="eyebrow mb-2 flex items-center gap-2"><CalendarDays className="size-3 text-primary"/>Seu tempo, com intenção</p><h2 className="text-3xl font-semibold tracking-[-0.05em]">Agenda</h2><p className="mt-2 text-sm text-muted-foreground">Reuniões e entregas, em um só lugar.</p></div><Button className="rounded-xl" onClick={()=>create()}><Plus/>Criar compromisso</Button></section>
  <div className="flex gap-5">
   <aside className="hidden w-52 shrink-0 space-y-6 xl:block">
    <div className="rounded-xl border border-border p-3"><p className="mb-3 text-sm font-medium capitalize">{dayLabel(anchor,{month:'long',year:'numeric'})}</p><div className="grid grid-cols-7 gap-y-1 text-center">{DIAS_SEMANA.map(day=><span key={day} className="py-1 text-[9px] uppercase text-muted-foreground">{day.slice(0,1)}</span>)}{monthDays.map(day=><button key={day} onClick={()=>setAnchor(day)} aria-label={dayLabel(day)} className={cn('mx-auto flex size-6 items-center justify-center rounded-full text-[11px] hover:bg-accent',day===anchor?'bg-primary text-primary-foreground':day===agendaDay()?'text-primary font-bold':day.slice(0,7)!==anchor.slice(0,7)&&'text-muted-foreground/50')}>{dayDate(day).getDate()}</button>)}</div></div>
    <div className="space-y-3"><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Meus compromissos</p>{(['reuniao','entrega'] as const).map(type=><label key={type} className="flex cursor-pointer items-center gap-3 text-sm"><input type="checkbox" checked={types.includes(type)} style={{accentColor:EVENT_KINDS[type].color}} onChange={e=>setTypes(current=>e.target.checked?[...current,type]:current.filter(t=>t!==type))}/>{EVENT_KINDS[type].plural}</label>)}</div>
    <p className="text-xs leading-5 text-muted-foreground">Horários de São Paulo.<br/>Clique em um horário para agendar.</p>
   </aside>
   <div className="min-w-0 flex-1 space-y-3">
    <div className="flex flex-wrap items-center gap-2"><Button variant="outline" size="sm" onClick={()=>setAnchor(agendaDay())}>Hoje</Button><Button variant="ghost" size="icon-sm" aria-label="Período anterior" onClick={()=>navigate(-1)}><ChevronLeft/></Button><Button variant="ghost" size="icon-sm" aria-label="Próximo período" onClick={()=>navigate(1)}><ChevronRight/></Button><h3 className="flex-1 text-sm font-semibold capitalize sm:text-lg">{heading}</h3><div className="flex rounded-lg border border-border p-1" aria-label="Visualização da agenda">{views.map(v=><button key={v.id} onClick={()=>setView(v.id)} aria-pressed={view===v.id} className={cn('rounded-md px-3 py-1.5 text-xs',view===v.id?'bg-primary text-primary-foreground':'text-muted-foreground hover:bg-accent')}>{v.label}</button>)}</div></div>
    <div className="flex flex-wrap gap-2"><div className="relative min-w-40 flex-1"><Search className="absolute left-3 top-3 size-4 text-muted-foreground"/><Input aria-label="Buscar compromissos" className="pl-9" placeholder="Buscar na agenda deste período" value={search} onChange={e=>setSearch(e.target.value)}/></div><select aria-label="Filtrar agenda" value={scope} onChange={e=>setScope(e.target.value)} className="h-10 max-w-full rounded-lg border border-input bg-background px-3 text-sm"><option value="all">Todas as agendas</option><option value="personal">Pessoal</option>{projects.map(p=><option key={p.id} value={p.id}>{p.nome}</option>)}</select><Button variant="outline" size="icon" aria-label="Atualizar agenda" disabled={loading} onClick={()=>setRevision(n=>n+1)}><RefreshCw className={cn(loading&&'animate-spin')}/></Button></div>
    <div className="flex gap-2 xl:hidden">{(['reuniao','entrega'] as const).map(type=><button key={type} aria-pressed={types.includes(type)} onClick={()=>setTypes(current=>current.includes(type)?current.filter(t=>t!==type):[...current,type])} className={cn('rounded-full border px-3 py-1 text-xs',types.includes(type)?EVENT_KINDS[type].className:'border-border text-muted-foreground')}>{EVENT_KINDS[type].plural}</button>)}<span className="ml-auto self-center text-[10px] text-muted-foreground">São Paulo · GMT−3</span></div>
    {error?<div role="alert" className="rounded-xl border border-destructive/30 p-6"><p className="text-sm text-destructive">{error}</p><Button className="mt-3" variant="outline" onClick={()=>setRevision(n=>n+1)}>Tentar novamente</Button></div>:<div className={cn('overflow-hidden rounded-2xl border border-border bg-card/50',loading&&'opacity-60')} aria-busy={loading}>
     {view==='mes'?<MonthView anchor={anchor} events={filtered} onOpen={open} onCreate={day=>create(day)} onDay={day=>{setAnchor(day);setView('dia');}}/>:view==='lista'?<ListView days={days} events={filtered} onOpen={open} onCreate={day=>create(day)}/>:<TimeView key={view} days={days} events={filtered} onOpen={open} onCreate={create}/>}
    </div>}
   </div>
  </div>
  {draft&&<EventDialog draft={draft} userId={user.id} projects={projects} onClose={()=>setDraft(null)} onSaved={()=>setRevision(n=>n+1)}/>}
 </div>;
}

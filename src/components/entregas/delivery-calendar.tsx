import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ExecutionCard } from './execution-card';
import { calendarHistory } from '@/lib/entregas-api';
import { stateLabels, formatDeliveryDate, type Execution, type DeliveryEvent } from '@/lib/entregas';
import { addDays, calendarDays, dueRows, formatDay, isOverdue, localDay, shiftCalendar, type CalendarMode } from '@/lib/delivery-calendar';
const modes: [CalendarMode,string][]=[['day','Dia'],['week','Semana'],['month','Mês'],['timeline','Timeline']];
const tone=(e:Execution,now:Date)=>isOverdue(e,now)?'border-l-red-500':e.status==='concluida'?'border-l-emerald-500':e.status==='enviada'?'border-l-violet-500':e.status==='cancelada'?'border-l-muted-foreground':'border-l-sky-500';
function History({rows,days}:{rows:Execution[];days:string[]}){
 const ids=useMemo(()=>rows.map(e=>e.id).sort(),[rows]);
 const from=days[0],to=addDays(days.at(-1)!,1);
 const [state,setState]=useState<{events:DeliveryEvent[];loading:boolean;error:boolean}>({events:[],loading:true,error:false});
 useEffect(()=>{
  let live=true;
  void calendarHistory(ids,from,to).then(events=>{if(live)setState({events,loading:false,error:false});}).catch(()=>{if(live)setState({events:[],loading:false,error:true});});
  return()=>{live=false;};
 },[ids,from,to]);
 const titles=new Map(rows.map(e=>[e.id,e.titulo]));
 if(state.loading)return <p role="status" className="text-sm text-muted-foreground">Carregando histórico…</p>;
 if(state.error)return <p role="alert" className="text-sm text-destructive">Não foi possível consultar o histórico.</p>;
 return <div className="space-y-2"><p className="text-xs text-muted-foreground">Eventos registrados no Maestri no período, não estimativas de atividade.</p>{state.events.length===0?<p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">Nenhum evento registrado neste período.</p>:state.events.map(h=><div key={h.id} className="border-l-2 border-primary/40 pl-3 py-2"><p className="text-xs text-muted-foreground">{formatDeliveryDate(h.criado_em)} · {h.acao}</p><p className="text-sm font-medium">{titles.get(h.entrega_id)??'Entrega'}</p>{h.texto&&<p className="text-xs whitespace-pre-wrap break-words">{h.texto}</p>}</div>)}</div>;
}
export function DeliveryCalendar({rows,userId,reload}:{rows:Execution[];userId:string;reload:()=>Promise<void>}){
 const [mode,setMode]=useState<CalendarMode>('week');
 const [anchor,setAnchor]=useState(()=>localDay());
 const [selected,setSelected]=useState<string|null>(null);
 const now=new Date(),today=localDay(now);
 const days=calendarDays(anchor,mode);
 const label=mode==='month'?formatDay(anchor,{month:'long',year:'numeric'}):mode==='day'?formatDay(anchor,{weekday:'long',day:'numeric',month:'long',year:'numeric'}):formatDay(days[0])+' – '+formatDay(days.at(-1)!,{day:'2-digit',month:'short',year:'numeric'});
 const list=dueRows(rows,anchor);
 const active=rows.find(e=>e.id===selected);
 const historyKey=days[0]+':'+days.at(-1)+':'+rows.map(e=>e.id+':'+e.versao).join(',');
 const choose=(day:string)=>{setAnchor(day);setSelected(null);};
 return <section className="space-y-3 min-w-0">
  <div className="flex flex-wrap gap-1" role="group" aria-label="Visualização do calendário">{modes.map(([v,label])=><Button key={v} size="sm" variant={mode===v?'secondary':'ghost'} aria-pressed={mode===v} onClick={()=>{setMode(v);setSelected(null);}}>{label}</Button>)}</div>
  <div className="flex items-center justify-between gap-2 flex-wrap"><h3 className="font-semibold text-sm capitalize">{label}</h3><div className="flex gap-1"><Button size="icon-sm" variant="outline" aria-label="Período anterior" onClick={()=>choose(shiftCalendar(anchor,mode,-1))}><ChevronLeft/></Button><Button size="sm" variant="outline" onClick={()=>choose(today)}>Hoje</Button><Button size="icon-sm" variant="outline" aria-label="Próximo período" onClick={()=>choose(shiftCalendar(anchor,mode,1))}><ChevronRight/></Button></div></div>
  {mode==='timeline'?<History key={historyKey} rows={rows} days={days}/>:<>
   {mode!=='day'&&<div className="overflow-x-auto"><div className="grid grid-cols-7 gap-1 min-w-[280px]">
    {['Seg','Ter','Qua','Qui','Sex','Sáb','Dom'].map((d,i)=><div className="text-center text-[10px] text-muted-foreground" key={i}>{d}</div>)}
    {days.map(day=>{const events=dueRows(rows,day);const late=events.filter(e=>isOverdue(e,now)).length;return <button type="button" key={day} aria-label={formatDay(day,{dateStyle:'full'})+', '+events.length+' entregas'} aria-pressed={day===anchor} onClick={()=>choose(day)} className={'rounded-lg border p-1.5 min-h-12 flex flex-col gap-1 text-left '+(day===anchor?'border-primary bg-primary/10':'border-border hover:bg-muted')+(mode==='month'&&day.slice(0,7)!==anchor.slice(0,7)?' opacity-50':'')}><span className={'text-xs font-semibold '+(day===today?'text-primary':'')}>{Number(day.slice(-2))}</span>{events.length>0&&<span className={'text-[10px] '+(late?'text-red-500':'text-muted-foreground')}>{events.length}{late?' · '+late+' venc.':''}</span>}{mode==='week'&&events.slice(0,2).map(e=><span key={e.id} className={'hidden sm:block w-full truncate text-[10px] border-l-2 pl-1 '+tone(e,now)}>{e.titulo}</span>)}</button>;})}
   </div></div>}
   <div className="flex items-center justify-between gap-2"><h4 className="text-sm font-medium capitalize">{formatDay(anchor,{weekday:'long',day:'numeric',month:'long'})}</h4><span className="text-xs text-muted-foreground">{list.length} entregas</span></div>
   {list.length===0?<div className="rounded-xl border border-dashed p-4 text-center text-sm text-muted-foreground"><CalendarDays className="size-5 mx-auto mb-2"/>Nenhuma ocorrência programada para este dia.</div>:list.map(e=><button key={e.id} type="button" aria-expanded={selected===e.id} onClick={()=>setSelected(selected===e.id?null:e.id)} className={'w-full rounded-xl border border-border border-l-4 p-3 text-left '+tone(e,now)}><p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="size-3"/>{new Date(e.vence_em).toLocaleTimeString('pt-BR',{timeZone:'America/Sao_Paulo',hour:'2-digit',minute:'2-digit'})} · Prazo limite · {isOverdue(e,now)?'Vencida':stateLabels[e.status]??e.status}</p><p className="text-sm font-medium break-words">{e.titulo}</p><p className="text-xs text-muted-foreground">{e.contexto}</p></button>)}
   {active&&<ExecutionCard key={active.id+'-'+active.versao} execution={active} userId={userId} reload={reload}/>}
   <p className="text-xs text-muted-foreground">Horários de vencimento do Maestri (São Paulo). Não representam início ou duração estimada.</p>
  </>}
 </section>;
}

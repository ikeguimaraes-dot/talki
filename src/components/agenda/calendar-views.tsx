import { useEffect, useRef, useState } from 'react';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buildMonthGrid, DIAS_SEMANA, toIso } from '@/lib/calendar-grid';
import { agendaDay, agendaTime, dayDate, dayLabel, EVENT_KINDS, eventsOnDay, positionEvents, type AgendaEvent } from '@/lib/agenda';

function EventChip({event,onOpen}:{event:AgendaEvent;onOpen:(event:AgendaEvent)=>void}) {
 return <button onClick={()=>onOpen(event)} title={event.titulo} className={cn('block w-full truncate rounded-md border px-2 py-1 text-left text-xs font-medium transition hover:brightness-125',EVENT_KINDS[event.tipo].className)}>
  {!event.dia_inteiro&&<span className="mr-1 opacity-75">{agendaTime(event.inicio)}</span>}{event.titulo}
 </button>;
}
export function MonthView({anchor,events,onOpen,onCreate,onDay}:{anchor:string;events:AgendaEvent[];onOpen:(event:AgendaEvent)=>void;onCreate:(day:string)=>void;onDay:(day:string)=>void}) {
 const days=buildMonthGrid(dayDate(anchor));const today=agendaDay();
 return <div className="overflow-x-auto"><div className="grid min-w-[660px] grid-cols-7">
  {DIAS_SEMANA.map(d=><div key={d} className="border-b border-border py-3 text-center text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{d}</div>)}
  {days.map(date=>{const day=toIso(date),items=eventsOnDay(events,day);return <div key={day} className={cn('group min-h-[126px] border-b border-r border-border p-2',day.slice(0,7)!==anchor.slice(0,7)&&'bg-muted/25')}>
   <div className="mb-2 flex items-center justify-between"><button onClick={()=>onDay(day)} aria-label={`Ver ${dayLabel(day)}`} className={cn('flex size-7 items-center justify-center rounded-full text-xs hover:bg-accent',day===today?'bg-primary text-primary-foreground':day.slice(0,7)!==anchor.slice(0,7)?'text-muted-foreground':'text-foreground')}>{date.getDate()}</button><button onClick={()=>onCreate(day)} aria-label={`Criar compromisso em ${dayLabel(day)}`} className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-primary"><Plus className="size-3.5"/></button></div>
   <div className="space-y-1">{items.slice(0,3).map(e=><EventChip key={e.id} event={e} onOpen={onOpen}/>)}{items.length>3&&<button onClick={()=>onDay(day)} className="px-1 text-xs text-muted-foreground hover:text-foreground">+{items.length-3} compromissos</button>}</div>
  </div>;})}
 </div></div>;
}
export function TimeView({days,events,onOpen,onCreate}:{days:string[];events:AgendaEvent[];onOpen:(event:AgendaEvent)=>void;onCreate:(day:string,time:string)=>void}) {
 const scroll=useRef<HTMLDivElement>(null);
 const [now,setNow]=useState(()=>new Date().toISOString());
 useEffect(()=>{const timer=setInterval(()=>setNow(new Date().toISOString()),60000);return()=>clearInterval(timer);},[]);
 useEffect(()=>{if(scroll.current)scroll.current.scrollTop=7*64;},[]);
 const today=agendaDay(now);const currentMinutes=Number(agendaTime(now).slice(0,2))*60+Number(agendaTime(now).slice(3));
 return <div ref={scroll} className="max-h-[650px] overflow-auto">
  <div style={{minWidth:days.length>1?720:280}}>
   <div className="sticky top-0 z-20 grid bg-card backdrop-blur-xl" style={{gridTemplateColumns:`56px repeat(${days.length}, minmax(0, 1fr))`}}>
    <div className="border-b border-border p-2 pt-7 text-[10px] text-muted-foreground">GMT−3</div>
    {days.map(day=><div key={day} className="border-b border-l border-border px-1 py-3 text-center"><span className="block text-[10px] uppercase tracking-wide text-muted-foreground">{dayLabel(day,{weekday:'short'})}</span><span className={cn('mx-auto mt-1 flex size-9 items-center justify-center rounded-full text-lg',day===today&&'bg-primary text-primary-foreground')}>{dayDate(day).getDate()}</span></div>)}
    <div className="border-b border-border px-1 py-2 text-[10px] text-muted-foreground">Dia todo</div>
    {days.map(day=><div key={day} className="min-h-10 space-y-1 border-b border-l border-border p-1">{eventsOnDay(events,day).filter(e=>e.dia_inteiro).map(e=><EventChip key={e.id} event={e} onOpen={onOpen}/>)}</div>)}
   </div>
   <div className="grid" style={{gridTemplateColumns:`56px repeat(${days.length}, minmax(0, 1fr))`}}>
    <div>{Array.from({length:24},(_,hour)=><div key={hour} className="h-16 pr-2 pt-1 text-right text-[10px] tabular-nums text-muted-foreground">{String(hour).padStart(2,'0')}:00</div>)}</div>
    {days.map(day=><div key={day} className="relative h-[1536px] border-l border-border">
     {Array.from({length:48},(_,slot)=>{const time=`${String(Math.floor(slot/2)).padStart(2,'0')}:${slot%2?'30':'00'}`;return <button key={slot} onClick={()=>onCreate(day,time)} aria-label={`Criar compromisso ${dayLabel(day)} às ${time}`} className={cn('block h-8 w-full border-t text-left transition hover:bg-primary/10 focus:bg-primary/15 focus:outline-none',slot%2?'border-border/30':'border-border')}/>;})}
     {positionEvents(events,day).map(p=><button key={p.event.id} onClick={()=>onOpen(p.event)} title={`${p.event.titulo} · ${agendaTime(p.event.inicio)}–${agendaTime(p.event.fim)}`} className={cn('absolute z-10 overflow-hidden rounded-md border-l-[3px] p-1.5 text-left text-xs shadow-sm transition hover:z-20 hover:brightness-125',EVENT_KINDS[p.event.tipo].className)} style={{top:p.start*64/60,height:Math.max(22,(p.end-p.start)*64/60-2),left:`calc(${p.column/p.columns*100}% + 2px)`,width:`calc(${100/p.columns}% - 4px)`,borderLeftColor:EVENT_KINDS[p.event.tipo].color}}>
      <span className="block truncate font-semibold">{p.event.titulo}</span>{p.end-p.start>=40&&<span className="block text-[10px] opacity-75">{agendaTime(p.event.inicio)}–{agendaTime(p.event.fim)}</span>}
     </button>)}
     {day===today&&<div className="pointer-events-none absolute inset-x-0 z-10 border-t border-red-400" style={{top:currentMinutes*64/60}}><span className="absolute -left-1 -top-1 size-2 rounded-full bg-red-400"/></div>}
    </div>)}
   </div>
  </div>
 </div>;
}
export function ListView({days,events,onOpen,onCreate}:{days:string[];events:AgendaEvent[];onOpen:(event:AgendaEvent)=>void;onCreate:(day:string)=>void}) {
 const populated=days.filter(day=>eventsOnDay(events,day).length>0);
 return populated.length?<div className="divide-y divide-border">{populated.map(day=><section key={day} className="flex flex-col gap-3 p-4 sm:flex-row sm:gap-6"><div className="w-32 shrink-0"><p className="text-sm font-semibold">{dayLabel(day)}</p><p className="text-xs text-muted-foreground">{dayLabel(day,{weekday:'long'})}</p></div><div className="flex-1 space-y-2">{eventsOnDay(events,day).map(e=><button key={e.id} onClick={()=>onOpen(e)} className="flex w-full items-center gap-3 rounded-lg p-3 text-left hover:bg-muted"><span className="size-2 shrink-0 rounded-full" style={{background:EVENT_KINDS[e.tipo].color}}/><span className="w-24 shrink-0 text-xs text-muted-foreground">{e.dia_inteiro?'Dia inteiro':`${agendaTime(e.inicio)}–${agendaTime(e.fim)}`}</span><span className="min-w-0 flex-1 break-words text-sm font-medium">{e.titulo}</span></button>)}</div></section>)}</div>:<div className="py-20 text-center"><p className="text-muted-foreground">Nenhum compromisso neste período.</p><button className="mt-3 text-sm text-primary" onClick={()=>onCreate(days[0])}>Criar o primeiro compromisso</button></div>;
}

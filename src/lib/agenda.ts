export const AGENDA_TIMEZONE = 'America/Sao_Paulo';
export type AgendaKind = 'reuniao' | 'entrega';
export interface AgendaEvent {
 id: string; owner_id: string; plan_id: string | null; titulo: string; descricao: string;
 tipo: AgendaKind; inicio: string; fim: string; dia_inteiro: boolean;
 local: string; link: string; created_at: string; updated_at: string;
}
export const EVENT_KINDS = {
 reuniao: { label: 'Reunião', plural: 'Reuniões', color: '#8b7bff', className: 'border-violet-400/40 bg-violet-500/20 text-foreground' },
 entrega: { label: 'Entrega', plural: 'Entregas', color: '#34d399', className: 'border-emerald-400/40 bg-emerald-500/20 text-foreground' },
};
export function agendaDay(value: string | Date = new Date()): string {
 return new Intl.DateTimeFormat('en-CA', {timeZone: AGENDA_TIMEZONE, year:'numeric', month:'2-digit', day:'2-digit'}).format(new Date(value));
}
export function agendaTime(value: string): string {
 return new Intl.DateTimeFormat('pt-BR', {timeZone: AGENDA_TIMEZONE, hour:'2-digit', minute:'2-digit', hourCycle:'h23'}).format(new Date(value));
}
export function dayDate(day: string): Date { return new Date(`${day}T12:00:00`); }
export function shiftDay(day: string, offset: number): string {
 const date=new Date(`${day}T12:00:00Z`);date.setUTCDate(date.getUTCDate()+offset);return date.toISOString().slice(0,10);
}
export function dayInstant(day: string, time='00:00'): string { return new Date(`${day}T${time}:00-03:00`).toISOString(); }
export function weekDays(day: string): string[] {
 const date=dayDate(day);const start=shiftDay(day,-date.getDay());return Array.from({length:7},(_,i)=>shiftDay(start,i));
}
export function dayLabel(day: string, options: Intl.DateTimeFormatOptions = {day:'numeric', month:'long'}): string {
 return dayDate(day).toLocaleDateString('pt-BR', options);
}
export function eventsOnDay(events: AgendaEvent[], day: string): AgendaEvent[] {
 const start=Date.parse(dayInstant(day)), end=Date.parse(dayInstant(shiftDay(day,1)));
 return events.filter(e=>Date.parse(e.inicio)<end&&Date.parse(e.fim)>start).sort((a,b)=>Number(b.dia_inteiro)-Number(a.dia_inteiro)||a.inicio.localeCompare(b.inicio));
}
export interface EventPosition { event: AgendaEvent; start: number; end: number; column: number; columns: number }
// Split events at local midnight and assign separate columns to overlapping blocks.
export function positionEvents(events: AgendaEvent[], day: string): EventPosition[] {
 const midnight=Date.parse(dayInstant(day));
 const positions=eventsOnDay(events,day).filter(e=>!e.dia_inteiro).map(event=>({event,start:Math.max(0,(Date.parse(event.inicio)-midnight)/60000),end:Math.min(1440,(Date.parse(event.fim)-midnight)/60000),column:0,columns:1}));
 positions.sort((a,b)=>a.start-b.start||b.end-a.end);
 let group:EventPosition[]=[], ends:number[]=[], groupEnd=0;
 const finish=()=>{for(const p of group)p.columns=ends.length;group=[];ends=[];};
 for(const p of positions){
  if(group.length&&p.start>=groupEnd)finish();
  let column=ends.findIndex(end=>end<=p.start);if(column<0)column=ends.length;
  ends[column]=p.end;p.column=column;group.push(p);groupEnd=Math.max(...ends);
 }
 finish();return positions;
}
export function validMeetingLink(value: string): boolean {
 if(!value.trim())return true;
 try {return ['http:','https:'].includes(new URL(value).protocol);} catch {return false;}
}

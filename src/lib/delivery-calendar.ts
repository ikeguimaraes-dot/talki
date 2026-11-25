import type { CatalogRow, Execution } from './entregas';
export type CalendarMode='day'|'week'|'month'|'timeline';
export interface DeliveryAgenda {id:string;group_id:string;catalogo_id:string;responsavel:string;gestor:string;contexto:string;ativa:boolean}
const zone='America/Sao_Paulo';
export function localDay(value:Date|string=new Date()){return new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value));}
function utc(day:string){return new Date(day+'T12:00:00Z');}
export function addDays(day:string,n:number){const d=utc(day);d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);}
function weekStart(day:string){return addDays(day,-((utc(day).getUTCDay()+6)%7));}
export function calendarDays(day:string,mode:CalendarMode){
 if(mode==='day')return [day];
 if(mode==='week'||mode==='timeline')return Array.from({length:7},(_,i)=>addDays(weekStart(day),i));
 const start=weekStart(day.slice(0,7)+'-01');
 return Array.from({length:42},(_,i)=>addDays(start,i));
}
export function shiftCalendar(day:string,mode:CalendarMode,direction:number){
 if(mode==='month'){const d=utc(day.slice(0,7)+'-01');d.setUTCMonth(d.getUTCMonth()+direction);return d.toISOString().slice(0,10);}
 return addDays(day,direction*(mode==='day'?1:7));
}
export function formatDay(day:string,options:Intl.DateTimeFormatOptions={day:'2-digit',month:'short'}){return new Intl.DateTimeFormat('pt-BR',{...options,timeZone:'UTC'}).format(utc(day));}
export function dueRows(rows:Execution[],day:string){return rows.filter(e=>localDay(e.vence_em)===day).sort((a,b)=>a.vence_em.localeCompare(b.vence_em)||a.id.localeCompare(b.id));}
export function isOverdue(e:Execution,now:Date){return ['pendente','devolvida'].includes(e.status)&&Date.parse(e.vence_em)<now.getTime();}
export function assignedPeople(rows:Execution[],agendas:DeliveryAgenda[],catalog:CatalogRow[]){
 const lookup=new Map(catalog.map(c=>[JSON.stringify([c.group_id,c.id]),c.documento]));
 const byAgenda=new Map(agendas.map(a=>[a.id,a]));
 const people=new Map<string,{key:string;groupId:string;userId:string;person:string;rows:Execution[];areas:Set<string>;areaIds:Set<string>}>();
 for(const e of rows){
  const key=JSON.stringify([e.group_id,e.responsavel]);
  const p=people.get(key)??{key,groupId:e.group_id,userId:e.responsavel,person:e.responsavel_nome,rows:[],areas:new Set<string>(),areaIds:new Set<string>()};
  p.rows.push(e);
  const a=byAgenda.get(e.agenda_id);
  const c=a&&a.group_id===e.group_id?lookup.get(JSON.stringify([a.group_id,a.catalogo_id])):undefined;
  if(c){p.areas.add(c.area);p.areaIds.add(c.areaId);}
  people.set(key,p);
 }
 return [...people.values()].sort((a,b)=>a.person.localeCompare(b.person,'pt-BR'));
}

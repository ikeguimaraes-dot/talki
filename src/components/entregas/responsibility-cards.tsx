import { useMemo } from 'react';
import { ChevronDown, UserRound } from 'lucide-react';
import { DeliveryCalendar } from './delivery-calendar';
import { assignedPeople, isOverdue, type DeliveryAgenda } from '@/lib/delivery-calendar';
import { responsibilityCards, maestriUrl, type CatalogRow, type Execution } from '@/lib/entregas';
const norm=(v:string)=>v.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export function ResponsibilityCards({catalog,executions,agendas,area,query,userId,reload}:{catalog:CatalogRow[];executions:Execution[];agendas:DeliveryAgenda[];area:string;query:string;userId:string;reload:()=>Promise<void>}){
 const cards=useMemo(()=>responsibilityCards(catalog),[catalog]);
 const assigned=useMemo(()=>assignedPeople(executions,agendas,catalog),[executions,agendas,catalog]);
 const actual=useMemo(()=>{
  const keys=new Set(catalog.filter(c=>c.documento.areaId===area).map(c=>JSON.stringify([c.group_id,c.id])));
  const agendaKeys=new Set(agendas.filter(a=>keys.has(JSON.stringify([a.group_id,a.catalogo_id]))).map(a=>JSON.stringify([a.group_id,a.id])));
  const visible=area?assignedPeople(executions.filter(e=>agendaKeys.has(JSON.stringify([e.group_id,e.agenda_id]))),agendas,catalog):assigned;
  return visible.filter(p=>norm([p.person,...p.areas,...p.rows.map(e=>e.titulo+' '+e.contexto)].join(' ')).includes(norm(query)));
 },[assigned,area,query,agendas,catalog,executions]);
 const planned=new Map<string,{key:string;person:string;cards:typeof cards}>();
 for(const c of cards){
  const key=JSON.stringify([c.groupId,c.person]);const p=planned.get(key)??{key,person:c.person,cards:[]};
  p.cards.push(c);planned.set(key,p);
 }
 const plannedPeople=[...planned.values()].filter(p=>p.cards.some(c=>(!area||c.areaId===area)&&norm([c.person,c.area,c.context,...c.templates.map(t=>t.documento.title)].join(' ')).includes(norm(query))));
 const activeTemplates=new Set(agendas.filter(a=>a.ativa).map(a=>JSON.stringify([a.group_id,a.catalogo_id])));
 const now=new Date();
 const tile=(n:number,label:string)=><div key={label} className="rounded-xl border border-border bg-card p-3"><p className="text-xl font-semibold">{n}</p><p className="text-xs text-muted-foreground">{label}</p></div>;
 return <section className="space-y-5">
  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">{tile(catalog.length,'Modelos únicos')}{tile(agendas.filter(a=>a.ativa).length,'Agendas ativas visíveis')}{tile(executions.filter(e=>isOverdue(e,now)).length,'Entregas vencidas visíveis')}{tile(assigned.length,'Responsáveis com ocorrências')}</div>
  <section className="space-y-3">
   <div><h2 className="font-semibold">Calendário de execução</h2><p className="text-xs text-muted-foreground">Somente ocorrências reais, agrupadas por identidade autenticada. Expanda uma pessoa para acompanhar prazos e histórico.</p></div>
   {actual.length===0&&<p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">Nenhum responsável com ocorrências visíveis neste filtro.</p>}
   {actual.map(p=><details key={p.key} className="group rounded-2xl border border-border bg-card overflow-hidden">
    <summary className="cursor-pointer list-none flex items-center gap-3 p-4 [&::-webkit-details-marker]:hidden"><div className="size-10 rounded-full bg-muted flex items-center justify-center"><UserRound className="size-5"/></div><div className="flex-1 min-w-0"><h3 className="font-semibold break-words">{p.person}</h3><p className="text-xs text-muted-foreground">{[...p.areas].join(' · ')||'Área não disponível'}</p></div><div className="text-right"><p className="text-sm font-medium">{p.rows.length} entregas</p><p className="text-xs text-red-500">{p.rows.filter(e=>isOverdue(e,now)).length} vencidas</p></div><ChevronDown className="size-4 shrink-0 group-open:rotate-180"/></summary>
    <div className="border-t border-border p-3 sm:p-4"><DeliveryCalendar rows={p.rows} userId={userId} reload={reload}/></div>
   </details>)}
  </section>
  <section className="space-y-3">
   <div><h2 className="font-semibold">Planejamento de responsabilidades</h2><p className="text-xs text-muted-foreground">Modelos por nome de referência e área. Não equivalem a vínculos autenticados; não são contados como atrasos. A mesma rotina pode aparecer em mais de um responsável ou unidade.</p></div>
   {plannedPeople.map(p=>{const allTemplates=new Map(p.cards.flatMap(c=>c.templates.map(t=>[JSON.stringify([t.group_id,t.id]),t] as const)));const without=[...allTemplates.keys()].filter(k=>!activeTemplates.has(k)).length;return <details key={p.key} className="group rounded-2xl border border-border bg-card overflow-hidden">
    <summary className="cursor-pointer list-none flex items-center gap-3 p-4 [&::-webkit-details-marker]:hidden"><div className="size-10 rounded-full bg-muted flex items-center justify-center text-sm font-semibold">{p.person.slice(0,2).toUpperCase()}</div><div className="flex-1 min-w-0"><h3 className="font-semibold">{p.person}</h3><p className="text-xs text-muted-foreground">{[...new Set(p.cards.map(c=>c.area))].join(' · ')}</p></div><div className="text-right"><p className="text-sm font-medium">{allTemplates.size} modelos</p><p className="text-xs text-muted-foreground">{without} sem agenda ativa</p></div><ChevronDown className="size-4 shrink-0 group-open:rotate-180"/></summary>
    <div className="border-t border-border p-4 space-y-4">{without===allTemplates.size&&<p className="rounded-xl border border-dashed p-3 text-sm text-muted-foreground">Nenhum destes modelos possui agenda ativa. Defina responsáveis e prazos no Maestri para gerar o calendário real.</p>}
    {p.cards.filter(c=>!area||c.areaId===area).map(c=><section key={c.key} className="space-y-2"><h4 className="text-sm font-semibold">{c.area}{c.context?' · '+c.context:''}</h4>{c.templates.map(({id,documento:d,group_id})=><details key={id} className="rounded-lg border border-border p-3"><summary className="cursor-pointer text-sm"><span className="font-medium">{d.title}</span><span className="block text-xs text-muted-foreground">{d.cadence} · {activeTemplates.has(JSON.stringify([group_id,id]))?'Há agenda ativa para este modelo':'Sem agenda ativa'}</span></summary><p className="text-xs mt-2">{d.deadline}</p><p className="text-xs mt-1">Validação prevista: {d.validator}</p><ol className="list-decimal pl-5 text-xs space-y-1 my-3">{d.checklist.map((step,i)=><li key={i}>{step}</li>)}</ol><p className="text-xs mb-2"><strong>Evidência:</strong> {d.evidence}</p><a className="text-xs underline text-primary" href={maestriUrl+'?catalogo='+encodeURIComponent(id)} target="_blank" rel="noreferrer">Configurar entrega no Maestri ↗</a></details>)}</section>)}</div>
   </details>})}
   {plannedPeople.length===0&&<p className="text-sm text-muted-foreground">Nenhum modelo corresponde aos filtros.</p>}
  </section>
 </section>
}

import { useMemo } from 'react';
import { responsibilityCards, maestriUrl, type CatalogRow, type Execution } from '@/lib/entregas';
const norm=(v:string)=>v.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export function ResponsibilityCards({catalog,executions,area,query}:{catalog:CatalogRow[];executions:Execution[];area:string;query:string}){
 const cards=useMemo(()=>responsibilityCards(catalog),[catalog]);
 const filtered=cards.filter(c=>(!area||c.areaId===area)&&norm([c.person,c.area,c.context,...c.templates.map(t=>t.documento.title)].join(' ')).includes(norm(query)));
 const people=new Set(cards.filter(c=>c.person!=='VAGO'&&c.person!=='A definir').map(c=>JSON.stringify([c.groupId,c.person]))).size;
 return <section className="space-y-4">
  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
   {[[people,'Nomes no catálogo'],[catalog.length,'Modelos únicos'],[cards.length,'Cards pessoa × área × contexto'],[executions.filter(e=>['pendente','devolvida'].includes(e.status)).length,'Ocorrências abertas visíveis']].map(([v,label])=><div key={label} className="rounded-2xl border border-border bg-card p-4"><p className="text-2xl font-semibold">{v}</p><p className="text-xs text-muted-foreground">{label}</p></div>)}
  </div>
  <p className="text-sm text-muted-foreground">Mapa de responsabilidades do catálogo. Nomes, unidades e responsabilidades compartilhadas são referências de planejamento, não atribuições autenticadas. Um modelo pode aparecer em mais de um card. A ativação de cada rotina é feita no Maestri, com executor, gestor, contexto e prazo.</p>
  <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
   {filtered.map(c=><article key={c.key} className="rounded-2xl border border-border bg-card p-5 space-y-3">
    <div><p className="text-xs text-muted-foreground">{c.area}{c.context?' · '+c.context:''}</p><h2 className="text-lg font-semibold mt-1">{c.person}</h2><p className="text-xs text-muted-foreground">{c.templates.length} modelos de entrega · {c.person==='VAGO'?'Vaga a definir':'Vínculo e agenda a conferir'}</p></div>
    <details><summary className="cursor-pointer text-sm font-medium py-2">Ver entregas ({c.templates.length})</summary><div className="space-y-3">{c.templates.map(({id,documento:d})=><div key={id} className="border-t border-border pt-3 space-y-1"><p className="text-sm font-medium">{d.title}</p><p className="text-xs text-muted-foreground">{d.cadence} · {d.deadline}</p><p className="text-xs">Validação prevista: {d.validator}</p><a className="text-xs underline text-primary" href={maestriUrl+'?catalogo='+encodeURIComponent(id)} target="_blank" rel="noreferrer">Configurar entrega no Maestri ↗</a></div>)}</div></details>
   </article>)}
  </div>
  {!filtered.length&&<p className="text-sm text-muted-foreground">Nenhum card corresponde aos filtros.</p>}
 </section>
}

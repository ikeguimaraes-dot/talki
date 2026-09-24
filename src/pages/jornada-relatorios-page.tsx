/* eslint-disable react-hooks/set-state-in-effect -- Synchronize server data and route-driven forms after loading. */
import { useCallback,useEffect,useMemo,useState } from 'react';
import { Bar,BarChart,CartesianGrid,ResponsiveContainer,Tooltip,XAxis,YAxis } from 'recharts';
import { Download,RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { usePageHeader } from '@/hooks/use-page-header';
import { useJornada } from '@/hooks/use-jornada';
import { readRows,downloadCSV,type Registro,type Pontuacao } from '@/lib/jornada';
import { spDay,dayStart,addDays,secondsInRange,hours,weekdays } from '@/lib/jornada-metrics';
import { Field,Panel,Metric,JornadaNav,fieldClass } from '@/components/jornada/common';
import { Button } from '@/components/ui/button';
type Row={nome:string;segundos:number;ocorrencias?:number;capacidade?:number};
const tabs=[['categoria','Onde o tempo vai'],['pessoa','Tempo por pessoa'],['projeto','Por projeto'],['benchmark','Benchmark'],['carga','Carga e capacidade'],['8020','Concentração 80/20'],['tarefa','Por tarefa']];
export function JornadaRelatoriosPage({dashboard=false}:{dashboard?:boolean}) {
 usePageHeader({title:dashboard?'Gestão da jornada':'Relatórios de jornada'});const {data,error,reload}=useJornada();
 const [records,setRecords]=useState<Registro[]>([]),[points,setPoints]=useState<Pontuacao[]>([]),[busy,setBusy]=useState(false),[tab,setTab]=useState('categoria');
 const [filters,setFilters]=useState({from:addDays(spDay(),-29),to:spDay(),area:'',person:'',areaMode:'pessoa'}),[applied,setApplied]=useState(filters);
 const load=useCallback(async()=>{if(!data?.gestor)return;if(!filters.from||!filters.to||filters.from>filters.to){toast.error('Confira o período.');return;}setBusy(true);try{
 const [r,p]=await Promise.all([readRows<Registro>('talki_registros',{until:dayStart(addDays(filters.to,1)),order:'inicio'}),readRows<Pontuacao>('talki_pontuacao_diaria',{order:'data'})]);setRecords(r);setPoints(p);setApplied(filters);
 }catch(e){toast.error(e instanceof Error?e.message:'Erro no relatório');}finally{setBusy(false);}},[data,filters]);
 // eslint-disable-next-line react-hooks/exhaustive-deps -- Initial load; draft filters apply only when the user submits.
 useEffect(()=>{if(data?.gestor)void load();},[data]); // Filters apply only on explicit search.
 const result=useMemo(()=>{
 if(!data)return null;
 const start=dayStart(applied.from),end=dayStart(addDays(applied.to,1));
 const people=data.colaboradores.filter(c=>(!applied.person||c.user_id===applied.person)&&(!applied.area||applied.areaMode==='atividade'||c.area_id===applied.area));
 const ids=new Set(people.map(c=>c.user_id));
 const regs=records.filter(r=>ids.has(r.user_id)&&(!applied.area||applied.areaMode!=='atividade'||r.area_id===applied.area));
 const rows=regs.map(r=>({...r,seconds:secondsInRange(r,start,end)})).filter(r=>r.seconds>0);
 const total=rows.reduce((s,r)=>s+r.seconds,0),days=weekdays(applied.from,applied.to);
 const grouped=new Map<string,Row>();
 for(const r of rows) {
  let key: string, name: string;
  if(tab==='categoria'){key=r.categoria_id;name=data.categorias.find(c=>c.id===key)?.nome??'Sem categoria';}
  else if(tab==='pessoa'||tab==='8020'){key=r.user_id;name=data.pessoas.find(p=>p.id===key)?.nome??'Pessoa';}
  else if(tab==='projeto'){key=r.plan_id??r.projeto_nome??'sem';name=r.projeto_nome??'Sem projeto';}
  else if(tab==='tarefa'){key=r.task_id??r.tarefa_titulo??'sem';name=r.tarefa_titulo??'Sem tarefa';}
  else if(tab==='benchmark'){if(r.seconds<60)continue;key=r.categoria_id+'::'+r.descricao.trim().toLowerCase();name=r.descricao;}
  else {key=data.colaboradores.find(c=>c.user_id===r.user_id)?.area_id??'sem';name=data.areas.find(a=>a.id===key)?.nome??'Sem área';}
  const row=grouped.get(key)??{nome:name,segundos:0,ocorrencias:0};row.segundos+=r.seconds;row.ocorrencias=(row.ocorrencias??0)+1;grouped.set(key,row);
 }
 if(tab==='carga')for(const person of people.filter(c=>c.ativo)){const key=person.area_id??'sem';const row=grouped.get(key)??{nome:data.areas.find(a=>a.id===key)?.nome??'Sem área',segundos:0};row.capacidade=(row.capacidade??0)+person.horas_dia_contratadas*days*3600;grouped.set(key,row);}
 const table=[...grouped.values()].filter(r=>tab!=='benchmark'||(r.ocorrencias??0)>=2).sort((a,b)=>b.segundos-a.segundos);
 const evaluated=points.filter(p=>ids.has(p.user_id)&&p.data>=applied.from&&p.data<=applied.to);
 const pairs=new Set<string>();
 for(let day=applied.from;day<=applied.to;day=addDays(day,1)){if(!weekdays(day,day))continue;for(const r of regs)if(secondsInRange(r,dayStart(day),dayStart(addDays(day,1)))>0)pairs.add(r.user_id+day);}
 const capacity=people.filter(c=>c.ativo).reduce((s,c)=>s+c.horas_dia_contratadas*days*3600,0);
 const previousStart=dayStart(addDays(applied.from,-Math.round((Date.parse(end)-Date.parse(start))/86400000)));
 const previous=regs.reduce((s,r)=>s+secondsInRange(r,previousStart,start),0);
 const trend=[];for(let day=applied.from;day<=applied.to;day=addDays(day,1)){trend.push({nome:day.slice(5).split('-').reverse().join('/'),horas:Math.round(regs.reduce((s,r)=>s+secondsInRange(r,dayStart(day),dayStart(addDays(day,1))),0)/36)/100});}
 return {table,rows,total,days,people,capacity,previous,trend,registrants:new Set(rows.map(r=>r.user_id)).size,adherence:evaluated.length?Math.round(evaluated.reduce((s,p)=>s+p.percentual,0)/evaluated.length):null,adoption:days*people.length?Math.round(pairs.size/(days*people.length)*100):null};
 },[data,records,points,applied,tab]);
 if(error)return <Panel>{error}<Button onClick={()=>void reload()}>Tentar novamente</Button></Panel>;if(!data)return <p>Carregando…</p>;if(!data.gestor)return <Panel>Esta área é restrita à gestão da Jornada.</Panel>;if(!result)return null;
 let cumulative=0;
 return <><JornadaNav gestor/><Panel><div className="grid items-end gap-3 sm:grid-cols-2 xl:grid-cols-6"><Field label="De"><input className={fieldClass} type="date" value={filters.from} onChange={e=>setFilters({...filters,from:e.target.value})}/></Field><Field label="Até"><input className={fieldClass} type="date" value={filters.to} onChange={e=>setFilters({...filters,to:e.target.value})}/></Field><Field label="Área"><select className={fieldClass} value={filters.area} onChange={e=>setFilters({...filters,area:e.target.value})}><option value="">Todas</option>{data.areas.map(a=><option key={a.id} value={a.id}>{a.nome}</option>)}</select></Field><Field label="Interpretar área como"><select className={fieldClass} value={filters.areaMode} onChange={e=>setFilters({...filters,areaMode:e.target.value})}><option value="pessoa">Lotação da pessoa</option><option value="atividade">Área da atividade</option></select></Field><Field label="Pessoa"><select className={fieldClass} value={filters.person} onChange={e=>setFilters({...filters,person:e.target.value})}><option value="">Todas</option>{data.colaboradores.map(c=><option key={c.user_id} value={c.user_id}>{data.pessoas.find(p=>p.id===c.user_id)?.nome??c.user_id}</option>)}</select></Field><Button disabled={busy} onClick={()=>void load()}><RefreshCw/>{busy?'Buscando…':'Aplicar filtros'}</Button></div><p className="mt-3 text-xs text-muted-foreground">Horário de São Paulo. Horas encerradas somadas por atividade, inclusive as simultâneas; intervalos divididos na virada do dia. Histórico inclui pessoas inativas. Capacidade usa pessoas ativas, lotação e jornada atuais, de segunda a sexta.</p></Panel>
 <div className="my-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Tempo registrado" value={hours(result.total)}/><Metric label="Pessoas com registros" value={`${result.registrants} / ${result.people.length}`}/><Metric label="Adesão em dias úteis" value={result.adoption===null?'Sem capacidade':`${result.adoption}%`}/><Metric label="Aderência dos dias avaliados" value={result.adherence===null?'Sem avaliações':`${result.adherence}%`}/></div>
 {dashboard&&<><div className="mb-5 grid gap-4 sm:grid-cols-3"><Metric label="Capacidade no período" value={hours(result.capacity)}/><Metric label="Utilização" value={result.capacity?`${Math.round(100*result.total/result.capacity)}%`:'Sem capacidade'}/><Metric label="Período anterior equivalente" value={hours(result.previous)}/></div><Panel className="mb-5"><h2 className="mb-4 font-semibold">Tendência diária</h2><ResponsiveContainer width="100%" height={220}><BarChart data={result.trend}><CartesianGrid vertical={false} stroke="var(--border)"/><XAxis dataKey="nome" tick={{fontSize:11,fill:'var(--muted-foreground)'}}/><YAxis/><Tooltip/><Bar dataKey="horas" fill="var(--primary)" radius={[4,4,0,0]}/></BarChart></ResponsiveContainer></Panel><Panel className="mb-5"><h2 className="font-semibold">Sinais para acompanhar</h2><ul className="mt-3 space-y-2 text-sm text-muted-foreground">{result.people.filter(p=>!result.rows.some(r=>r.user_id===p.user_id)).map(p=><li key={p.user_id}>{data.pessoas.find(x=>x.id===p.user_id)?.nome}: sem horas encerradas neste período.</li>)}<li>{result.capacity&&result.total/result.capacity>=.9?'A carga registrada está próxima da capacidade.':result.capacity&&result.total/result.capacity<=.55?'Há capacidade sem apontamentos; confira adesão antes de interpretar como disponibilidade.':'Acompanhe a distribuição entre categorias e pessoas.'}</li></ul></Panel></>}
 <div className="mb-4 flex flex-wrap gap-2">{tabs.map(([id,label])=><Button key={id} variant={id===tab?'default':'outline'} onClick={()=>setTab(id)}>{label}</Button>)}</div>
 <Panel><div className="mb-5 flex items-center justify-between gap-3"><h2 className="font-semibold">{tabs.find(t=>t[0]===tab)?.[1]}</h2><Button variant="outline" disabled={!result.table.length} onClick={()=>downloadCSV(`${tab}_${applied.from}_${applied.to}`,result.table.map(r=>({nome:r.nome,horas:r.segundos/3600,ocorrencias:r.ocorrencias??null,media_horas:tab==='benchmark'?r.segundos/(r.ocorrencias??1)/3600:null,capacidade_horas:r.capacidade==null?null:r.capacidade/3600})))}><Download/>CSV</Button></div>
 {result.table.length===0?<p className="py-10 text-center text-muted-foreground">Não há dados suficientes para este relatório.</p>:<><ResponsiveContainer width="100%" height={230}><BarChart data={result.table.slice(0,12).map(r=>({nome:r.nome,horas:Math.round(r.segundos/36)/100}))}><CartesianGrid vertical={false} stroke="var(--border)"/><XAxis dataKey="nome" tick={{fontSize:10,fill:'var(--muted-foreground)'}}/><YAxis/><Tooltip/><Bar dataKey="horas" fill="var(--primary)" radius={[5,5,0,0]}/></BarChart></ResponsiveContainer><div className="overflow-x-auto"><table className="mt-5 w-full text-left text-sm"><thead><tr className="border-b border-border"><th className="py-3">Nome</th><th>Horas</th><th>% do total</th>{tab==='8020'&&<th>Acumulado</th>}{tab==='benchmark'&&<><th>Ocorrências</th><th>Média</th></>}{tab==='carga'&&<><th>Capacidade</th><th>Utilização</th></>}</tr></thead><tbody>{result.table.map((r,i)=>{const pct=result.total?r.segundos/result.total*100:0;cumulative+=pct;return <tr key={i} className="border-b border-border"><td className="py-3">{r.nome}</td><td>{hours(r.segundos)}</td><td>{pct.toFixed(1)}%</td>{tab==='8020'&&<td>{cumulative.toFixed(1)}%</td>}{tab==='benchmark'&&<><td>{r.ocorrencias}</td><td>{hours(r.segundos/(r.ocorrencias??1))}</td></>}{tab==='carga'&&<><td>{hours(r.capacidade??0)}</td><td>{r.capacidade?`${(100*r.segundos/r.capacidade).toFixed(1)}%`:'Sem capacidade'}</td></>}</tr>;})}</tbody></table></div></>}
 {tab==='8020'&&<p className="mt-4 text-xs text-muted-foreground">Concentração de horas registradas. Este indicador não mede produtividade ou qualidade das entregas.</p>}{tab==='benchmark'&&<p className="mt-4 text-xs text-muted-foreground">Mesma categoria e descrição normalizada; ao menos duas ocorrências de um minuto ou mais.</p>}</Panel></>;
}

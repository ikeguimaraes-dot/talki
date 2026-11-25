import { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ExecutionCard } from './execution-card';
import { loadMyDeliveries } from '@/lib/entregas-api';
import { desktopDeliveryQueue, formatDeliveryDate, stateLabels, type Execution } from '@/lib/entregas';

export function MiniDeliveries({userId}:{userId:string}) {
  const [rows,setRows]=useState<Execution[]>([]);
  const [all,setAll]=useState(false);
  const [selected,setSelected]=useState<string|null>(null);
  const [error,setError]=useState(false);
  const [loading,setLoading]=useState(true);
  const [updated,setUpdated]=useState<Date|null>(null);
  const [notify,setNotify]=useState(()=>typeof Notification!=='undefined'&&Notification.permission==='granted'&&localStorage.getItem('talki:delivery-notify:'+userId)==='yes');
  const sequence=useRef(0);
  const lastNotice=useRef('');
  const reload=useCallback(async()=>{
    const seq=++sequence.current;
    try {
      const result=await loadMyDeliveries(userId);
      if(seq!==sequence.current)return;
      setRows(result);setError(false);setUpdated(new Date());
    } catch {if(seq===sequence.current)setError(true);}
    finally {if(seq===sequence.current)setLoading(false);}
  },[userId]);
  useEffect(()=>{
    // eslint-disable-next-line react-hooks/set-state-in-effect -- authenticated server synchronization
    void reload();
    const timer=window.setInterval(()=>void reload(),60_000);
    const refresh=()=>void reload();
    window.addEventListener('focus',refresh);window.addEventListener('online',refresh);
    return()=>{++sequence.current;clearInterval(timer);window.removeEventListener('focus',refresh);window.removeEventListener('online',refresh);};
  },[reload]);
  const now=new Date();
  const queue=desktopDeliveryQueue(rows,userId,now,all);
  const overdue=rows.filter(e=>e.status!=='enviada'&&new Date(e.vence_em)<now).length;
  useEffect(()=>{
    if(!notify||error||loading||!updated||typeof Notification==='undefined'||Notification.permission!=='granted')return;
    const due=rows.filter(e=>e.status!=='enviada'&&new Date(e.vence_em).getTime()<=updated.getTime()+30*60_000);
    const key=due.map(e=>e.id+':'+e.vence_em+':'+e.status).sort().join('|');
    if(!key){lastNotice.current='';return;}
    if(key===lastNotice.current)return;
    lastNotice.current=key;
    new Notification('Talki · Entregas',{body:'Você tem entregas vencidas ou próximas do prazo. Abra o Talki para conferir.'});
  },[rows,notify,error,loading,updated]);
  async function toggleNotify(){
    if(notify){localStorage.removeItem('talki:delivery-notify:'+userId);setNotify(false);return;}
    if(typeof Notification!=='undefined'&&await Notification.requestPermission()==='granted'){
      localStorage.setItem('talki:delivery-notify:'+userId,'yes');setNotify(true);
    }
  }
  return <section aria-label="Entregas Maestri" className="space-y-3 rounded-2xl border border-primary/30 bg-card p-3">
    <div className="flex items-center justify-between gap-2"><div><h2 className="text-sm font-semibold">Entregas Maestri</h2><p className="text-xs text-muted-foreground">Direto da gestão · sem duplicar tarefas</p><a href="/entregas?view=agenda" target="_blank" rel="noreferrer" className="text-xs text-primary underline">Meu calendário completo ↗</a></div><Button size="sm" variant="ghost" onClick={()=>void reload()}>Atualizar</Button></div>
    <div className="flex flex-wrap gap-2 text-xs"><span className="rounded-lg bg-muted px-2 py-1">{rows.length} abertas</span><span className="rounded-lg bg-muted px-2 py-1 text-amber-500">{overdue} vencidas</span><span className="rounded-lg bg-muted px-2 py-1">{rows.filter(e=>e.status==='enviada').length} em validação</span></div>
    <div className="flex flex-wrap gap-1"><Button size="sm" variant={!all?'secondary':'ghost'} onClick={()=>setAll(false)}>Hoje e atrasadas</Button><Button size="sm" variant={all?'secondary':'ghost'} onClick={()=>setAll(true)}>Todas</Button></div>
    {typeof Notification!=='undefined'&&<Button size="sm" variant="outline" onClick={()=>void toggleNotify()}>{notify?'Desativar lembretes':'Ativar lembretes de prazo'}</Button>}
    {error&&<p role="alert" className="text-xs text-destructive">Sem sincronização com Maestri. Dados anteriores podem estar desatualizados.</p>}
    {loading?<p className="text-xs">Carregando…</p>:queue.length===0?<p className="text-xs text-muted-foreground">{error?'Aguardando conexão.':'Nenhuma entrega atribuída neste filtro.'}</p>:queue.map(e=><div key={e.id} className="space-y-2"><button type="button" aria-expanded={selected===e.id} onClick={()=>setSelected(selected===e.id?null:e.id)} className="w-full rounded-xl border border-border p-3 text-left"><span className="block text-sm font-medium break-words">{e.titulo}</span><span className="block text-xs text-muted-foreground">{e.contexto} · {stateLabels[e.status]??e.status}</span><span className="block text-xs">{formatDeliveryDate(e.vence_em)}</span></button>{selected===e.id&&<ExecutionCard key={e.id+'-'+e.versao} execution={e} userId={userId} reload={reload}/>}</div>)}
    {updated&&<p className="text-xs text-muted-foreground">Atualizado às {updated.toLocaleTimeString('pt-BR',{timeZone:'America/Sao_Paulo'})}</p>}
  </section>;
}

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Square, Timer } from 'lucide-react';
import { toast } from 'sonner';
import { jornadaDb,rpc,type Registro } from '@/lib/jornada';
import { clock } from '@/lib/jornada-metrics';
import { Button } from '@/components/ui/button';
export function TimerBar({userId}:{userId:string}) {
 const [active,setActive]=useState<Registro|null>(null),[now,setNow]=useState(() => Date.now()),[busy,setBusy]=useState(false);
 useEffect(()=>{
  let mounted=true;
  const load=async()=>{const {data,error}=await jornadaDb.from('talki_registros').select('*').eq('user_id',userId).is('fim',null).maybeSingle();if(mounted&&!error)setActive(data);};
  void load();const interval=setInterval(()=>void load(),15000);
  const change=()=>void load();window.addEventListener('talki:jornada-change',change);window.addEventListener('focus',change);
  return()=>{mounted=false;clearInterval(interval);window.removeEventListener('talki:jornada-change',change);window.removeEventListener('focus',change);};
 },[userId]);
 useEffect(()=>{if(!active)return;const t=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(t);},[active]);
 useEffect(()=>{document.title=active?`${clock((now-Date.parse(active.inicio))/1000)} · ${active.descricao} · Talki`:'Talki';return()=>{document.title='Talki';};},[active,now]);
 if(!active)return null;
 return <div className="mx-2 mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-primary/30 bg-primary/10 px-4 py-2 sm:mx-5"><Timer className="size-4 text-primary"/><Link to="/jornada" className="min-w-0 flex-1 truncate text-sm">{active.descricao}</Link><span className="font-mono text-sm tabular-nums">{clock((now-Date.parse(active.inicio))/1000)}</span><Button size="sm" variant="secondary" disabled={busy} onClick={async()=>{setBusy(true);try{await rpc('talki_jornada_save',{p_action:'finish'});}catch(e){toast.error(e instanceof Error?e.message:'Erro ao encerrar');}finally{setBusy(false);}}}><Square/>Encerrar</Button></div>;
}

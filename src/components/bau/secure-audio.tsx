import {useEffect,useRef,useState} from 'react';
import {Play} from 'lucide-react';
import {supabase} from '@/supabase';
import {BAU_BUCKET} from '@/lib/bau-files';
import {Button} from '@/components/ui/button';
export function SecureAudio({path}:{path:string}){
 const [enabled,setEnabled]=useState(false),[url,setUrl]=useState(''),[error,setError]=useState('');
 const player=useRef<HTMLAudioElement>(null),position=useRef(0),playing=useRef(false);
 useEffect(()=>{if(!enabled)return;let active=true;
  async function load(){const {data,error}=await supabase.storage.from(BAU_BUCKET).createSignedUrl(path,3600);if(!active)return;if(error){setError('Não foi possível abrir o áudio. Recarregue o registro para verificar seu acesso.');return;}if(player.current){position.current=player.current.currentTime;playing.current=!player.current.paused;}setError('');setUrl(data.signedUrl);}
  void load();const timer=setInterval(()=>void load(),50*60000);return()=>{active=false;clearInterval(timer);};
 },[path,enabled]);
 if(!enabled)return <Button variant="outline" size="sm" onClick={()=>setEnabled(true)}><Play/>Ouvir áudio</Button>;
 return error?<p role="alert" className="text-xs text-destructive">{error}</p>:url?<audio ref={player} className="h-10 w-full" controls preload="metadata" src={url} onLoadedMetadata={()=>{if(player.current){player.current.currentTime=position.current;if(playing.current)void player.current.play().catch(()=>{});}}} onError={()=>setError('O navegador não conseguiu reproduzir este formato. Você pode baixar o arquivo.')}/>:<p className="text-xs text-muted-foreground">Abrindo áudio…</p>;
}

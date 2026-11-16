import {supabase} from '@/supabase';
export async function requestAudioProcessing(fileId:string){
 const {data:{session}}=await supabase.auth.getSession();
 if(!session)throw new Error('Entre novamente para gerar a transcrição.');
 const response=await fetch('/api/bau-transcribe',{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${session.access_token}`},body:JSON.stringify({fileId})});
 const result=await response.json().catch(()=>({}));
 if(!response.ok)throw new Error(result.error||'Não foi possível iniciar a transcrição. Tente novamente.');
}

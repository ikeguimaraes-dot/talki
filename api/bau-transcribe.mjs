import {createClient} from '@supabase/supabase-js';
import {waitUntil} from '@vercel/functions';
import {timingSafeEqual} from 'node:crypto';
import {runWorker} from '../server/bau-worker.mjs';

function equal(a,b){return !!a&&!!b&&Buffer.byteLength(a)===Buffer.byteLength(b)&&timingSafeEqual(Buffer.from(a),Buffer.from(b));}
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(!['GET','POST'].includes(req.method))return res.status(405).json({error:'Método não permitido.'});
 const token=(req.headers.authorization??'').replace(/^Bearer /i,'');
 const url=process.env.VITE_SUPABASE_URL,anon=process.env.VITE_SUPABASE_ANON_KEY;
 if(!process.env.OPENAI_API_KEY||!process.env.SUPABASE_SERVICE_ROLE_KEY||!url||!anon)return res.status(503).json({error:'A transcrição ainda não está configurada.'});
 const admin=createClient(url,process.env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
 try{
  if(req.method==='GET'){
   if(!equal(token,process.env.CRON_SECRET))return res.status(401).json({error:'Não autorizado.'});
   // Each invocation does bounded work; cron resumes checkpoints independently of the browser.
   const processed=await runWorker(admin);return res.status(200).json({processed});
  }
  const client=createClient(url,anon,{global:{headers:{Authorization:`Bearer ${token}`}},auth:{persistSession:false,autoRefreshToken:false}});
  const {data:{user},error:authError}=await client.auth.getUser();
  if(authError||!user)return res.status(401).json({error:'Entre novamente para continuar.'});
  const id=req.body?.fileId;
  if(typeof id!=='string'||!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(id))return res.status(400).json({error:'Áudio inválido.'});
  const {error}=await client.rpc('talki_bau_enqueue_audio',{target:id});
  if(error)return res.status(403).json({error:'Não foi possível iniciar. Verifique seu acesso e se o envio do áudio terminou.'});
  waitUntil(runWorker(admin,id).catch(()=>console.error('bau-worker: não foi possível processar a fila; nova tentativa pelo agendador.')));
  return res.status(202).json({ok:true});
 }catch{return res.status(503).json({error:'Processamento indisponível. Tente novamente.'});}
}

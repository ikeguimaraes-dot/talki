import { createClient } from '@supabase/supabase-js';
import { waitUntil } from '@vercel/functions';
import { REDIRECT_URI, SCOPES, checked, configured, listGoogleCalendars, hash, safeEqual, seal, secret, synchronizeOwner, tokenRequest, unseal } from '../server/google-calendar.mjs';
const cookieName='__Host-talki-google-state';
const cookie=value=>`${cookieName}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${value?'600':'0'}`;
const origin=new URL(REDIRECT_URI).origin;
const allowedOrigins=new Set([origin,'https://talki-eight.vercel.app','http://localhost:5173']);
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');res.setHeader('Referrer-Policy','no-referrer');
 const action=req.query?.action||'status';
 if(!['GET','POST'].includes(req.method)){res.setHeader('Allow','GET, POST');return res.status(405).json({error:'Método inválido.'});}
 const env=process.env;
 if(!env.SUPABASE_SERVICE_ROLE_KEY)return res.status(503).json({error:'Integração indisponível.'});
 const db=createClient(env.VITE_SUPABASE_URL,env.SUPABASE_SERVICE_ROLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
 try{
  if(action==='callback'&&req.method==='GET'){
   res.setHeader('Set-Cookie',cookie(''));
   if(!configured())return res.redirect(303,`${origin}/agenda?google=unavailable`);
   const state=typeof req.query.state==='string'?req.query.state:'';
   const browser=(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith(`${cookieName}=`))?.slice(cookieName.length+1)||'';
   const rows=await checked(db.from('talki_google_oauth_states').delete().eq('state_hash',hash(state)).gt('expires_at',new Date().toISOString()).select('*'));
   const pending=rows?.[0];
   if(!pending||!safeEqual(pending.browser_hash,hash(browser)))return res.redirect(303,`${origin}/agenda?google=expired`);
   if(req.query.error||typeof req.query.code!=='string')return res.redirect(303,`${origin}/agenda?google=cancelled`);
   const tokens=await tokenRequest({grant_type:'authorization_code',code:req.query.code,redirect_uri:REDIRECT_URI,code_verifier:unseal(pending.verifier)});
   if(!tokens.refresh_token||!SCOPES.every(scope=>tokens.scope?.split(' ').includes(scope)))return res.redirect(303,`${origin}/agenda?google=permissions`);
   const calendars=await listGoogleCalendars(tokens.access_token);
   const primary=calendars.find(calendar=>calendar.primary&&calendar.access_role==='owner');
   if(!primary)return res.redirect(303,`${origin}/agenda?google=permissions`);
   await checked(db.rpc('talki_google_connect',{p_owner:pending.owner_id,p_account:primary.id,p_refresh:seal(tokens.refresh_token),p_scopes:tokens.scope.split(' '),p_calendars:calendars}));
   waitUntil(synchronizeOwner(db,pending.owner_id));
   return res.redirect(303,`${origin}/agenda?google=connected`);
  }
  const bearer=(req.headers.authorization||'').replace(/^Bearer /i,'');
  if(action==='cron'&&req.method==='GET'){
   if(!env.CRON_SECRET||!safeEqual(bearer,env.CRON_SECRET))return res.status(401).json({error:'Não autorizado.'});
   if(!configured())return res.status(200).json({configured:false});
   const connections=await checked(db.from('talki_google_connections').select('owner_id').eq('enabled',true).order('last_attempt_at',{ascending:true,nullsFirst:true}).limit(100));
   // Bounded parallelism; each connection has a database lease.
   const owners=[...new Set(connections.map(c=>c.owner_id))];
   const until=Date.now()+220000;let processed=0;
   for(let i=0;i<owners.length&&Date.now()<until-15000;i+=3){const batch=owners.slice(i,i+3);await Promise.all(batch.map(owner=>synchronizeOwner(db,owner,{until})));processed+=batch.length;}
   return res.status(200).json({processed});
  }
  const {data:{user},error}=await db.auth.getUser(bearer);
  if(error||!user)return res.status(401).json({error:'Entre novamente no Talki.'});
  if(action==='status'&&req.method==='GET'){
   const connections=await checked(db.from('talki_google_connections').select('id,calendar_id,account_id,label,color,access_role,is_default,enabled,last_sync_at,last_error,lease_until,granted_scopes,refresh_token').eq('owner_id',user.id).order('account_id').order('label'));
   return res.status(200).json({configured:configured(),connections:connections.map(({refresh_token,granted_scopes,...calendar})=>({...calendar,connected:!!refresh_token,requiresPermission:!!refresh_token&&!SCOPES.every(scope=>granted_scopes?.includes(scope))})),syncing:connections.some(c=>c.lease_until&&Date.parse(c.lease_until)>Date.now())});
  }
  if(req.method!=='POST')return res.status(405).json({error:'Use POST.'});
  if(req.headers.origin&&!allowedOrigins.has(req.headers.origin))return res.status(403).json({error:'Origem inválida.'});
  if(!configured())return res.status(503).json({error:'Falta configurar as credenciais do Google no Talki.'});
  if(action==='connect'){
   // Keep the OAuth cookie and callback on the canonical host.
   if(req.headers.host!==new URL(origin).host)return res.status(409).json({error:'Abra talki.freneze.com.br para conectar o Google.',url:`${origin}/agenda`});
   const state=secret(),browser=secret(),verifier=secret();
   await checked(db.from('talki_google_oauth_states').delete().lt('expires_at',new Date().toISOString()));
   await checked(db.from('talki_google_oauth_states').delete().eq('owner_id',user.id));
   await checked(db.from('talki_google_oauth_states').insert({state_hash:hash(state),owner_id:user.id,verifier:seal(verifier),browser_hash:hash(browser),expires_at:new Date(Date.now()+600000).toISOString()}));
   const params=new URLSearchParams({client_id:env.GOOGLE_CLIENT_ID,redirect_uri:REDIRECT_URI,response_type:'code',scope:SCOPES.join(' '),state,access_type:'offline',prompt:'consent select_account',code_challenge:Buffer.from(hash(verifier),'hex').toString('base64url'),code_challenge_method:'S256'});
   res.setHeader('Set-Cookie',cookie(browser));return res.status(200).json({url:`https://accounts.google.com/o/oauth2/v2/auth?${params}`});
  }
  if(action==='sync'){waitUntil(synchronizeOwner(db,user.id));return res.status(202).json({queued:true});}
  if(['disconnect','toggle','default'].includes(action)){
   const connectionId=req.body?.connectionId;
   if(typeof connectionId!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(connectionId))return res.status(400).json({error:'Escolha uma agenda válida.'});
   if(action==='toggle'&&typeof req.body?.enabled!=='boolean')return res.status(400).json({error:'Seleção de agenda inválida.'});
   const result=await db.rpc('talki_google_configure',{p_owner:user.id,p_connection:connectionId,p_action:action,p_enabled:action==='toggle'?req.body.enabled:null});
   if(result.error)return res.status(409).json({error:'Não foi possível alterar a agenda. Aguarde a sincronização terminar, confira a agenda padrão e tente novamente.'});
   if(action!=='disconnect')waitUntil(synchronizeOwner(db,user.id));
   return res.status(200).json({updated:true});
  }
  return res.status(404).json({error:'Ação desconhecida.'});
 }catch{
  if(action==='callback')return res.redirect(303,`${origin}/agenda?google=failed`);
  return res.status(503).json({error:'Não foi possível concluir a conexão com o Google. Tente novamente.'});
 }
}

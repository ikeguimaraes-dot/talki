import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
export const REDIRECT_URI = 'https://talki.freneze.com.br/api/google-calendar?action=callback';
export const SCOPES = ['https://www.googleapis.com/auth/calendar.events', 'https://www.googleapis.com/auth/calendar.calendarlist.readonly', 'https://www.googleapis.com/auth/tasks.readonly'];
export const hash = value => createHash('sha256').update(value).digest('hex');
export const secret = () => randomBytes(32).toString('base64url');
export function safeEqual(a, b) { return typeof a === 'string' && typeof b === 'string' && Buffer.byteLength(a) === Buffer.byteLength(b) && timingSafeEqual(Buffer.from(a), Buffer.from(b)); }
export function configured() { return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET && /^[a-f0-9]{64}$/i.test(process.env.GOOGLE_CALENDAR_ENCRYPTION_KEY || '')); }
export function seal(value) {
 const iv=randomBytes(12), cipher=createCipheriv('aes-256-gcm',Buffer.from(process.env.GOOGLE_CALENDAR_ENCRYPTION_KEY,'hex'),iv);
 const encrypted=Buffer.concat([cipher.update(value,'utf8'),cipher.final()]);return Buffer.concat([iv,cipher.getAuthTag(),encrypted]).toString('base64url');
}
export function unseal(value) { const bytes=Buffer.from(value,'base64url'),decipher=createDecipheriv('aes-256-gcm',Buffer.from(process.env.GOOGLE_CALENDAR_ENCRYPTION_KEY,'hex'),bytes.subarray(0,12));decipher.setAuthTag(bytes.subarray(12,28));return Buffer.concat([decipher.update(bytes.subarray(28)),decipher.final()]).toString('utf8'); }
export class GoogleError extends Error { constructor(status){super(`Google Calendar (${status})`);this.status=status;} }
export async function tokenRequest(params) {
 const response=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({client_id:process.env.GOOGLE_CLIENT_ID,client_secret:process.env.GOOGLE_CLIENT_SECRET,...params}),signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw new GoogleError(response.status===400?401:response.status);return response.json();
}
export async function google(token,path,{method='GET',body,etag}={}) {
 const response=await fetch(`https://www.googleapis.com/calendar/v3/${path}`,{method,headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json',...(etag?{'If-Match':etag}:{})},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw new GoogleError(response.status);return response.status===204?null:response.json();
}
export async function googleTasks(token,path) {
 const response=await fetch(`https://tasks.googleapis.com/tasks/v1/${path}`,{headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(15000)});
 if(!response.ok)throw new GoogleError(response.status);return response.json();
}
const day=value=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(value));
const instant=value=>new Date(value).toISOString();
export function fromGoogle(event) {
 if(!event.start || !event.end)return null;
 const allDay=!!event.start.date;
 const inicio=instant(allDay?`${event.start.date}T00:00:00-03:00`:event.start.dateTime),fim=instant(allDay?`${event.end.date}T00:00:00-03:00`:event.end.dateTime);
 if(fim<=inicio)return null;
 const rawLink=event.extendedProperties?.private?.talkiLink??event.hangoutLink??'';
 return {titulo:(event.summary||'Sem título').slice(0,240),descricao:(event.description||'').slice(0,10000),inicio,fim,dia_inteiro:allDay,local:(event.location||'').slice(0,500),link:/^https?:\/\//i.test(rawLink)?rawLink.slice(0,2000):''};
}
export function fields(event) { return {titulo:event.titulo,descricao:event.descricao,inicio:instant(event.inicio),fim:instant(event.fim),dia_inteiro:event.dia_inteiro,local:event.local,link:event.link}; }
export const same=(a,b)=>!!a&&!!b&&Object.keys(a).every(key=>a[key]===b[key])&&Object.keys(a).length===Object.keys(b).length;
export function toGoogle(local,baseline=null,remote={}) {
 const value=fields(local), patch={};
 for(const [localKey,googleKey] of [['titulo','summary'],['descricao','description'],['local','location']])if(!baseline||value[localKey]!==baseline[localKey])patch[googleKey]=value[localKey];
 if(!baseline||['inicio','fim','dia_inteiro'].some(key=>value[key]!==baseline[key])){
  patch.start=value.dia_inteiro?{date:day(value.inicio)}:{dateTime:value.inicio,timeZone:'America/Sao_Paulo'};
  patch.end=value.dia_inteiro?{date:day(value.fim)}:{dateTime:value.fim,timeZone:'America/Sao_Paulo'};
 }
 if(!baseline||value.link!==baseline.link)patch.extendedProperties={private:{...remote.extendedProperties?.private,talkiLink:value.link}};
 return patch;
}
export function resolution(local,remote,baseline) {
 if(!local)return 'import';
 if(remote.status==='cancelled')return 'delete';
 const normalized=fromGoogle(remote);if(!normalized)return 'skip';
 const localChanged=!same(fields(local),baseline),remoteChanged=!same(normalized,baseline);
 if(!localChanged&&!remoteChanged)return 'same';
 if(localChanged&&!remoteChanged)return 'push';
 if(!localChanged)return 'pull';
 return Date.parse(local.updated_at)>Date.parse(remote.updated||'1970-01-01')?'push':'pull';
}
export async function checked(query) { const {data,error}=await query;if(error)throw new Error('Não foi possível salvar a sincronização.');return data; }
async function all(query) { const rows=[];for(let offset=0;;offset+=500){const data=await checked(query().range(offset,offset+499));rows.push(...data);if(data.length<500)return rows;} }
export function readableError(error) { if(error instanceof GoogleError){if(error.status===401)return 'Sua autorização expirou. Reconecte o Google.';if(error.status===403)return 'O Google não permitiu o acesso. Verifique as permissões da Agenda e do Google Tasks.';if(error.status===429)return 'O Google limitou as solicitações. Tentaremos novamente.';}return 'A sincronização não terminou. Tentaremos novamente; seus compromissos foram preservados.'; }
export async function synchronizeGoogleTasks(db,owner,token,{call=googleTasks,now=Date.now,deadline=Infinity,accountId=null}={}) {
 const lists=[];let pageToken;let listPages=0;
 do {
  if(++listPages>20||now()>deadline)throw new Error('Listas de tarefas grandes demais para uma única execução.');
  const params=new URLSearchParams({maxResults:'1000',...(pageToken?{pageToken}:{})});
  const page=await call(token,`users/@me/lists?${params}`);lists.push(...(page.items||[]));pageToken=page.nextPageToken;
 }while(pageToken);
 let imported=0;
 for(const list of lists){
  const tasks=new Map();let taskPages=0;
  // completedMin applies to the completion timestamp. Pending tasks do not
  // have one, so they must be fetched in a separate unbounded-active query.
  const filters=[
   {showCompleted:'false',showDeleted:'true',showHidden:'false',showAssigned:'true'},
   {showCompleted:'true',showDeleted:'true',showHidden:'true',showAssigned:'true',completedMin:new Date(now()-90*86400000).toISOString()}
  ];
  for(const filter of filters){
   let taskPageToken;
   do {
    if(++taskPages>200||now()>deadline)throw new Error('Tarefas grandes demais para uma única execução.');
    const params=new URLSearchParams({maxResults:'100',...filter,...(taskPageToken?{pageToken:taskPageToken}:{})});
    const page=await call(token,`lists/${encodeURIComponent(list.id)}/tasks?${params}`);
    for(const task of page.items||[])if(task.id)tasks.set(task.id,task);
    taskPageToken=page.nextPageToken;
   }while(taskPageToken);
  }
  for(const task of tasks.values()){
   // Only dated Tasks are visible on the Google Calendar grid. Undated items
   // may be old imports or reminders from Gmail and other Google surfaces.
   const kanbanTask=task.deleted||task.due?task:{...task,deleted:true};
   await checked(db.rpc('talki_google_task_apply',{p_owner:owner,p_tasklist:accountId?`${accountId}:${list.id}`:list.id,p_remote:task.id,p_task:kanbanTask}));imported++;
  }
 }
 return imported;
}
// Full bounded snapshots deliberately expand recurrence and advance the horizon every run.
// A missing event is never treated as deleted without checking its individual resource.
export async function synchronize(db,owner,{call=google,taskCall=null,refresh=tokenRequest,now=Date.now,until=Infinity,connectionId,syncTasks=true}={}) {
 const lease=randomUUID();const claimed=await checked(db.rpc('talki_google_claim',{p_owner:owner,p_lease:lease,p_connection:connectionId}));
 const connection=claimed?.[0];if(!connection)return {busy:true};
 const deadline=Math.min(now()+220000,until);let finished=true;let failures=0;
 try {
  const {access_token}=await refresh({grant_type:'refresh_token',refresh_token:unseal(connection.refresh_token)});
  if(syncTasks&&(taskCall||call===google)&&connection.granted_scopes?.includes('https://www.googleapis.com/auth/tasks.readonly'))await synchronizeGoogleTasks(db,owner,access_token,{call:taskCall||googleTasks,now,deadline,accountId:connection.account_id});
  const root=`calendars/${encodeURIComponent(connection.calendar_id)}/events`;
  const params=new URLSearchParams({singleEvents:'true',showDeleted:'true',maxResults:'2500',timeMin:new Date(now()-90*86400000).toISOString(),timeMax:new Date(now()+365*86400000).toISOString()});
  const remoteEvents=new Map();let pageToken;let pages=0;
  do {if(++pages>20||now()>deadline)throw new Error('Agenda muito grande para uma única execução.');const page=await call(access_token,`${root}?${params}${pageToken?`&pageToken=${encodeURIComponent(pageToken)}`:''}`);for(const event of page.items||[])remoteEvents.set(event.id,event);pageToken=page.nextPageToken;}while(pageToken);
  const links=await all(()=>db.from('talki_google_event_links').select('*').eq('owner_id',owner).eq('connection_id',connection.id).order('local_id'));
  const locals=await all(()=>db.from('talki_agenda_events').select('*').eq('owner_id',owner).is('plan_id',null).order('id'));
  const calendarReadOnly=!['owner','writer'].includes(connection.access_role);
  const localMap=new Map(locals.map(event=>[event.id,event])),linkedIds=new Set(links.map(link=>link.local_id));
  const apply=async(link,local,event)=>checked(db.rpc('talki_google_apply',{p_owner:owner,p_local:link.local_id,p_remote:link.remote_id,p_expected:local?.updated_at??null,p_event:event?.status==='cancelled'?null:fromGoogle(event),p_connection:connection.id,p_read_only:calendarReadOnly||!!event&&!!(event.organizer?.self===false||(event.eventType&&event.eventType!=='default'))}));
  for(const link of links){
   if(now()>deadline){finished=false;break;}
   const local=localMap.get(link.local_id);let remote=remoteEvents.get(link.remote_id);remoteEvents.delete(link.remote_id);
   if(link.remote_deleted)continue;
   try {
    if(!link.remote_created && !link.local_deleted && local){
     try{remote=await call(access_token,root,{method:'POST',body:{id:link.remote_id,...toGoogle(local)}});}catch(error){if(error.status===409)remote=await call(access_token,`${root}/${encodeURIComponent(link.remote_id)}`);else throw error;}
     await checked(db.from('talki_google_event_links').update({remote_created:true}).eq('owner_id',owner).eq('connection_id',connection.id).eq('local_id',link.local_id));
     link.remote_created=true;
    }
    if(!remote){try{remote=await call(access_token,`${root}/${encodeURIComponent(link.remote_id)}`);}catch(error){if([404,410].includes(error.status))remote={id:link.remote_id,status:'cancelled'};else throw error;}}
    if(link.local_deleted){
     if(calendarReadOnly)throw new GoogleError(403);
     if(remote.status!=='cancelled')await call(access_token,`${root}/${encodeURIComponent(link.remote_id)}?sendUpdates=none`,{method:'DELETE',etag:remote.etag});
     await checked(db.from('talki_google_event_links').update({remote_deleted:true}).eq('owner_id',owner).eq('connection_id',connection.id).eq('local_id',link.local_id));continue;
    }
    if(!local)continue;
    const action=resolution(local,remote,link.baseline);
    if(action==='delete'||action==='pull')await apply(link,local,remote);
    else if(action==='push'){
     if(link.read_only||calendarReadOnly){await apply(link,local,remote);continue;}
     const updated=await call(access_token,`${root}/${encodeURIComponent(link.remote_id)}?sendUpdates=none`,{method:'PATCH',body:toGoogle(local,link.baseline,remote),etag:remote.etag});
     await checked(db.from('talki_google_event_links').update({baseline:fromGoogle(updated)}).eq('owner_id',owner).eq('connection_id',connection.id).eq('local_id',link.local_id));
     await apply(link,local,updated);
    }
   }catch(error){if([401,429].includes(error.status))throw error;failures++;}
  }
  if(finished)for(const remote of remoteEvents.values()){
   if(now()>deadline){finished=false;break;}
   if(remote.status==='cancelled'||!fromGoogle(remote))continue;
   try{await apply({local_id:randomUUID(),remote_id:remote.id},null,remote);}catch{failures++;}
  }
  if(finished)for(const local of locals){
   if(now()>deadline){finished=false;break;}
   if(calendarReadOnly||linkedIds.has(local.id)||local.google_linked)continue;
   if(local.google_calendar_id?local.google_calendar_id!==connection.id:!connection.is_default)continue;
   // Persist the idempotency key BEFORE the remote side effect.
   const remoteId=`talki${local.id.replaceAll('-','')}`;
   try{
    const prepared=await checked(db.rpc('talki_google_prepare',{p_owner:owner,p_local:local.id,p_remote:remoteId,p_expected:local.updated_at,p_baseline:fields(local),p_connection:connection.id}));
    if(!prepared?.[0])continue;
    local.updated_at=prepared[0].updated_at;
    let remote;
    try{remote=await call(access_token,root,{method:'POST',body:{id:remoteId,...toGoogle(local)}});}catch(error){if(error.status===409)remote=await call(access_token,`${root}/${remoteId}`);else throw error;}
    await checked(db.from('talki_google_event_links').update({remote_created:true}).eq('owner_id',owner).eq('connection_id',connection.id).eq('local_id',local.id));
    await apply({local_id:local.id,remote_id:remoteId},local,remote);
   }catch(error){if([401,429].includes(error.status))throw error;failures++;}
  }
  await checked(db.from('talki_google_connections').update({...(finished&&!failures?{last_sync_at:new Date(now()).toISOString()}:{}),last_error:failures?'Alguns compromissos não sincronizaram. Tentaremos novamente.':finished?null:'Sincronização em andamento; continuará automaticamente.'}).eq('owner_id',owner).eq('id',connection.id).eq('lease_id',lease));
  return {finished:finished&&!failures};
 }catch(error){await checked(db.from('talki_google_connections').update({last_error:readableError(error),...(error.status===401?{enabled:false}:{})}).eq('owner_id',owner).eq('id',connection.id).eq('lease_id',lease));return {failed:true};}
 finally{await checked(db.from('talki_google_connections').update({lease_id:null,lease_until:null}).eq('owner_id',owner).eq('id',connection.id).eq('lease_id',lease));}
}

// Serial per owner: the same Google Tasks account is imported once per run.
export async function synchronizeOwner(db,owner,{until=Date.now()+220000,...options}={}) {
 const connections=await checked(db.from('talki_google_connections').select('id,account_id').eq('owner_id',owner).eq('enabled',true).order('last_attempt_at',{ascending:true,nullsFirst:true}).order('id'));
 const accounts=new Set();const results=[];
 for(const connection of connections){
  if(Date.now()>until-15000)break;
  const result=await synchronize(db,owner,{...options,until,connectionId:connection.id,syncTasks:!accounts.has(connection.account_id)});
  if(!result.busy&&!result.failed)accounts.add(connection.account_id);
  results.push(result);
 }
 return results;
}
export async function listGoogleCalendars(token,{call=google}={}) {
 const calendars=[];let pageToken;let pages=0;
 do {
  if(++pages>20)throw new Error('Muitas agendas para uma conexão.');
  const params=new URLSearchParams({minAccessRole:'reader',maxResults:'250',showHidden:'true',...(pageToken?{pageToken}:{})});
  const page=await call(token,`users/me/calendarList?${params}`);calendars.push(...(page.items||[]));pageToken=page.nextPageToken;
 }while(pageToken);
 return calendars.filter(c=>c.id&&['owner','writer','reader','writerWithoutPrivateAccess'].includes(c.accessRole)).map(c=>({id:c.id,label:c.summaryOverride||c.summary||c.id,primary:!!c.primary,access_role:c.accessRole,color:/^#[0-9a-f]{6}$/i.test(c.backgroundColor||'')?c.backgroundColor:'#4285F4'}));
}

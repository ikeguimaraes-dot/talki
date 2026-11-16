import test from 'node:test';
import assert from 'node:assert/strict';
import { fields, fromGoogle, toGoogle, resolution, seal, unseal, synchronize, synchronizeGoogleTasks, GoogleError, listGoogleCalendars, synchronizeOwner } from '../server/google-calendar.mjs';
process.env.GOOGLE_CALENDAR_ENCRYPTION_KEY='12'.repeat(32);
const local={id:'00000000-0000-0000-0000-000000000001',owner_id:'owner',plan_id:null,titulo:'Reunião',descricao:'Pauta',inicio:'2026-10-03T12:00:00Z',fim:'2026-10-03T13:00:00Z',dia_inteiro:false,local:'Sala',link:'',updated_at:'2026-10-03T10:00:00Z'};
const remote={id:'google1',summary:'Reunião',description:'Pauta',location:'Sala',start:{dateTime:local.inicio},end:{dateTime:local.fim},updated:'2026-10-03T09:00:00Z',etag:'"1"',organizer:{self:true}};
test('refresh tokens authenticated encryption rejects tampering',()=>{const encrypted=seal('secret');assert.equal(unseal(encrypted),'secret');const bytes=Buffer.from(encrypted,'base64url');bytes[30]^=1;assert.throws(()=>unseal(bytes.toString('base64url')));assert.notEqual(encrypted,seal('secret'));});
test('all-day exclusive end and timezone survive both directions',()=>{const event=fromGoogle({...remote,start:{date:'2026-10-03'},end:{date:'2026-10-05'}});assert.equal(event.inicio,'2026-10-03T03:00:00.000Z');assert.deepEqual(toGoogle(event).end,{date:'2026-10-05'});});
test('patches preserve participants, Meet and untouched full descriptions',()=>{const baseline=fields(local);const patch=toGoogle({...local,titulo:'Nova pauta'},baseline,{...remote,description:'x'.repeat(20000),attendees:[{email:'x@example.test'}]});assert.deepEqual(patch,{summary:'Nova pauta'});});
test('two-sided conflicts pick latest update; cancellations win',()=>{const baseline=fields(local);assert.equal(resolution(local,remote,baseline),'same');assert.equal(resolution({...local,titulo:'Local'},remote,baseline),'push');assert.equal(resolution(local,{...remote,summary:'Remoto'},baseline),'pull');assert.equal(resolution({...local,titulo:'Local'},{...remote,summary:'Remoto'},baseline),'push');assert.equal(resolution({...local,titulo:'Local'},{...remote,summary:'Remoto',updated:'2026-10-03T11:00:00Z'},baseline),'pull');assert.equal(resolution(local,{status:'cancelled'},baseline),'delete');});
test('native Google Tasks from every list are sent to the Kanban apply RPC',async()=>{
 const applied=[];const db={rpc:async(name,p)=>{applied.push([name,p]);return {data:p.p_remote,error:null};}};
 const calls=[];const call=async(token,path)=>{calls.push(path);if(path.startsWith('users/'))return {items:[{id:'list/a'},{id:'list-b'}]};if(path.includes('showCompleted=false'))return path.includes('list%2Fa')?{items:[{id:'task-1',title:'Agendada',status:'needsAction',due:'2026-10-05T00:00:00.000Z'},{id:'legacy',title:'Lembrete antigo',status:'needsAction'}]}:{items:[]};return path.includes('list-b')?{items:[{id:'task-2',title:'Concluída',status:'completed',due:'2026-10-04T00:00:00.000Z'}]}:{items:[]};};
 const count=await synchronizeGoogleTasks(db,'owner','token',{call,now:()=>Date.parse('2026-10-05T12:00:00Z')});
 assert.equal(count,3);assert.equal(applied.length,3);assert.equal(applied[0][0],'talki_google_task_apply');assert.equal(applied[0][1].p_tasklist,'list/a');assert.equal(applied[1][1].p_remote,'legacy');assert.equal(applied[1][1].p_task.deleted,true);assert.equal(applied[2][1].p_remote,'task-2');assert.match(calls[1],/showCompleted=false/);assert.match(calls[2],/completedMin=/);
});
// In-memory persistence exercises worker retries, tombstones and CAS, not provider internals.
function database({events=[structuredClone(local)],links=[]}={}){
 const tables={talki_google_connections:[{id:'calendar-1',owner_id:'owner',account_id:'account-a',calendar_id:'primary',access_role:'owner',is_default:true,refresh_token:seal('refresh'),enabled:true}],talki_google_event_links:structuredClone(links.map(l=>({connection_id:'calendar-1',...l}))),talki_agenda_events:events};
 return {tables,from(name){let predicate=()=>true,kind='select',payload,lo=0,hi=Infinity;const q={select(){return q;},eq(k,v){const old=predicate;predicate=r=>old(r)&&r[k]===v;return q;},is(k,v){return q.eq(k,v);},order(){return q;},range(a,b){lo=a;hi=b;return q;},insert(p){kind='insert';payload=p;return q;},update(p){kind='update';payload=p;return q;},then(resolve){let rows=tables[name].filter(predicate);if(kind==='insert'){rows=[structuredClone(payload)];tables[name].push(...rows);}if(kind==='update')for(const row of rows)Object.assign(row,payload);return Promise.resolve({data:structuredClone(rows.slice(lo,hi+1)),error:null}).then(resolve);}};return q;},async rpc(name,p){
  if(name==='talki_google_task_apply'){(tables.appliedTasks??=[]).push(p);return {data:p.p_remote};}
  if(name==='talki_google_claim'){const c=tables.talki_google_connections.find(c=>c.id===p.p_connection);if(!c||c.lease_id||!c.enabled)return {data:[]};c.lease_id=p.p_lease;return {data:[structuredClone(c)]};}
  let event=tables.talki_agenda_events.find(e=>e.id===p.p_local),link=tables.talki_google_event_links.find(l=>l.local_id===p.p_local);
  if(name==='talki_google_prepare'){if(!event||event.updated_at!==p.p_expected)return {data:[]};event.google_linked=true;tables.talki_google_event_links.push({owner_id:p.p_owner,local_id:p.p_local,remote_id:p.p_remote,baseline:p.p_baseline,remote_created:false,connection_id:p.p_connection});return {data:[structuredClone(event)]};}
  if(link?.local_deleted||(event&&event.updated_at!==p.p_expected))return {data:false};
  if(p.p_event===null){tables.talki_agenda_events=tables.talki_agenda_events.filter(e=>e.id!==p.p_local);if(link)link.remote_deleted=true;return {data:true};}
  if(!event){event={id:p.p_local,owner_id:p.p_owner,plan_id:null};tables.talki_agenda_events.push(event);}Object.assign(event,p.p_event,{google_linked:true,google_read_only:p.p_read_only});
  if(!link){link={owner_id:p.p_owner,local_id:p.p_local,remote_id:p.p_remote,remote_created:true,connection_id:p.p_connection};tables.talki_google_event_links.push(link);}link.baseline=p.p_event;return {data:true};
 }};
}
const link={owner_id:'owner',local_id:local.id,remote_id:remote.id,baseline:fields(local),remote_created:true};
const run=(db,call)=>synchronize(db,'owner',{call,refresh:async()=>({access_token:'token'}),now:()=>Date.parse('2026-10-03T12:00:00Z'),connectionId:'calendar-1'});
test('remote cancellation deletes locally, never queues a delete back to Google',async()=>{const db=database({links:[link]});const calls=[];await run(db,async(pathToken,path,options)=>{calls.push(options?.method||'GET');return {items:[{id:remote.id,status:'cancelled'}]};});assert.equal(db.tables.talki_agenda_events.length,0);assert.equal(db.tables.talki_google_event_links[0].remote_deleted,true);assert.deepEqual(calls,['GET']);});
test('absence from bounded snapshot is checked individually, moved event is retained',async()=>{const db=database({links:[link]});await run(db,async(token,path)=>path.includes('?')?{items:[]}:remote);assert.equal(db.tables.talki_agenda_events.length,1);});
test('response loss after remote insertion retries the same id without duplicates',async()=>{const db=database();const provider=new Map();let loseResponse=true;
 const call=async(token,path,options)=>{if(options?.method==='POST'){const event={...remote,...options.body};if(provider.has(event.id))throw new GoogleError(409);provider.set(event.id,event);if(loseResponse){loseResponse=false;throw new Error('timeout');}return event;}if(path.includes('?'))return {items:[...provider.values()]};const result=provider.get(path.split('/').at(-1));if(!result)throw new GoogleError(404);return result;};
 await run(db,call);assert.equal(provider.size,1);assert.equal(db.tables.talki_google_event_links[0].remote_created,false);await run(db,call);assert.equal(provider.size,1);assert.equal(db.tables.talki_google_event_links[0].remote_created,true);assert.equal(db.tables.talki_agenda_events.length,1);
});
test('local deletion during a failed create removes the possibly-created remote event',async()=>{const db=database({events:[],links:[{...link,remote_created:false,local_deleted:true}]});let deleted=false;await run(db,async(token,path,options)=>{if(options?.method==='DELETE'){deleted=true;return null;}if(path.includes('?'))return {items:[]};return remote;});assert.equal(deleted,true);assert.equal(db.tables.talki_google_event_links[0].remote_deleted,true);});
test('concurrent local edit during Google PATCH is preserved for the next run',async()=>{const db=database({events:[{...local,titulo:'Primeira edição'}],links:[link]});await run(db,async(token,path,options)=>{if(options?.method==='PATCH'){Object.assign(db.tables.talki_agenda_events[0],{titulo:'Segunda edição',updated_at:'2026-10-03T12:00:00Z'});return {...remote,summary:options.body.summary};}return {items:[remote]};});assert.equal(db.tables.talki_agenda_events[0].titulo,'Segunda edição');assert.equal(db.tables.talki_google_event_links[0].baseline.titulo,'Primeira edição');});
test('a local edit after a lost create response is pushed rather than overwritten on recovery',async()=>{const db=database({events:[{...local,titulo:'Mais recente',google_linked:true}],links:[{...link,remote_created:false}]});let patched;await run(db,async(token,path,options)=>{if(options?.method==='POST')throw new GoogleError(409);if(options?.method==='PATCH'){patched=options.body.summary;return {...remote,summary:patched};}if(path.includes('?'))return {items:[remote]};return remote;});assert.equal(patched,'Mais recente');assert.equal(db.tables.talki_agenda_events[0].titulo,'Mais recente');});

test('calendar list reads every page, including shared read-only calendars',async()=>{
 const paths=[];const result=await listGoogleCalendars('token',{call:async(token,path)=>{paths.push(path);return paths.length===1?{items:[{id:'a',summary:'Pessoal',primary:true,accessRole:'owner',backgroundColor:'#aabbcc'}],nextPageToken:'next page'}:{items:[{id:'b',summary:'Equipe',accessRole:'reader',backgroundColor:'bad'},{id:'c',accessRole:'freeBusyReader'}]};}});
 assert.equal(result.length,2);assert.equal(result[1].access_role,'reader');assert.equal(result[1].color,'#4285F4');assert.match(paths[1],/pageToken=next\+page/);
});
test('same remote event ID in two calendars creates two independent source links',async()=>{
 const db=database({events:[]});db.tables.talki_google_connections.push({...db.tables.talki_google_connections[0],id:'calendar-2',calendar_id:'secondary',is_default:false});
 const call=async()=>({items:[remote]});
 for(const connectionId of ['calendar-1','calendar-2'])await synchronize(db,'owner',{call,connectionId,refresh:async()=>({access_token:'token'})});
 assert.equal(db.tables.talki_agenda_events.length,2);assert.deepEqual(db.tables.talki_google_event_links.map(l=>l.connection_id).sort(),['calendar-1','calendar-2']);
 await synchronize(db,'owner',{call,connectionId:'calendar-2',refresh:async()=>({access_token:'token'})});
 assert.equal(db.tables.talki_agenda_events.length,2);
});
test('only the default calendar receives unassigned events; selected events go to their chosen calendar',async()=>{
 const db=database({events:[{...local,google_calendar_id:'calendar-2'}]});db.tables.talki_google_connections.push({...db.tables.talki_google_connections[0],id:'calendar-2',calendar_id:'secondary',is_default:false});
 const posted=[];const call=async(token,path,options)=>{if(options?.method==='POST'){posted.push(path);return {...remote,...options.body};}return {items:[]};};
 for(const connectionId of ['calendar-1','calendar-2'])await synchronize(db,'owner',{call,connectionId,refresh:async()=>({access_token:'token'})});
 assert.deepEqual(posted,['calendars/secondary/events']);
});
test('read-only calendar imports events and never exports unlinked personal events',async()=>{
 const db=database();db.tables.talki_google_connections[0].access_role='reader';const methods=[];
 await run(db,async(token,path,options)=>{methods.push(options?.method||'GET');return {items:[remote]};});
 assert.deepEqual(methods,['GET']);assert.equal(db.tables.talki_agenda_events.find(e=>e.id!==local.id).google_read_only,true);
});
test('native Tasks identifiers are isolated per Google account',async()=>{
 const applied=[];const db={rpc:async(name,p)=>{applied.push(p);return {data:null};}};
 const call=async(token,path)=>path.startsWith('users/')?{items:[{id:'same-list'}]}:path.includes('showCompleted=false')?{items:[{id:'same-task',due:'2026-11-10T00:00:00Z'}]}:{items:[]};
 for(const accountId of ['account-a','account-b'])await synchronizeGoogleTasks(db,'owner','token',{call,accountId});
 assert.deepEqual(applied.map(p=>p.p_tasklist),['account-a:same-list','account-b:same-list']);
});

test('multiple selected calendars import Tasks once for each Google account',async()=>{
 const db=database({events:[]});const first=db.tables.talki_google_connections[0];first.granted_scopes=['https://www.googleapis.com/auth/tasks.readonly'];
 db.tables.talki_google_connections.push({...first,id:'calendar-2',calendar_id:'secondary',is_default:false},{...first,id:'calendar-3',account_id:'account-b',calendar_id:'other',is_default:false});
 const taskCall=async(token,path)=>path.startsWith('users/')?{items:[{id:'list'}]}:path.includes('showCompleted=false')?{items:[{id:'task',due:'2026-11-10T00:00:00Z'}]}:{items:[]};
 await synchronizeOwner(db,'owner',{call:async()=>({items:[]}),taskCall,refresh:async()=>({access_token:'token'})});
 assert.deepEqual(db.tables.appliedTasks.map(p=>p.p_tasklist),['account-a:list','account-b:list']);
});

import fs from 'node:fs';
import crypto from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
const key=fs.readFileSync(0,'utf8').trim();
const url='https://iqgrvptrtphvbmvrqntm.supabase.co';
const db=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
const file='.migration-local/browser-account.json';
let account;
if(fs.existsSync(file))account=JSON.parse(fs.readFileSync(file));
else{
 const id=crypto.randomUUID(),email=`talki-migration-test-${id}@example.com`,password=crypto.randomBytes(32).toString('base64url');
 const {data,error}=await db.auth.admin.createUser({id,email,password,email_confirm:true,user_metadata:{name:'Validação da migração'}});
 if(error)throw error;
 account={id:data.user.id,email,password};fs.writeFileSync(file,JSON.stringify(account),{mode:0o600});
}
const {data:link,error:linkError}=await db.auth.admin.generateLink({type:'recovery',email:account.email,options:{redirectTo:'https://talki.freneze.com.br/recuperar-senha'}});
if(linkError)throw linkError;
console.log(JSON.stringify({recovery_redirect:new URL(link.properties.action_link).searchParams.get('redirect_to')}));
const env=fs.readFileSync('.env.local','utf8');const anon=env.match(/^VITE_SUPABASE_ANON_KEY=["']?([^\s"']+)/m)[1];
const browser=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}});
const {data,error}=await browser.auth.signInWithPassword({email:account.email,password:account.password});if(error)throw error;
account.session=data.session;fs.writeFileSync(file,JSON.stringify(account),{mode:0o600});
const ensure=await browser.rpc('talki_jornada_ensure');if(ensure.error)throw ensure.error;
const manager=await browser.rpc('talki_jornada_manager');if(manager.error||manager.data!==false)throw new Error('Unexpected privilege');
const denied=await browser.rpc('talki_jornada_admin',{p_entity:'area',p_data:{nome:'Must not be created'}});if(!denied.error)throw new Error('Manager authorization failed');
console.log('Synthetic account login, module enrollment and manager denial passed.');

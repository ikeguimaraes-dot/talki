import fs from 'node:fs';
import {createClient} from '@supabase/supabase-js';
const key=fs.readFileSync(0,'utf8').trim();
const path='.migration-local/browser-account.json';
const account=JSON.parse(fs.readFileSync(path));
if(account.id!=='a38cfdd2-3832-406b-9439-6658c145aae8'||account.email!==`talki-migration-test-${account.id}@example.com`)throw new Error('Unexpected account; refusing cleanup');
const db=createClient('https://iqgrvptrtphvbmvrqntm.supabase.co',key,{auth:{persistSession:false,autoRefreshToken:false}});
const {data:identity,error:identityError}=await db.auth.admin.getUserById(account.id);
if(identityError||identity.user.email!==account.email)throw new Error('Synthetic account identity does not match');
const signout=await db.auth.admin.signOut(account.session.access_token,'global');if(signout.error&&signout.error.name!=='AuthSessionMissingError')throw signout.error;
for(const table of ['talki_registros','talki_pontuacao_diaria','talki_colaboradores']){
 const {error}=await db.from(table).delete().eq('user_id',account.id);if(error)throw error;
}
const profile=await db.from('profiles').delete().eq('id',account.id).eq('email',account.email);if(profile.error)throw profile.error;
const {error}=await db.auth.admin.deleteUser(account.id);if(error)throw error;
fs.unlinkSync(path);
console.log('Only the synthetic account and its test records were removed; its sessions were revoked.');

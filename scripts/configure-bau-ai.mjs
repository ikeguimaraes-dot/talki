// Provisions only server-side secrets. No secret values are printed or passed as CLI arguments.
import {readFileSync,appendFileSync} from 'node:fs';
import {parseEnv} from 'node:util';
import {spawnSync} from 'node:child_process';
import {randomBytes} from 'node:crypto';
const env=parseEnv(readFileSync('.env.local','utf8'));
if(!env.OPENAI_API_KEY)throw new Error('OPENAI_API_KEY ausente.');
const result=spawnSync('supabase',['projects','api-keys','--project-ref','iqgrvptrtphvbmvrqntm','--output','json'],{encoding:'utf8'});
if(result.status!==0)throw new Error('Falha ao obter credencial de servidor Supabase.');
const service=JSON.parse(result.stdout).find(k=>k.name==='service_role')?.api_key;
if(!service)throw new Error('Credencial de servidor não encontrada.');
const cron=env.CRON_SECRET||randomBytes(32).toString('hex');
if(!env.CRON_SECRET)appendFileSync('.env.local',`\nCRON_SECRET=${cron}\n`);
for(const [name,value] of Object.entries({OPENAI_API_KEY:env.OPENAI_API_KEY,SUPABASE_SERVICE_ROLE_KEY:service,CRON_SECRET:cron})){
 const r=spawnSync('vercel',['env','add',name,'production','--sensitive','--force','--yes'],{input:value,encoding:'utf8'});
 if(r.status!==0)throw new Error(`Falha ao configurar ${name}; valores omitidos.`);
 console.log(`${name}: configurada no servidor.`);
}

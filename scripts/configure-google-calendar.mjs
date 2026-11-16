// Reads local credentials and sends them through stdin; never logs secret values.
import { appendFileSync, readFileSync } from 'node:fs';
import { parseEnv } from 'node:util';
import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
const env=parseEnv(readFileSync('.env.local','utf8'));
for(const name of ['GOOGLE_CLIENT_ID','GOOGLE_CLIENT_SECRET'])if(!env[name])throw new Error(`${name} ausente em .env.local. Consulte docs/google-calendar.md.`);
if(!env.GOOGLE_CALENDAR_ENCRYPTION_KEY){env.GOOGLE_CALENDAR_ENCRYPTION_KEY=randomBytes(32).toString('hex');appendFileSync('.env.local',`\nGOOGLE_CALENDAR_ENCRYPTION_KEY=${env.GOOGLE_CALENDAR_ENCRYPTION_KEY}\n`);}
if(!/^[a-f0-9]{64}$/i.test(env.GOOGLE_CALENDAR_ENCRYPTION_KEY))throw new Error('A chave de criptografia deve ter 64 caracteres hexadecimais.');
for(const name of ['GOOGLE_CLIENT_ID','GOOGLE_CLIENT_SECRET','GOOGLE_CALENDAR_ENCRYPTION_KEY']){
 const result=spawnSync('npx',['--yes','vercel@62.1.0','env','add',name,'production','--sensitive','--force','--yes'],{input:`${env[name]}\n`,encoding:'utf8'});
 if(result.status!==0)throw new Error(`Não foi possível configurar ${name}. Valores omitidos.`);
 console.log(`${name}: configurada no servidor.`);
}
console.log('Publique uma nova versão para carregar as credenciais.');

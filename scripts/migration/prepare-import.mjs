import fs from 'node:fs';
import crypto from 'node:crypto';
const source=JSON.parse(fs.readFileSync('.migration-local/pareto-scoped-export.json'));
const identities=JSON.parse(fs.readFileSync('.migration-local/identity-map.json'));
const mapped=new Map(identities.map(e=>{if(!e.approved||e.target_candidates.length!==1)throw new Error('Unapproved identity');return [e.source_profile_id,e.target_candidates[0]];}));
const owner=mapped.get(source.profiles.find(p=>p.role==='admin').id);
const value=v=>v==null?'null':typeof v==='number'||typeof v==='boolean'?String(v):"'"+String(v).replaceAll("'","''")+"'";
const statements=['begin;','set local lock_timeout=\'5s\';'];
function insert(table,rows,key='id',entity=table){
 for(const row of rows){
  const cols=Object.keys(row);const id=row[key];
  statements.push(`insert into public.${table}(${cols.join(',')}) values(${cols.map(k=>value(row[k])).join(',')}) on conflict do nothing;`);
  // Exact comparison makes replays safe: conflicting or modified records abort the transaction.
  statements.push(`do $$begin if not exists(select 1 from public.${table} where ${cols.map(k=>`${k} is not distinct from ${value(row[k])}`).join(' and ')}) then raise exception 'Import mismatch: ${table} ${id}'; end if; end$$;`);
  statements.push(`insert into talki_private.migration_map(source_project,entity,source_id,target_id) values('afxsrcezmetipzgosdvb',${value(entity)},${value(id)},${value(id)}) on conflict do nothing;`);
 }
}
insert('talki_areas',source.areas,'id','area');
insert('talki_categorias_atividade',source.categorias,'id','categoria');
for(const p of source.profiles){
 const id=mapped.get(p.id);if(!id)throw new Error('Missing identity');
 statements.push(`insert into public.profiles(id,nome,email,cargo) values(${value(id)},${value([p.nome,p.sobrenome].filter(Boolean).join(' '))},${value(p.email)},${value(p.cargo)}) on conflict(id) do nothing;`);
 statements.push(`insert into talki_private.migration_map(source_project,entity,source_id,target_id) values('afxsrcezmetipzgosdvb','identity',${value(p.id)},${value(id)}) on conflict do nothing;`);
}
insert('talki_colaboradores',source.profiles.map(p=>({user_id:mapped.get(p.id),sobrenome:p.sobrenome,data_nascimento:p.data_nascimento,descricao_cargo:p.descricao_cargo,area_id:p.area_id,horas_dia_contratadas:p.horas_dia_contratadas,ativo:p.ativo,papel:p.role==='admin'?'gestor':'participante',moedas:p.moedas,created_at:p.created_at})),'user_id','colaborador');
insert('plans',source.projetos.map(p=>({id:p.id,nome:p.nome,descricao:p.descricao,criado_em:p.created_at,criado_por:owner})),'id','projeto');
insert('talki_plan_settings',source.projetos.map(p=>({plan_id:p.id,area_id:p.area_id,ativo:p.ativo})),'plan_id','project_settings');
for(const project of source.projetos){
 for(const id of mapped.values())statements.push(`insert into public.plan_members(plan_id,user_id) values(${value(project.id)},${value(id)}) on conflict do nothing;`);
 statements.push(`insert into public.buckets(plan_id,nome,ordem) select ${value(project.id)},'A fazer',0 where not exists(select 1 from public.buckets where plan_id=${value(project.id)});`);
}
insert('talki_registros',source.registros.map(r=>{const {projeto_id,...rest}=r;return {...rest,user_id:mapped.get(r.user_id),plan_id:projeto_id,task_id:null,projeto_nome:source.projetos.find(p=>p.id===projeto_id)?.nome??null,tarefa_titulo:null};}),'id','registro');
insert('talki_pontuacao_diaria',source.pontuacao.map(p=>({...p,user_id:mapped.get(p.user_id),regra:'pareto-v1'})),'id','pontuacao');
statements.push('commit;');
fs.writeFileSync('.migration-local/import.sql',statements.join('\n')+'\n',{mode:0o600});
const manifest={captured_at:source.captured_at,sha256:crypto.createHash('sha256').update(JSON.stringify(source)).digest('hex'),counts:Object.fromEntries(Object.entries(source).filter(([,v])=>Array.isArray(v)).map(([k,v])=>[k,v.length])),closed_seconds:source.registros.reduce((s,r)=>s+(r.fim?(Date.parse(r.fim)-Date.parse(r.inicio))/1000:0),0)};
fs.writeFileSync('.migration-local/import-manifest.json',JSON.stringify(manifest,null,2),{mode:0o600});
console.log(JSON.stringify(manifest));

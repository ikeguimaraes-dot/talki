import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/supabase';
import type { CatalogRow, Execution, DeliveryEvent } from './entregas';
// Reuse the signed-in Talki session. Every read and RPC is authorized by existing Maestri RLS.
const db:SupabaseClient=supabase;
async function rows<T>(table:string,approved=false):Promise<T[]> {
 const result:T[]=[];
 for(let offset=0;;offset+=500){
  let query=db.from(table).select('*').order('id').range(offset,offset+499);
  if(approved)query=query.like('id','m10-%');
  const {data,error}=await query;if(error)throw new Error(error.message);
  result.push(...data as T[]);if(data.length<500)return result;
 }
}
export async function loadDeliveries(){
 const [catalog,executions]=await Promise.all([rows<CatalogRow>('maestri_catalogo',true),rows<Execution>('maestri_entregas_execucao')]);
 return {catalog,executions:executions.sort((a,b)=>a.vence_em.localeCompare(b.vence_em))};
}
export async function deliveryHistory(id:string):Promise<DeliveryEvent[]>{
 const {data,error}=await db.from('maestri_entregas_eventos').select('id,entrega_id,acao,texto,criado_em').eq('entrega_id',id).order('criado_em',{ascending:false}).limit(100);
 if(error)throw new Error(error.message);return data??[];
}
export async function saveChecklist(e:Execution,checked:string[]){
 const {error}=await db.rpc('maestri_salvar_checklist',{p_id:e.id,p_checked:checked,p_versao:e.versao});if(error)throw new Error(error.message);
}
export async function moveDelivery(e:Execution,action:'enviar'|'aceitar'|'devolver',text:string){
 const {error}=await db.rpc('maestri_movimentar_entrega',{p_id:e.id,p_acao:action,p_texto:text,p_versao:e.versao});if(error)throw new Error(error.message);
}

// Read only the current user's assigned occurrences; RLS remains authoritative.
export async function loadMyDeliveries(userId:string):Promise<Execution[]> {
 const result:Execution[]=[];
 for(let offset=0;;offset+=500){
  const {data,error}=await db.from('maestri_entregas_execucao').select('*').eq('responsavel',userId).in('status',['pendente','devolvida','enviada']).order('vence_em').order('id').range(offset,offset+499);
  if(error)throw new Error(error.message);
  result.push(...data as Execution[]);if(data.length<500)return result;
 }
}

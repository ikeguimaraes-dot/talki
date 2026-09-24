import type {SupabaseClient} from '@supabase/supabase-js';
import {supabase} from '@/supabase';
export const bauDb:SupabaseClient=supabase;
export interface BauEntry {id:string;owner_id:string;titulo:string;data_reuniao:string;participantes:string;notas:string;transcricao:string;plan_id:string|null;agenda_event_id:string|null;compartilhar_projeto:boolean;created_at:string;updated_at:string}
export interface BauSummary extends Pick<BauEntry,'id'|'owner_id'|'titulo'|'data_reuniao'|'participantes'|'plan_id'|'compartilhar_projeto'|'created_at'> {audios:number;transcricoes:number}
export interface BauFile {id:string;entry_id:string;owner_id:string;nome:string;tipo:'audio'|'transcricao';mime:string;tamanho:number;path:string;pronto:boolean;texto:string;created_at:string}
export interface BauOptions {projects:{id:string;nome:string}[];people:{id:string;nome:string|null}[];events:{id:string;titulo:string;inicio:string;plan_id:string|null}[]}
export async function loadBauOptions():Promise<BauOptions>{
 async function rows(table:string,select:string,order:string){const result:unknown[]=[];for(let offset=0;;offset+=500){const {data,error}=await bauDb.from(table).select(select).order(order).range(offset,offset+499);if(error)throw error;result.push(...data);if(data.length<500)return result;}}
 const [projects,people,events]=await Promise.all([rows('plans','id,nome','nome'),rows('profiles','id,nome','id'),rows('talki_agenda_events','id,titulo,inicio,plan_id','inicio')]);
 return {projects,people,events} as BauOptions;
}
export function errorMessage(error:unknown,fallback='Não foi possível concluir. Tente novamente.') {return error&&typeof error==='object'&&'message' in error?String(error.message):fallback;}

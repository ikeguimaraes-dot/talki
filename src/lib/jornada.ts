import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/supabase';

// The shared project has hundreds of unrelated tables; keep this module's types scoped.
export const jornadaDb: SupabaseClient = supabase;
export interface Area { id: string; nome: string; ativo: boolean }
export interface Categoria { id: string; nome: string; cor: string }
export interface Colaborador {
 user_id: string; sobrenome: string | null; data_nascimento: string | null; descricao_cargo: string | null;
 area_id: string | null; horas_dia_contratadas: number; ativo: boolean; papel: 'gestor' | 'participante'; moedas: number;
}
export interface Pessoa { id: string; nome: string | null; email: string | null; cargo: string | null }
export interface Projeto { id: string; nome: string; criado_por: string }
export interface PlanSettings { plan_id: string; area_id: string | null; ativo: boolean }
export interface Registro {
 id: string; user_id: string; categoria_id: string; area_id: string | null; plan_id: string | null; task_id: string | null;
 projeto_nome: string | null; tarefa_titulo: string | null; descricao: string; participantes: string | null;
 inicio: string; fim: string | null; entrega_concluida: boolean | null; created_at: string; updated_at: string;
}
export interface Pontuacao { id: string; user_id: string; data: string; percentual: number; bateu_meta: boolean; moedas_delta: number; regra: string }
export interface JornadaData { areas: Area[]; categorias: Categoria[]; colaboradores: Colaborador[]; pessoas: Pessoa[]; projetos: Projeto[]; settings: PlanSettings[]; gestor: boolean }
export async function readRows<T>(table: string, options: { since?: string; until?: string; order?: string; user?: string } = {}): Promise<T[]> {
 const rows: T[] = [];
 for (let offset = 0; ; offset += 500) {
  let query = jornadaDb.from(table).select('*').order(options.order ?? 'id').range(offset, offset + 499);
  if (options.since) query = query.gte('inicio', options.since);
  if (options.until) query = query.lt('inicio', options.until);
  if (options.user) query = query.eq('user_id', options.user);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  rows.push(...(data as T[]));
  if (data.length < 500) return rows;
 }
}
export async function rpc<T = void>(name: string, args: Record<string, unknown> = {}): Promise<T> {
 const { data, error } = await jornadaDb.rpc(name, args);
 if (error) throw new Error(error.message);
 window.dispatchEvent(new Event('talki:jornada-change'));
 return data as T;
}
export async function loadJornada(): Promise<JornadaData> {
 await rpc('talki_jornada_ensure');
 const [areas,categorias,colaboradores,pessoas,projetos,settings,manager] = await Promise.all([
  readRows<Area>('talki_areas'),readRows<Categoria>('talki_categorias_atividade'),
  readRows<Colaborador>('talki_colaboradores',{order:'user_id'}),readRows<Pessoa>('profiles'),readRows<Projeto>('plans'),readRows<PlanSettings>('talki_plan_settings',{order:'plan_id'}),
  jornadaDb.rpc('talki_jornada_manager'),
 ]);
 if (manager.error) throw new Error(manager.error.message);
 return { areas,categorias,colaboradores,pessoas,projetos,settings,gestor:manager.data === true };
}
export function downloadCSV(name: string, rows: Record<string, string | number | null>[]) {
 if (!rows.length) return;
 const escape = (value: unknown) => {
  let text=String(value ?? '');
  if (/^[=+\-@\t\r]/.test(text)) text="'"+text;
  return '"'+text.replaceAll('"','""')+'"';
 };
 const keys=Object.keys(rows[0]);
 const csv=[keys.map(escape).join(';'),...rows.map(r=>keys.map(k=>escape(r[k])).join(';'))].join('\r\n');
 const url=URL.createObjectURL(new Blob(['\uFEFF'+csv],{type:'text/csv;charset=utf-8'}));
 const a=document.createElement('a');a.href=url;a.download=`talki_${name}.csv`;a.click();URL.revokeObjectURL(url);
}

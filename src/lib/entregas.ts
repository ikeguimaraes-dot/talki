export interface DeliveryTemplate {
 id: string; title: string; area: string; areaId: string; frequency: string; cadence: string;
 owner: string; validator: string; checklist: string[]; doneWhen: string; evidence: string; deadline: string;
}
export interface CatalogRow { group_id: string; id: string; documento: DeliveryTemplate }
export interface Execution {
 id: string; titulo: string; contexto: string; criterios: string; responsavel: string; gestor: string;
 responsavel_nome: string; gestor_nome: string; vence_em: string; status: string; versao: number;
 checklist: string[]; checklist_respostas: string[]; evidencia: string | null; motivo: string | null;
}
export interface DeliveryEvent { id: number; entrega_id: string; acao: string; texto: string | null; criado_em: string }
export const frequencyLabels: Record<string,string> = {diaria:'Diárias',semanal:'Semanais',quinzenal:'Quinzenais',mensal:'Mensais',trimestral:'Trimestrais',semestral:'Semestrais',anual:'Anuais',ocorrencia:'Por ocorrência'};
export const stateLabels: Record<string,string> = {pendente:'Pendente',devolvida:'Devolvida',enviada:'Aguardando validação',concluida:'Concluída',cancelada:'Cancelada'};
export const maestriUrl = 'https://kph-os.vercel.app/inteligencia/entregas/acompanhamento';
const normalize=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR');
export function filterCatalog(rows:CatalogRow[],area:string,frequency:string,query:string) {
 return rows.filter(({documento:d})=>(!area||d.areaId===area)&&(!frequency||d.frequency===frequency)&&normalize([d.title,d.area,...d.checklist].join(' ')).includes(normalize(query)));
}
export function canSend(e:Execution,userId:string){return e.responsavel===userId&&['pendente','devolvida'].includes(e.status);}
export function canReview(e:Execution,userId:string){return e.gestor===userId&&e.status==='enviada';}
export function checklistComplete(e:Execution){return e.checklist.every(s=>e.checklist_respostas.includes(s));}
export function filterExecutions(rows:Execution[],userId:string,scope:string,status:string,query:string) {
 return rows.filter(e=>(scope==='gestor'?e.gestor===userId:scope==='grupo'?true:e.responsavel===userId)&&(status==='todas'||(status==='abertas'?!['concluida','cancelada'].includes(e.status):e.status===status))&&normalize(`${e.titulo} ${e.contexto} ${e.responsavel_nome}`).includes(normalize(query)));
}
export function formatDeliveryDate(value:string){return new Date(value).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo',dateStyle:'short',timeStyle:'short'});}

export function desktopDeliveryQueue(rows:Execution[], userId:string, now:Date, all:boolean){
 const today=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'});
 return rows.filter(e=>e.responsavel===userId&&['pendente','devolvida','enviada'].includes(e.status)&&(all||today.format(new Date(e.vence_em))<=today.format(now)))
  .sort((a,b)=>Number(a.status==='enviada')-Number(b.status==='enviada')||new Date(a.vence_em).getTime()-new Date(b.vence_em).getTime()||a.id.localeCompare(b.id));
}

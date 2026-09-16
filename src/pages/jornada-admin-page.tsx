import { useState,type FormEvent } from 'react';
import { useLocation,Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Plus,Pencil } from 'lucide-react';
import { usePageHeader } from '@/hooks/use-page-header';
import { useJornada } from '@/hooks/use-jornada';
import { rpc,jornadaDb } from '@/lib/jornada';
import { Field,Panel,JornadaNav,fieldClass } from '@/components/jornada/common';
import { Button } from '@/components/ui/button';
import { Dialog,DialogContent,DialogHeader,DialogTitle } from '@/components/ui/dialog';
export function JornadaAdminPage() {
 const section=useLocation().pathname.split('/').at(-1)??'pessoas';const title={pessoas:'Pessoas',areas:'Áreas',categorias:'Categorias',projetos:'Projetos'}[section]??'Pessoas';
 usePageHeader({title});const {data,error,reload}=useJornada();
 const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[createAccount,setCreateAccount]=useState(false),[form,setForm]=useState<Record<string,string>>({});
 if(error)return <Panel>{error}</Panel>;if(!data)return <p>Carregando cadastros…</p>;if(!data.gestor)return <Panel>Esta área é restrita à gestão da Jornada.</Panel>;
 function edit(values:Record<string,string>={},account=false) {setForm({nome:'',cor:'#6366F1',ativo:'true',papel:'participante',horas_dia_contratadas:'8',area_id:'',...values});setCreateAccount(account);setOpen(true);}
 async function save(e:FormEvent) {e.preventDefault();setBusy(true);try{
 if(createAccount){const {error,data:result}=await jornadaDb.functions.invoke('talki-manage-user',{body:{action:'create',nome:form.nome,email:form.email,senha:form.senha,area_id:form.area_id||null,horas_dia_contratadas:Number(form.horas_dia_contratadas),papel:form.papel}});if(error)throw error;if(result?.error)throw new Error(result.error);}
 else await rpc('talki_jornada_admin',{p_entity:{pessoas:'pessoa',areas:'area',categorias:'categoria',projetos:'projeto'}[section],p_data:{...form,horas_dia_contratadas:Number(form.horas_dia_contratadas),ativo:form.ativo==='true'}});
 setOpen(false);await reload();toast.success(createAccount?'Conta preparada. A pessoa deve confirmar o e-mail ao entrar.':'Cadastro salvo.');
 }catch(e){toast.error(e instanceof Error?e.message:'Não foi possível salvar');}finally{setBusy(false);}}
 const rows=section==='areas'?data.areas.map(a=>({id:a.id,nome:a.nome,detail:a.ativo?'Ativa':'Desativada',values:{id:a.id,nome:a.nome,ativo:String(a.ativo)}})):
 section==='categorias'?data.categorias.map(c=>({id:c.id,nome:c.nome,detail:c.cor,values:{id:c.id,nome:c.nome,cor:c.cor}})):
 section==='projetos'?data.projetos.map(p=>{const s=data.settings.find(s=>s.plan_id===p.id);return {id:p.id,nome:p.nome,detail:s?.ativo===false?'Arquivado':'Ativo',values:{id:p.id,area_id:s?.area_id??'',ativo:String(s?.ativo??true)}};}):
 data.colaboradores.map(c=>({id:c.user_id,nome:data.pessoas.find(p=>p.id===c.user_id)?.nome??'Pessoa',detail:`${c.papel} · ${c.horas_dia_contratadas} h/dia · ${c.ativo?'Ativo':'Desativado'}`,values:{id:c.user_id,area_id:c.area_id??'',horas_dia_contratadas:String(c.horas_dia_contratadas),papel:c.papel,ativo:String(c.ativo)}}));
 return <><JornadaNav gestor/><Panel><div className="mb-5 flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">{title}</h2><p className="mt-1 text-sm text-muted-foreground">{section==='pessoas'?'Acesso e capacidade da Jornada. Papéis globais do Talki permanecem separados.':section==='projetos'?'Os mesmos projetos do planner, com área e estado para apontamento.':'Cadastros compartilhados da Jornada.'}</p></div><div className="flex gap-2">{section==='projetos'?<Button asChild><Link to="/tarefas">Abrir projetos</Link></Button>:<Button onClick={()=>edit()}><Plus/>{section==='pessoas'?'Habilitar pessoa existente':'Adicionar'}</Button>}{section==='pessoas'&&<Button variant="outline" onClick={()=>edit({},true)}>Criar conta</Button>}</div></div><div className="divide-y divide-border">{rows.length===0?<p className="py-8 text-muted-foreground">Nenhum cadastro.</p>:rows.map(r=><div key={r.id} className="flex items-center justify-between gap-4 py-4"><div><p className="font-medium">{r.nome}</p><p className="text-sm text-muted-foreground">{r.detail}</p></div><Button variant="ghost" onClick={()=>edit(r.values)}><Pencil/>Editar</Button></div>)}</div></Panel>
 <Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle>{createAccount?'Criar conta':form.id?'Editar cadastro':'Adicionar cadastro'}</DialogTitle></DialogHeader><form onSubmit={save} className="grid gap-4">
 {(section==='areas'||section==='categorias'||createAccount)&&<Field label="Nome"><input required className={fieldClass} value={form.nome??''} onChange={e=>setForm({...form,nome:e.target.value})}/></Field>}
 {createAccount&&<><Field label="E-mail"><input required type="email" className={fieldClass} value={form.email??''} onChange={e=>setForm({...form,email:e.target.value})}/></Field><Field label="Senha inicial"><input required type="password" minLength={8} className={fieldClass} value={form.senha??''} onChange={e=>setForm({...form,senha:e.target.value})}/></Field></>}
 {section==='pessoas'&&!form.id&&!createAccount&&<Field label="Pessoa"><select required className={fieldClass} value={form.id??''} onChange={e=>setForm({...form,id:e.target.value})}><option value="">Selecione</option>{data.pessoas.filter(p=>!data.colaboradores.some(c=>c.user_id===p.id)).map(p=><option key={p.id} value={p.id}>{p.nome} · {p.email}</option>)}</select></Field>}
 {section==='categorias'&&<Field label="Cor"><input required type="color" className={fieldClass} value={form.cor??'#6366F1'} onChange={e=>setForm({...form,cor:e.target.value})}/></Field>}
 {(section==='pessoas'||section==='projetos')&&<Field label="Área"><select className={fieldClass} value={form.area_id??''} onChange={e=>setForm({...form,area_id:e.target.value})}><option value="">Sem área</option>{data.areas.map(a=><option key={a.id} value={a.id}>{a.nome}</option>)}</select></Field>}
 {section==='pessoas'&&<><Field label="Horas contratadas por dia"><input type="number" min="0.25" max="24" step="0.25" required className={fieldClass} value={form.horas_dia_contratadas??'8'} onChange={e=>setForm({...form,horas_dia_contratadas:e.target.value})}/></Field><Field label="Papel na Jornada"><select className={fieldClass} value={form.papel??'participante'} onChange={e=>setForm({...form,papel:e.target.value})}><option value="participante">Participante</option><option value="gestor">Gestor</option></select></Field></>}
 {section!=='categorias'&&<Field label="Estado"><select className={fieldClass} value={form.ativo??'true'} onChange={e=>setForm({...form,ativo:e.target.value})}><option value="true">Ativo</option><option value="false">Desativado / arquivado</option></select></Field>}
 <Button disabled={busy} type="submit">{busy?'Salvando…':'Salvar'}</Button></form></DialogContent></Dialog></>;
}

import {useEffect,useState} from 'react';
import {toast} from 'sonner';
import {Dialog,DialogContent,DialogDescription,DialogHeader,DialogTitle} from '@/components/ui/dialog';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {bauDb,errorMessage,type BauEntry,type BauOptions} from '@/lib/bau';
export function SharingDialog({entry,options,onClose,onSaved}:{entry:BauEntry;options:BauOptions;onClose:()=>void;onSaved:()=>void}){
 const [people,setPeople]=useState<string[]>([]),[project,setProject]=useState(entry.compartilhar_projeto),[search,setSearch]=useState(''),[loading,setLoading]=useState(true),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{let active=true;bauDb.from('talki_bau_shares').select('user_id').eq('entry_id',entry.id).then(({data,error})=>{if(active){if(error)setError('Não foi possível carregar o compartilhamento.');else setPeople(data.map(s=>s.user_id));setLoading(false);}});return()=>{active=false;};},[entry.id]);
 async function save(){setBusy(true);try{const {error}=await bauDb.rpc('talki_bau_set_sharing',{target:entry.id,project_shared:project,people});if(error)throw error;toast.success('Compartilhamento atualizado.');onSaved();onClose();}catch(e){toast.error(errorMessage(e));}finally{setBusy(false);}}
 return <Dialog open onOpenChange={open=>{if(!open&&!busy)onClose();}}><DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>Compartilhar reunião</DialogTitle><DialogDescription>As pessoas escolhidas poderão ler as transcrições, ouvir e baixar os arquivos. Apenas você poderá editar.</DialogDescription></DialogHeader>
  {error?<p role="alert" className="text-sm text-destructive">{error}</p>:loading?<p className="text-sm text-muted-foreground">Carregando…</p>:<div className="space-y-4">
   {entry.plan_id&&<label className="flex items-center gap-3 rounded-xl border border-border p-3 text-sm"><input type="checkbox" checked={project} onChange={e=>setProject(e.target.checked)}/>Compartilhar com o projeto {options.projects.find(p=>p.id===entry.plan_id)?.nome??'vinculado'}</label>}
   <Input aria-label="Buscar pessoas para compartilhar" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Buscar pessoa pelo nome"/>
   <div className="max-h-56 space-y-1 overflow-y-auto">{options.people.filter(p=>p.id!==entry.owner_id&&p.nome?.toLowerCase().includes(search.toLowerCase())).map(p=><label key={p.id} className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 text-sm hover:bg-muted"><input type="checkbox" checked={people.includes(p.id)} onChange={e=>setPeople(prev=>e.target.checked?[...prev,p.id]:prev.filter(id=>id!==p.id))}/>{p.nome}</label>)}</div>
   <p className="text-xs text-muted-foreground">{people.length} pessoa(s) selecionada(s). Sem pessoas ou projeto selecionados, o registro fica privado. Links já abertos podem continuar válidos por até uma hora.</p>
   <div className="flex justify-between gap-2"><Button variant="ghost" disabled={busy} onClick={()=>{setPeople([]);setProject(false);}}>Tornar privado</Button><Button disabled={busy} onClick={()=>void save()}>{busy?'Salvando…':'Salvar compartilhamento'}</Button></div>
  </div>}
 </DialogContent></Dialog>;
}

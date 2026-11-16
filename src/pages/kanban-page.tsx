import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, Columns3, Pencil, RefreshCw, Search, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/supabase';
import { useCurrentUser } from '@/hooks/use-current-user';
import { usePageHeader } from '@/hooks/use-page-header';
import { KANBAN_COLUMNS, type KanbanStatus } from '@/lib/kanban';
import { formatDateBR, formatDateTimeBR } from '@/lib/date';
import { KanbanSelect } from '@/components/tarefas/kanban-select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface KanbanTask {
  id: string;
  titulo: string;
  plan_id: string;
  prazo: string | null;
  kanban_status: string | null;
  concluida_em: string | null;
  plans: { nome: string; cor: string } | null;
}

export function KanbanPage() {
  const user = useCurrentUser();
  usePageHeader({ title: 'Kanban' });
  const [tasks, setTasks] = useState<KanbanTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [titleDraft, setTitleDraft] = useState('');
  const savingRef = useRef(false);
  const generation = useRef(0);

  const load = useCallback(async () => {
    const current = ++generation.current;
    setLoading(true);
    setError(false);
    const rows: KanbanTask[] = [];
    try {
      // Paginate to include tasks beyond the API's default row limit.
      for (let offset = 0; ; offset += 500) {
        const { data, error } = await supabase.from('tasks')
          .select('id, titulo, plan_id, prazo, kanban_status, concluida_em, plans!tasks_project_id_fkey(nome, cor), task_assignees!task_assignees_task_id_fkey!inner(user_id)')
          .eq('task_assignees.user_id', user.id)
          .not('kanban_status', 'is', null)
          .order('criado_em', { ascending: false }).order('id')
          .range(offset, offset + 499);
        if (current !== generation.current) return;
        if (error) throw error;
        rows.push(...data);
        if (data.length < 500) break;
      }
      setTasks(rows);
    } catch {
      if (current === generation.current) setError(true);
    } finally {
      if (current === generation.current) setLoading(false);
    }
  }, [user.id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial database fetch
    void load();
    const request = generation.current;
    return () => { generation.current = request + 1; };
  }, [load]);

  async function move(task: KanbanTask, value: KanbanStatus | null) {
    if (savingRef.current || task.kanban_status === value) return;
    savingRef.current = true;
    setSaving(task.id);
    try {
      const { data, error } = await supabase.from('tasks').update({ kanban_status: value })
        .eq('id', task.id).select('id, kanban_status, concluida_em').single();
      if (error) throw error;
      setTasks(previous => previous.flatMap(item => item.id !== task.id ? [item] : data.kanban_status === null ? [] : [{ ...item, kanban_status: data.kanban_status, concluida_em: data.concluida_em }]));
      toast.success(value === null ? 'Tarefa retirada do Kanban.' : 'Coluna atualizada.');
    } catch {
      toast.error('Não foi possível mover a tarefa. Tente novamente.');
    } finally {
      savingRef.current = false;
      setSaving(null);
    }
  }

  async function rename(task: KanbanTask) {
    const titulo = titleDraft.trim();
    if (!titulo || savingRef.current) return;
    if (titulo === task.titulo) { setEditing(null); return; }
    savingRef.current = true;
    setSaving(task.id);
    try {
      const { data, error } = await supabase.from('tasks').update({ titulo }).eq('id', task.id).select('id, titulo').single();
      if (error) throw error;
      setTasks(previous => previous.map(item => item.id === task.id ? { ...item, titulo: data.titulo } : item));
      setEditing(null);
      toast.success('Nome da tarefa atualizado.');
    } catch {
      toast.error('Não foi possível renomear a tarefa.');
    } finally {
      savingRef.current = false;
      setSaving(null);
    }
  }

  const term = search.trim().toLocaleLowerCase('pt-BR');
  const filtered = tasks.filter(task => `${task.titulo} ${task.plans?.nome ?? ''}`.toLocaleLowerCase('pt-BR').includes(term));

  return <div className="space-y-6 pb-6">
    <section>
      <p className="eyebrow mb-2 flex items-center gap-2"><Columns3 className="size-3 text-primary" /> Tarefas</p>
      <h2 className="gradient-text text-[clamp(2rem,4vw,3.35rem)] font-semibold tracking-[-0.055em]">Kanban</h2>
      <p className="mt-2 text-sm text-muted-foreground">Aqui aparecem somente as tarefas em que você está marcado como responsável e que têm uma coluna definida no Kanban.</p>
    </section>
    <div className="flex flex-wrap gap-3">
      <div className="relative max-w-sm flex-1">
        <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
        <Input aria-label="Buscar tarefas ou projetos" placeholder="Buscar tarefa ou projeto..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>
      <Button variant="outline" disabled={loading || saving !== null} onClick={() => void load()}><RefreshCw className="size-4" /> Atualizar</Button>
    </div>
    {error ? <div role="alert" className="rounded-xl border p-6 text-sm">Não foi possível carregar o Kanban. <Button variant="link" onClick={() => void load()}>Tentar novamente</Button></div> :
      <div className="grid grid-cols-1 items-start gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-busy={loading}>
        {KANBAN_COLUMNS.map(column => {
          const items = filtered.filter(task => task.kanban_status === column.value);
          return <section key={column.value} aria-label={column.label} className="min-w-0 rounded-2xl border border-border/70 bg-muted/20 p-3">
            <h3 className="mb-4 flex items-center gap-2 px-1 font-semibold"><span className="size-2 rounded-full" style={{ backgroundColor: column.color }} />{column.label}<span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{loading ? '…' : items.length}</span></h3>
            <div className="space-y-3">
              {loading ? <p role="status" className="p-4 text-sm text-muted-foreground">Carregando…</p> : items.length === 0 ? <p className="rounded-xl border border-dashed p-5 text-center text-xs text-muted-foreground">{term ? 'Nenhuma tarefa encontrada.' : 'Nenhuma tarefa nesta coluna.'}</p> : items.map(task => <article key={task.id} className="glass-panel space-y-3 rounded-xl border p-3">
                {editing === task.id ? <form className="flex items-center gap-1.5" onSubmit={e => { e.preventDefault(); void rename(task); }}>
                  <Input autoFocus required maxLength={300} aria-label="Novo nome da tarefa" value={titleDraft} onChange={e => setTitleDraft(e.target.value)} className="h-9 min-w-0 text-sm" />
                  <Button type="submit" variant="ghost" size="icon-sm" disabled={!titleDraft.trim() || saving !== null} aria-label="Salvar novo nome"><Check /></Button>
                  <Button type="button" variant="ghost" size="icon-sm" disabled={saving !== null} aria-label="Cancelar edição do nome" onClick={() => setEditing(null)}><X /></Button>
                </form> : <div className="flex items-start gap-2">
                  <Link to={`/tarefas/${task.plan_id}?tarefa=${task.id}`} className="min-w-0 flex-1 break-words text-sm font-medium hover:text-primary focus-visible:underline">{task.titulo}</Link>
                  <Button variant="ghost" size="icon-sm" className="-mr-1 -mt-1 shrink-0" disabled={saving !== null} aria-label={`Renomear ${task.titulo}`} onClick={() => { setEditing(task.id); setTitleDraft(task.titulo); }}><Pencil /></Button>
                </div>}
                <p className="flex items-center gap-2 text-xs text-muted-foreground"><span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: task.plans?.cor ?? '#a78bfa' }} /><span className="truncate">{task.plans?.nome ?? 'Projeto'}</span></p>
                {task.prazo && <p className="text-xs text-muted-foreground">Prazo: {formatDateBR(task.prazo)}</p>}
                {task.concluida_em && <p className="text-xs text-muted-foreground">Concluída em {formatDateTimeBR(task.concluida_em)}</p>}
                <KanbanSelect value={task.kanban_status} disabled={saving !== null} label={`Coluna de ${task.titulo}`} onChange={value => move(task, value)} />
                {saving === task.id && <p role="status" className="text-xs text-muted-foreground">Salvando…</p>}
              </article>)}
            </div>
          </section>;
        })}
      </div>}
  </div>;
}

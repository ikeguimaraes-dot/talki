import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Tag, ArrowUpRight, Clock3, FolderKanban } from 'lucide-react';
import { supabase } from '@/supabase';
import { usePageHeader } from '@/hooks/use-page-header';
import { EmptyState } from '@/components/state/empty-state';
import { AvatarStack } from '@/components/tarefas/avatar-stack';
import { formatDateBR, isOverdue } from '@/lib/date';
import { cn } from '@/lib/utils';
import type { AssigneeProfile } from '@/lib/types';

interface LabelOption {
  id: string;
  nome: string;
  cor: string;
  planId: string;
  planNome: string;
}

interface FilteredTask {
  id: string;
  titulo: string;
  planId: string;
  planNome: string;
  prazo: string | null;
  status: string;
  labels: { id: string; nome: string; cor: string }[];
  assignees: AssigneeProfile[];
}

interface TaskRow {
  id: string;
  titulo: string;
  plan_id: string;
  prazo: string | null;
  status: string;
  plans: { nome: string } | null;
  task_label_links: { task_labels: { id: string; nome: string; cor: string } }[];
  task_assignees: { profiles: AssigneeProfile }[];
}

export function EtiquetasPage() {
  const [labels, setLabels] = useState<LabelOption[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [tasks, setTasks] = useState<FilteredTask[] | null>(null);
  const [loadingTasks, setLoadingTasks] = useState(false);

  usePageHeader({ title: 'Etiquetas' });

  useEffect(() => {
    supabase
      .from('task_labels')
      .select('id, nome, cor, plan_id, plans(nome)')
      .then(({ data }) => {
        const mapped = (data ?? []).map(row => ({
          id: row.id,
          nome: row.nome,
          cor: row.cor,
          planId: row.plan_id,
          planNome: (row.plans as unknown as { nome: string } | null)?.nome ?? 'Projeto',
        }));
        mapped.sort((a, b) => a.planNome.localeCompare(b.planNome) || a.nome.localeCompare(b.nome));
        setLabels(mapped);
      });
  }, []);

  useEffect(() => {
    if (selected.size === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reação direta a mudança de seleção, não fetch assíncrono
      setTasks(null);
      return;
    }

    let active = true;
    setLoadingTasks(true);

    (async () => {
      const { data: linkRows } = await supabase
        .from('task_label_links')
        .select('task_id')
        .in('label_id', Array.from(selected));

      const taskIds = Array.from(new Set((linkRows ?? []).map(r => r.task_id)));
      if (taskIds.length === 0) {
        if (active) { setTasks([]); setLoadingTasks(false); }
        return;
      }

      const { data } = await supabase
        .from('tasks')
        .select('id, titulo, plan_id, prazo, status, plans(nome), task_label_links(task_labels(id, nome, cor)), task_assignees(profiles!task_assignees_user_id_fkey(id, nome, email, avatar_url, cargo))')
        .in('id', taskIds)
        .order('prazo', { ascending: true, nullsFirst: false });

      if (!active) return;
      const mapped = (data as unknown as TaskRow[] ?? []).map(row => ({
        id: row.id,
        titulo: row.titulo,
        planId: row.plan_id,
        planNome: row.plans?.nome ?? 'Projeto',
        prazo: row.prazo,
        status: row.status,
        labels: row.task_label_links.map(l => l.task_labels),
        assignees: row.task_assignees.map(a => a.profiles),
      }));
      setTasks(mapped);
      setLoadingTasks(false);
    })();

    return () => { active = false; };
  }, [selected]);

  const toggleLabel = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const groupedLabels = (labels ?? []).reduce<Map<string, LabelOption[]>>((acc, label) => {
    const list = acc.get(label.planNome) ?? [];
    list.push(label);
    acc.set(label.planNome, list);
    return acc;
  }, new Map());

  return (
    <div className="space-y-7 pb-6">
      <section>
        <p className="eyebrow mb-2 flex items-center gap-2"><Tag className="size-3 text-primary" /> Perspectiva</p>
        <h2 className="gradient-text text-[clamp(2rem,4vw,3.35rem)] font-semibold leading-[1.08] tracking-[-0.055em]">Etiquetas.</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">Filtre tarefas de todos os projetos por qualquer combinação de etiquetas.</p>
      </section>

      {labels === null ? (
        <div className="h-24 animate-pulse rounded-2xl bg-muted" />
      ) : labels.length === 0 ? (
        <EmptyState
          icon={Tag}
          title="Nenhuma etiqueta ainda"
          description="Etiquetas são criadas dentro de cada projeto, na tarefa ou no board. Abra um projeto pra criar a primeira."
          action={<Link to="/tarefas" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-accent-foreground"><FolderKanban className="size-3.5" /> Ver projetos</Link>}
        />
      ) : (
        <>
          <div className="glass-panel space-y-4 rounded-[22px] p-5">
            {Array.from(groupedLabels.entries()).map(([planNome, planLabels]) => (
              <div key={planNome} className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">{planNome}</p>
                <div className="flex flex-wrap gap-2">
                  {planLabels.map(label => {
                    const isSelected = selected.has(label.id);
                    return (
                      <button
                        key={label.id}
                        type="button"
                        onClick={() => toggleLabel(label.id)}
                        className={cn(
                          'rounded-full border px-3 py-1 text-xs font-semibold transition-all',
                          isSelected ? 'text-white' : ''
                        )}
                        style={
                          isSelected
                            ? { backgroundColor: label.cor, borderColor: label.cor }
                            : { backgroundColor: `${label.cor}18`, borderColor: `${label.cor}35`, color: label.cor }
                        }
                      >
                        {label.nome}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {selected.size === 0 ? (
            <EmptyState icon={Tag} title="Selecione uma etiqueta" description="Escolha uma ou mais etiquetas acima pra ver as tarefas correspondentes." />
          ) : loadingTasks ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />)}
            </div>
          ) : !tasks || tasks.length === 0 ? (
            <EmptyState icon={Tag} title="Nenhuma tarefa com essas etiquetas" />
          ) : (
            <div className="glass-panel divide-y divide-border/70 overflow-hidden rounded-[22px] px-2 sm:px-3">
              {tasks.map(task => (
                <Link
                  key={task.id}
                  to={`/tarefas/${task.planId}?tarefa=${task.id}`}
                  className="group flex items-center gap-3 rounded-xl px-3 py-3.5 transition-all duration-300 hover:bg-muted/80"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{task.titulo}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                      <span className="truncate">{task.planNome}</span>
                      {task.labels.map(label => (
                        <span
                          key={label.id}
                          className="rounded-md border px-1.5 py-0.5 text-[9px] font-semibold"
                          style={{ backgroundColor: `${label.cor}18`, borderColor: `${label.cor}35`, color: label.cor }}
                        >
                          {label.nome}
                        </span>
                      ))}
                      {task.prazo && (
                        <span className={cn('flex items-center gap-1', isOverdue(task.prazo, task.status) && 'text-destructive')}>
                          <Clock3 className="size-3" /> {formatDateBR(task.prazo)}
                        </span>
                      )}
                    </div>
                  </div>
                  <AvatarStack profiles={task.assignees} max={3} />
                  <ArrowUpRight className="size-4 -translate-x-1 text-muted-foreground/0 transition-all group-hover:translate-x-0 group-hover:text-muted-foreground" />
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

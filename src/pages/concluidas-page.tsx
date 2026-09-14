import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { CheckCircle2, RotateCcw, Search } from 'lucide-react';
import { supabase } from '@/supabase';
import { usePageHeader } from '@/hooks/use-page-header';
import { useCurrentUser } from '@/hooks/use-current-user';
import { EmptyState } from '@/components/state/empty-state';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { formatDateBR, completionPeriodLabel } from '@/lib/date';

const BATCH_SIZE = 30;
const PERIODOS = ['Hoje', 'Esta semana', 'Este mês', 'Mais antigas'];

interface CompletedTask {
  id: string;
  titulo: string;
  planId: string;
  planNome: string;
  planCor: string;
  concluidaEm: string;
  labels: { id: string; nome: string; cor: string }[];
}

interface TaskRow {
  id: string;
  titulo: string;
  plan_id: string;
  concluida_em: string | null;
  plans: { nome: string; cor: string } | null;
  task_label_links: { task_labels: { id: string; nome: string; cor: string } }[];
}

export function ConcluidasPage() {
  const user = useCurrentUser();
  const [items, setItems] = useState<CompletedTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [search, setSearch] = useState('');
  const sentinelRef = useRef<HTMLDivElement>(null);

  usePageHeader({ title: 'Concluídas' });

  const loadBatch = useCallback(async (offset: number, term: string) => {
    let query = supabase
      .from('tasks')
      .select('id, titulo, plan_id, concluida_em, plans(nome, cor), task_label_links(task_labels(id, nome, cor)), task_assignees!inner(user_id)')
      .eq('status', 'concluida')
      .eq('task_assignees.user_id', user.id)
      .order('concluida_em', { ascending: false })
      .range(offset, offset + BATCH_SIZE - 1);

    if (term.trim()) query = query.ilike('titulo', `%${term.trim()}%`);

    const { data, error } = await query;
    if (error) {
      console.error('Erro ao carregar tarefas concluídas:', error);
      return [];
    }

    return (data as unknown as TaskRow[]).map(row => ({
      id: row.id,
      titulo: row.titulo,
      planId: row.plan_id,
      planNome: row.plans?.nome ?? 'Projeto',
      planCor: row.plans?.cor ?? '#7c6cff',
      concluidaEm: row.concluida_em ?? new Date().toISOString(),
      labels: row.task_label_links.map(l => l.task_labels),
    }));
  }, [user.id]);

  useEffect(() => {
    let active = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount/on-search-change, loadBatch manages its own loading flag
    setLoading(true);
    setHasMore(true);
    loadBatch(0, search).then(batch => {
      if (!active) return;
      setItems(batch);
      setHasMore(batch.length === BATCH_SIZE);
      setLoading(false);
    });
    return () => { active = false; };
  }, [search, loadBatch]);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore || loading) return;
    setLoadingMore(true);
    const batch = await loadBatch(items.length, search);
    setItems(prev => [...prev, ...batch]);
    setHasMore(batch.length === BATCH_SIZE);
    setLoadingMore(false);
  }, [loadBatch, items.length, search, loadingMore, hasMore, loading]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(entries => {
      if (entries[0]?.isIntersecting) loadMore();
    }, { rootMargin: '200px' });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  const handleReopen = async (task: CompletedTask) => {
    setItems(prev => prev.filter(t => t.id !== task.id));

    const { error } = await supabase
      .from('tasks')
      .update({ status: 'em_andamento', concluida_em: null })
      .eq('id', task.id);

    if (error) {
      toast.error('Não foi possível reabrir a tarefa.');
      setItems(prev => [...prev, task].sort((a, b) => b.concluidaEm.localeCompare(a.concluidaEm)));
      return;
    }

    toast.success('Tarefa reaberta.', {
      action: {
        label: 'Desfazer',
        onClick: async () => {
          const { error: undoError } = await supabase
            .from('tasks')
            .update({ status: 'concluida', concluida_em: task.concluidaEm })
            .eq('id', task.id);
          if (undoError) {
            toast.error('Não foi possível desfazer.');
            return;
          }
          setItems(prev => [...prev, task].sort((a, b) => b.concluidaEm.localeCompare(a.concluidaEm)));
        },
      },
    });
  };

  const groups = PERIODOS.map(periodo => ({
    periodo,
    tasks: items.filter(item => completionPeriodLabel(item.concluidaEm) === periodo),
  })).filter(g => g.tasks.length > 0);

  return (
    <div className="space-y-7 pb-6">
      <section>
        <p className="eyebrow mb-2 flex items-center gap-2"><CheckCircle2 className="size-3 text-primary" /> Perspectiva</p>
        <h2 className="gradient-text text-[clamp(2rem,4vw,3.35rem)] font-semibold leading-[1.08] tracking-[-0.055em]">Tarefas concluídas.</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">Tudo que você já entregou, de todos os projetos.</p>
      </section>

      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por título..." className="h-9 pl-8" />
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-muted" />)}
        </div>
      ) : items.length === 0 ? (
        <EmptyState icon={CheckCircle2} title="Nenhuma tarefa concluída ainda." />
      ) : (
        <div className="space-y-6">
          {groups.map(group => (
            <div key={group.periodo} className="space-y-2">
              <p className="eyebrow px-1">{group.periodo}</p>
              <div className="glass-panel divide-y divide-border/70 overflow-hidden rounded-[22px] px-2 sm:px-3">
                {group.tasks.map(task => (
                  <Link
                    key={task.id}
                    to={`/tarefas/${task.planId}?tarefa=${task.id}`}
                    className="group flex items-center gap-3 rounded-xl px-3 py-3.5 transition-all duration-300 hover:bg-muted/80"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground line-through decoration-muted-foreground/50">{task.titulo}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                        <span className="size-1.5 rounded-full" style={{ backgroundColor: task.planCor }} />
                        <span className="truncate">{task.planNome}</span>
                        <span>·</span>
                        <span>{formatDateBR(task.concluidaEm.slice(0, 10))}</span>
                        {task.labels.map(label => (
                          <span
                            key={label.id}
                            className="rounded-md border px-1.5 py-0.5 text-[9px] font-semibold"
                            style={{ backgroundColor: `${label.cor}18`, borderColor: `${label.cor}35`, color: label.cor }}
                          >
                            {label.nome}
                          </span>
                        ))}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="opacity-0 transition-opacity group-hover:opacity-100"
                      onClick={e => { e.preventDefault(); e.stopPropagation(); handleReopen(task); }}
                    >
                      <RotateCcw className="size-3.5" /> Reabrir
                    </Button>
                  </Link>
                ))}
              </div>
            </div>
          ))}
          <div ref={sentinelRef} />
          {loadingMore && <div className="h-10 animate-pulse rounded-xl bg-muted" />}
        </div>
      )}
    </div>
  );
}

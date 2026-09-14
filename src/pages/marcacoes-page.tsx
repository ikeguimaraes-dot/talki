import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AtSign, ArrowUpRight, Clock3 } from 'lucide-react';
import { supabase } from '@/supabase';
import { usePageHeader } from '@/hooks/use-page-header';
import { useCurrentUser } from '@/hooks/use-current-user';
import { EmptyState } from '@/components/state/empty-state';
import { formatDateBR, formatRelativeTime, isOverdue } from '@/lib/date';
import { cn } from '@/lib/utils';

interface AssignmentItem {
  taskId: string;
  planId: string;
  titulo: string;
  prazo: string | null;
  status: string;
  planNome: string;
  planCor: string;
  criadoEm: string;
  atribuidoPorNome: string | null;
  isSelfAssigned: boolean;
}

interface TaskEmbed {
  id: string;
  titulo: string;
  prazo: string | null;
  status: string;
  plan_id: string;
  plans: { nome: string; cor: string } | null;
}

interface AssignerEmbed {
  nome: string | null;
  email: string | null;
}

export function MarcacoesPage() {
  const user = useCurrentUser();
  const [items, setItems] = useState<AssignmentItem[] | null>(null);

  usePageHeader({ title: 'Marcações' });

  useEffect(() => {
    let active = true;
    const since = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

    supabase
      .from('task_assignees')
      .select('criado_em, atribuido_por, tasks!inner(id, titulo, prazo, status, plan_id, plans(nome, cor)), profiles!task_assignees_atribuido_por_fkey(nome, email)')
      .eq('user_id', user.id)
      .gte('criado_em', since)
      .order('criado_em', { ascending: false })
      .then(({ data }) => {
        if (!active) return;
        const mapped = (data ?? [])
          .map(row => {
            const task = row.tasks as unknown as TaskEmbed | null;
            if (!task) return null;
            const assigner = row.profiles as unknown as AssignerEmbed | null;
            const item: AssignmentItem = {
              taskId: task.id,
              planId: task.plan_id,
              titulo: task.titulo,
              prazo: task.prazo,
              status: task.status,
              planNome: task.plans?.nome ?? 'Projeto',
              planCor: task.plans?.cor ?? '#7c6cff',
              criadoEm: row.criado_em,
              atribuidoPorNome: assigner?.nome || assigner?.email || null,
              isSelfAssigned: row.atribuido_por === user.id,
            };
            return item;
          })
          .filter((item): item is AssignmentItem => !!item);
        setItems(mapped);
      });

    return () => { active = false; };
  }, [user.id]);

  return (
    <div className="space-y-7 pb-6">
      <section>
        <p className="eyebrow mb-2 flex items-center gap-2"><AtSign className="size-3 text-primary" /> Perspectiva</p>
        <h2 className="gradient-text text-[clamp(2rem,4vw,3.35rem)] font-semibold leading-[1.08] tracking-[-0.055em]">Marcações recentes.</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">Atribuições que chegaram pra você nas últimas 48 horas, de todos os projetos.</p>
      </section>

      <div className="glass-panel overflow-hidden rounded-[22px]">
        {items === null ? (
          <div className="p-3">
            {Array.from({ length: 3 }).map((_, i) => <div key={i} className="m-2 h-16 animate-pulse rounded-xl bg-muted" />)}
          </div>
        ) : items.length === 0 ? (
          <EmptyState icon={AtSign} title="Nenhuma marcação nas últimas 48 horas." />
        ) : (
          <div className="divide-y divide-border/70 px-2 sm:px-3">
            {items.map(item => (
              <Link
                key={`${item.taskId}-${item.criadoEm}`}
                to={`/tarefas/${item.planId}?tarefa=${item.taskId}`}
                className="group flex items-center gap-3 rounded-xl px-3 py-3.5 transition-all duration-300 hover:bg-muted/80"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {item.isSelfAssigned ? 'Você se marcou' : `${item.atribuidoPorNome ?? 'Alguém'} te marcou`} em <span className="font-semibold">{item.titulo}</span>
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                    <span className="size-1.5 rounded-full" style={{ backgroundColor: item.planCor }} />
                    <span className="truncate">{item.planNome}</span>
                    <span>·</span>
                    <span>{formatRelativeTime(item.criadoEm)}</span>
                    {item.prazo && (
                      <span className={cn('flex items-center gap-1', isOverdue(item.prazo, item.status) && 'text-destructive')}>
                        <Clock3 className="size-3" /> {formatDateBR(item.prazo)}
                      </span>
                    )}
                  </div>
                </div>
                <ArrowUpRight className="size-4 -translate-x-1 text-muted-foreground/0 transition-all group-hover:translate-x-0 group-hover:text-muted-foreground" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

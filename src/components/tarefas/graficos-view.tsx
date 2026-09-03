import { useMemo } from 'react';
import { StatTile } from '@/components/tarefas/stat-tile';
import { TasksBarChart } from '@/components/tarefas/tasks-bar-chart';
import { isOverdue } from '@/lib/date';
import { PRIORIDADE_COR, PRIORIDADE_LABEL, PRIORIDADES, type BucketWithTasks, type Prioridade } from '@/lib/types';

export function GraficosView({ buckets }: { buckets: BucketWithTasks[] }) {
  const tasks = useMemo(() => buckets.flatMap(b => b.tasks), [buckets]);

  const resumo = useMemo(() => ({
    total: tasks.length,
    naoIniciadas: tasks.filter(t => t.status === 'nao_iniciada').length,
    emAndamento: tasks.filter(t => t.status === 'em_andamento').length,
    concluidas: tasks.filter(t => t.status === 'concluida').length,
    atrasadas: tasks.filter(t => isOverdue(t.prazo, t.status)).length,
  }), [tasks]);

  const porBucket = useMemo(
    () => buckets.map(b => ({ nome: b.nome, total: b.tasks.length })),
    [buckets]
  );

  const porResponsavel = useMemo(() => {
    const counts = new Map<string, number>();
    let semResponsavel = 0;
    for (const task of tasks) {
      if (task.task_assignees.length === 0) {
        semResponsavel += 1;
        continue;
      }
      for (const a of task.task_assignees) {
        const nome = a.profiles.nome || a.profiles.email || 'Sem nome';
        counts.set(nome, (counts.get(nome) ?? 0) + 1);
      }
    }
    const rows = Array.from(counts.entries()).map(([nome, total]) => ({ nome, total }));
    if (semResponsavel > 0) rows.push({ nome: 'Sem responsável', total: semResponsavel });
    return rows;
  }, [tasks]);

  const porPrioridade = useMemo(
    () =>
      PRIORIDADES.map(p => ({
        nome: PRIORIDADE_LABEL[p],
        total: tasks.filter(t => t.prioridade === p).length,
        cor: PRIORIDADE_COR[p as Prioridade],
      })),
    [tasks]
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <StatTile label="Total" value={resumo.total} />
        <StatTile label="Não iniciadas" value={resumo.naoIniciadas} />
        <StatTile label="Em andamento" value={resumo.emAndamento} />
        <StatTile label="Concluídas" value={resumo.concluidas} />
        <StatTile label="Atrasadas" value={resumo.atrasadas} tone="destructive" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="mb-2 text-sm font-medium text-foreground">Por bucket</h3>
          <TasksBarChart data={porBucket} />
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="mb-2 text-sm font-medium text-foreground">Por responsável</h3>
          <TasksBarChart data={porResponsavel} />
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="mb-2 text-sm font-medium text-foreground">Por prioridade</h3>
          <TasksBarChart data={porPrioridade} />
        </div>
      </div>
    </div>
  );
}

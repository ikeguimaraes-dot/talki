import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, CalendarDays, CheckCircle2, Circle, Clock3, Plus, Sparkles, Target } from 'lucide-react';
import { supabase } from '@/supabase';
import { usePageHeader } from '@/hooks/use-page-header';
import { useCurrentUser } from '@/hooks/use-current-user';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatDateBR, isOverdue, isToday } from '@/lib/date';

interface DashboardTask {
  id: string;
  titulo: string;
  prazo: string | null;
  status: string;
  prioridade: string;
  plan_id: string;
  plans: { nome: string; cor: string } | null;
}

const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export function HomePage() {
  const user = useCurrentUser();
  const firstName = (user.user_metadata?.name || user.email || 'você').split(' ')[0];
  const [tasks, setTasks] = useState<DashboardTask[]>([]);
  const [loading, setLoading] = useState(true);
  const now = useMemo(() => new Date(), []);

  usePageHeader({ title: 'Hoje' });

  useEffect(() => {
    let active = true;
    supabase
      .from('task_assignees')
      .select('tasks!inner(id, titulo, prazo, status, prioridade, plan_id, plans(nome, cor))')
      .eq('user_id', user.id)
      .then(({ data }) => {
        if (!active) return;
        const rows = (data ?? [])
          .map(row => row.tasks as unknown as DashboardTask)
          .filter(task => task && task.status !== 'concluida')
          .sort((a, b) => {
            if (!a.prazo) return 1;
            if (!b.prazo) return -1;
            return a.prazo.localeCompare(b.prazo);
          });
        setTasks(rows);
        setLoading(false);
      });
    return () => { active = false; };
  }, [user.id]);

  const dueToday = tasks.filter(task => isToday(task.prazo));
  const overdue = tasks.filter(task => isOverdue(task.prazo, task.status));
  const focusTasks = [...overdue, ...dueToday.filter(task => !overdue.some(item => item.id === task.id)), ...tasks]
    .filter((task, index, all) => all.findIndex(item => item.id === task.id) === index)
    .slice(0, 6);

  const toggleDone = async (task: DashboardTask, checked: boolean) => {
    setTasks(current => current.filter(item => item.id !== task.id));
    await supabase
      .from('tasks')
      .update({ status: checked ? 'concluida' : 'nao_iniciada', concluida_em: checked ? new Date().toISOString() : null })
      .eq('id', task.id);
  };

  return (
    <div className="space-y-7 pb-6">
      <section className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow mb-2 flex items-center gap-2">
            <span className="neon-orb size-1.5 rounded-full bg-[#40daa9] text-[#40daa9]" />
            {now.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
          </p>
          <h2 className="gradient-text text-[clamp(2rem,4vw,3.5rem)] font-semibold leading-[1.06] tracking-[-0.055em]">
            Boa jornada, {firstName}.
          </h2>
          <p className="mt-3 max-w-xl text-sm leading-6 text-muted-foreground sm:text-[15px]">
            Um espaço calmo para decidir o que importa e transformar intenção em progresso.
          </p>
        </div>
        <Button asChild className="h-10 rounded-xl bg-primary px-4 shadow-[0_10px_26px_rgba(108,90,255,0.28)] hover:bg-primary/90">
          <Link to="/tarefas"><Plus className="size-4" /> Nova tarefa</Link>
        </Button>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="premium-card relative overflow-hidden rounded-2xl p-5 md:col-span-2">
          <div className="absolute -right-12 -top-20 size-48 rounded-full bg-primary/15 blur-3xl" />
          <div className="relative flex items-start justify-between gap-4">
            <div>
              <p className="eyebrow">Ritmo do dia</p>
              <p className="mt-3 text-3xl font-semibold tracking-[-0.05em]">{focusTasks.length} focos</p>
              <p className="mt-1 text-sm text-muted-foreground">{overdue.length > 0 ? `${overdue.length} pedem atenção primeiro` : 'Tudo sob controle por aqui'}</p>
            </div>
            <div className="flex size-12 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]">
              <Target className="size-5" />
            </div>
          </div>
          <div className="relative mt-7 flex gap-1.5">
            {Array.from({ length: 12 }).map((_, index) => (
              <span
                key={index}
                className={cn('h-1.5 flex-1 rounded-full', index < Math.min(focusTasks.length + 3, 12) ? 'bg-gradient-to-r from-primary to-[#4b9cff]' : 'bg-muted')}
              />
            ))}
          </div>
        </div>

        <div className="premium-card rounded-2xl p-5">
          <div className="flex items-center justify-between">
            <p className="eyebrow">Pulso</p>
            <Sparkles className="size-4 text-[#ffb45c]" />
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div>
              <p className="text-2xl font-semibold tracking-[-0.05em]">{dueToday.length}</p>
              <p className="mt-1 text-xs text-muted-foreground">para hoje</p>
            </div>
            <div>
              <p className={cn('text-2xl font-semibold tracking-[-0.05em]', overdue.length > 0 && 'text-destructive')}>{overdue.length}</p>
              <p className="mt-1 text-xs text-muted-foreground">atrasadas</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_310px]">
        <div className="glass-panel overflow-hidden rounded-[22px]">
          <div className="flex items-center justify-between border-b border-border px-5 py-4 sm:px-6">
            <div>
              <p className="text-[15px] font-semibold">Seu foco</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Menos ruído. Próxima ação clara.</p>
            </div>
            <Link to="/tarefas" className="flex items-center gap-1 text-xs font-medium text-primary transition-colors hover:text-accent-foreground">
              Ver projetos <ArrowUpRight className="size-3.5" />
            </Link>
          </div>

          <div className="divide-y divide-border/70 px-2 sm:px-3">
            {loading ? (
              Array.from({ length: 4 }).map((_, index) => <div key={index} className="m-2 h-14 animate-pulse rounded-xl bg-muted" />)
            ) : focusTasks.length === 0 ? (
              <div className="flex flex-col items-center px-6 py-16 text-center">
                <span className="mb-4 flex size-12 items-center justify-center rounded-2xl bg-[#36d39f]/10 text-[#3ddcaa]">
                  <CheckCircle2 className="size-5" />
                </span>
                <p className="font-medium">Mente leve, lista limpa.</p>
                <p className="mt-1 text-sm text-muted-foreground">Adicione sua próxima tarefa quando estiver pronto.</p>
              </div>
            ) : focusTasks.map((task, index) => (
              <Link
                key={task.id}
                to={`/tarefas/${task.plan_id}?tarefa=${task.id}`}
                className="group flex items-center gap-3 rounded-xl px-3 py-3.5 transition-all duration-300 hover:bg-muted/80"
                style={{ animationDelay: `${index * 45}ms` }}
              >
                <span onClick={event => event.preventDefault()} className="relative">
                  <Checkbox checked={false} onCheckedChange={checked => toggleDone(task, checked === true)} className="size-[18px] rounded-full border-muted-foreground/50 data-[state=checked]:border-[#3ddcaa] data-[state=checked]:bg-[#3ddcaa]" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium transition-colors group-hover:text-foreground">{task.titulo}</p>
                  <div className="mt-1.5 flex items-center gap-2 text-[11px] text-muted-foreground">
                    <span className="size-1.5 rounded-full" style={{ backgroundColor: task.plans?.cor || '#7c6cff' }} />
                    <span className="truncate">{task.plans?.nome || 'Projeto'}</span>
                    {task.prazo && <span className={cn('flex items-center gap-1', isOverdue(task.prazo, task.status) && 'text-destructive')}><Clock3 className="size-3" /> {formatDateBR(task.prazo)}</span>}
                  </div>
                </div>
                {task.prioridade === 'urgente' && <span className="rounded-md bg-destructive/10 px-2 py-1 text-[10px] font-semibold text-destructive">Urgente</span>}
                <ArrowUpRight className="size-4 -translate-x-1 text-muted-foreground/0 transition-all group-hover:translate-x-0 group-hover:text-muted-foreground" />
              </Link>
            ))}
          </div>
        </div>

        <aside className="glass-soft rounded-[22px] p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="eyebrow">Semana</p>
              <p className="mt-1 text-sm font-semibold">{now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</p>
            </div>
            <CalendarDays className="size-4 text-muted-foreground" />
          </div>
          <div className="mt-6 grid grid-cols-7 gap-1">
            {Array.from({ length: 7 }).map((_, offset) => {
              const date = new Date(now);
              date.setDate(now.getDate() - now.getDay() + offset);
              const active = date.toDateString() === now.toDateString();
              return (
                <div key={offset} className="text-center">
                  <p className="mb-2 text-[9px] font-semibold uppercase text-muted-foreground">{weekDays[offset]}</p>
                  <div className={cn('mx-auto flex size-8 items-center justify-center rounded-[10px] text-xs', active ? 'bg-primary font-semibold text-white shadow-[0_8px_20px_rgba(108,90,255,0.3)]' : 'text-muted-foreground')}>
                    {date.getDate()}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-7 rounded-2xl border border-border bg-muted/40 p-4">
            <div className="flex items-center gap-2 text-xs font-medium">
              <Circle className="size-2.5 fill-[#3ddcaa] text-[#3ddcaa]" /> Próximo bloco
            </div>
            <p className="mt-3 text-sm font-medium">Revisão semanal</p>
            <p className="mt-1 text-xs text-muted-foreground">Sexta, 16:30 · 30 min</p>
          </div>
        </aside>
      </section>
    </div>
  );
}

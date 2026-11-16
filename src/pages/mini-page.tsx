import { KanbanSelect } from '@/components/tarefas/kanban-select';
import { KANBAN_COLUMNS, type KanbanStatus } from '@/lib/kanban';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import type { User } from '@supabase/supabase-js';
import { Check, ExternalLink, Loader2, LogOut, Plus, RefreshCw, Sun, Moon, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/supabase';
import { useSession } from '@/hooks/use-session';
import { TalkiLogo } from '@/components/layout/talki-logo';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { miniToday, isMiniToday } from '@/lib/mini';
import { formatDateBR } from '@/lib/date';

interface MiniTask {
  id: string; titulo: string; plan_id: string; inicio: string | null; prazo: string | null; prazo_hora: string | null;
  kanban_status: string | null;
  plans: { nome: string; cor: string } | null;
  buckets: { nome: string } | null;
}
interface MiniPlan { id: string; nome: string; buckets: { id: string; nome: string; ordem: number }[] }
const selectClass = 'h-10 w-full rounded-xl border border-border bg-background px-3 text-sm';

function MiniLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError('');
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      setPassword('');
    } catch { setError('Não foi possível entrar. Confira e-mail, senha e conexão.'); }
    finally { setBusy(false); }
  }
  return <form onSubmit={submit} className="space-y-4 px-5 py-8">
    <h1 className="text-2xl font-semibold tracking-tight">Suas tarefas, por perto.</h1>
    <p className="text-sm text-muted-foreground">Entre com sua conta do Talki.</p>
    <label className="block space-y-1 text-xs">E-mail<Input type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} /></label>
    <label className="block space-y-1 text-xs">Senha<Input type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} /></label>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    <Button className="w-full" disabled={busy}>{busy ? 'Entrando…' : 'Entrar'}</Button>
    <a href="/recuperar-senha" target="_blank" rel="noreferrer" className="block text-center text-xs text-primary">Esqueci minha senha</a>
  </form>;
}

function MiniTasks({ user }: { user: User }) {
  const [tasks, setTasks] = useState<MiniTask[]>([]);
  const [plans, setPlans] = useState<MiniPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [scope, setScope] = useState<'today' | 'all' | 'kanban'>('today');
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [planId, setPlanId] = useState('');
  const [bucketId, setBucketId] = useState('');
  const [deadline, setDeadline] = useState(miniToday);
  const [deadlineTime, setDeadlineTime] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const operation = useRef(false);
  const requestId = useRef(crypto.randomUUID());
  const sequence = useRef(0);
  const today = miniToday();
  const buckets = [...(plans.find(plan => plan.id === planId)?.buckets ?? [])].sort((a, b) => a.ordem - b.ordem);

  const load = useCallback(async () => {
    const current = ++sequence.current;
    try {
      const collected: MiniTask[] = [];
      for (let offset = 0; ; offset += 500) {
        const { data, error } = await supabase.from('tasks')
          .select('id, titulo, plan_id, inicio, prazo, prazo_hora, kanban_status, plans!tasks_project_id_fkey(nome, cor), buckets!tasks_bucket_id_fkey(nome), task_assignees!task_assignees_task_id_fkey!inner(user_id)')
          .eq('task_assignees.user_id', user.id).neq('status', 'concluida')
          .order('prazo', { nullsFirst: false }).order('id').range(offset, offset + 499);
        if (current !== sequence.current) return;
        if (error) throw error;
        collected.push(...data);
        if (data.length < 500) break;
      }
      const allPlans: MiniPlan[] = [];
      for (let offset = 0; ; offset += 500) {
        const { data, error } = await supabase.from('plans').select('id, nome, buckets!buckets_project_id_fkey(id, nome, ordem)').order('nome').order('id').range(offset, offset + 499);
        if (current !== sequence.current) return;
        if (error) throw error;
        allPlans.push(...data);
        if (data.length < 500) break;
      }
      setTasks(collected); setPlans(allPlans); setError('');
    } catch { if (current === sequence.current) setError('Sem sincronização. Confira a conexão e tente atualizar.'); }
    finally { if (current === sequence.current) setLoading(false); }
  }, [user.id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial and background server synchronization
    void load();
    const refresh = () => { if (!document.hidden && !operation.current) void load(); };
    const timer = window.setInterval(refresh, 30_000);
    window.addEventListener('focus', refresh);
    window.addEventListener('online', refresh);
    return () => { clearInterval(timer); window.removeEventListener('focus', refresh); window.removeEventListener('online', refresh); };
  }, [load]);

  async function create(event: FormEvent) {
    event.preventDefault();
    if (operation.current || !bucketId || !title.trim()) return;
    operation.current = true; setBusy('create');
    try {
      const { error } = await supabase.rpc('talki_mini_create_task', {
        p_id: requestId.current, p_bucket_id: bucketId, p_titulo: title.trim(),
        p_inicio: miniToday(), p_prazo: deadline || null, p_prazo_hora: deadline ? deadlineTime || null : null,
      });
      if (error) throw error;
      requestId.current = crypto.randomUUID();
      setTitle(''); setCreating(false); setDeadline(miniToday()); setDeadlineTime('');
      toast.success('Tarefa criada e atribuída a você.');
      await load();
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Não foi possível criar. Seus dados continuam no formulário.'); }
    finally { operation.current = false; setBusy(null); }
  }

  async function complete(task: MiniTask) {
    if (operation.current) return;
    operation.current = true; setBusy(task.id);
    try {
      const { error } = await supabase.from('tasks').update({ status: 'concluida', kanban_status: 'finalizado' }).eq('id', task.id).select('id').single();
      if (error) throw error;
      ++sequence.current;
      setTasks(previous => previous.filter(item => item.id !== task.id));
      toast.success('Tarefa concluída. Horário registrado.');
    } catch { toast.error('Não foi possível concluir. Tente novamente.'); }
    finally { operation.current = false; setBusy(null); }
  }

  async function moveKanban(task: MiniTask, column: KanbanStatus | null) {
    if (operation.current || task.kanban_status === column) return;
    operation.current = true; setBusy(task.id);
    // Invalidate older refreshes before and after saving so they cannot restore stale cards.
    ++sequence.current;
    try {
      const { data, error } = await supabase.from('tasks').update({ kanban_status: column })
        .eq('id', task.id).select('id, kanban_status, status, concluida_em').single();
      if (error) throw error;
      ++sequence.current;
      setTasks(previous => previous.flatMap(item => item.id !== task.id ? [item] : data.status === 'concluida' ? [] : [{ ...item, kanban_status: data.kanban_status }]));
      toast.success(data.status === 'concluida' ? 'Tarefa concluída. Horário registrado.' : column === null ? 'Tarefa retirada do Kanban.' : `Movida para ${KANBAN_COLUMNS.find(item => item.value === column)?.label}.`);
    } catch { toast.error('Não foi possível mudar a coluna. Tente novamente.'); }
    finally { operation.current = false; setBusy(null); }
  }

  const visible = tasks.filter(task => scope === 'kanban' ? task.kanban_status === 'trabalhando' : scope === 'all' || isMiniToday(task, today));
  return <>
    <section className="space-y-4 px-4 pb-4 pt-5">
      <div className="flex items-center justify-between">
        <div><p className="text-xs text-muted-foreground">{new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'short', timeZone: 'America/Sao_Paulo' }).format(new Date())}</p><h1 className="mt-1 text-2xl font-semibold tracking-tight">Um passo de cada vez.</h1></div>
        <Button size="icon-sm" variant="ghost" aria-label="Atualizar tarefas" disabled={busy !== null} onClick={() => void load()}><RefreshCw className="size-4" /></Button>
      </div>
      <Button className="w-full rounded-xl" onClick={() => setCreating(previous => !previous)} disabled={busy !== null}><Plus className="size-4" /> Nova tarefa para mim</Button>
      {creating && <form onSubmit={create} className="space-y-3 rounded-2xl border border-primary/30 bg-muted/30 p-3">
        <div className="flex items-center justify-between"><h2 className="text-sm font-medium">Criar tarefa</h2><Button type="button" size="icon-sm" variant="ghost" disabled={busy !== null} aria-label="Fechar criação" onClick={() => setCreating(false)}><X className="size-4" /></Button></div>
        <fieldset disabled={busy !== null} className="space-y-3">
          <label className="block space-y-1 text-xs">O que precisa ser feito?<Input autoFocus required maxLength={300} value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex.: Revisar proposta" /></label>
          <label className="block space-y-1 text-xs">Projeto<select className={selectClass} required value={planId} onChange={e => { setPlanId(e.target.value); const options = plans.find(p => p.id === e.target.value)?.buckets ?? []; setBucketId(options.length === 1 ? options[0].id : ''); }}><option value="">Selecione o projeto</option>{plans.map(plan => <option key={plan.id} value={plan.id}>{plan.nome}</option>)}</select></label>
          <label className="block space-y-1 text-xs">Lista<select className={selectClass} required value={bucketId} onChange={e => setBucketId(e.target.value)}><option value="">Selecione a lista</option>{buckets.map(bucket => <option key={bucket.id} value={bucket.id}>{bucket.nome}</option>)}</select></label>
          {planId && buckets.length === 0 && <p className="text-xs text-muted-foreground">Crie uma lista neste projeto pelo Talki completo.</p>}
          <div className="grid grid-cols-2 gap-2"><label className="space-y-1 text-xs">Prazo<Input type="date" min={today} value={deadline} onChange={e => setDeadline(e.target.value)} /></label><label className="space-y-1 text-xs">Horário<Input type="time" disabled={!deadline} value={deadlineTime} onChange={e => setDeadlineTime(e.target.value)} /></label></div>
          <p className="text-xs text-muted-foreground">Começa hoje, atribuída a você e na Fila do Kanban.</p>
          <Button className="w-full" disabled={!bucketId || !title.trim()}>{busy === 'create' ? 'Salvando…' : 'Criar tarefa'}</Button>
        </fieldset>
      </form>}
      <div className="grid grid-cols-3 gap-1" role="group" aria-label="Filtrar tarefas">
        <Button size="sm" className="h-10 whitespace-normal px-2 text-xs" variant={scope === 'today' ? 'secondary' : 'ghost'} aria-pressed={scope === 'today'} onClick={() => setScope('today')}>Hoje e atrasadas</Button>
        <Button size="sm" className="h-10 whitespace-normal px-2 text-xs" variant={scope === 'all' ? 'secondary' : 'ghost'} aria-pressed={scope === 'all'} onClick={() => setScope('all')}>Todas abertas</Button>
        <Button size="sm" className="h-10 px-2 text-xs" variant={scope === 'kanban' ? 'secondary' : 'ghost'} aria-pressed={scope === 'kanban'} onClick={() => setScope('kanban')}>Kanban</Button>
      </div>
      {scope === 'kanban' && <h2 className="flex items-center gap-2 text-sm font-medium"><span className="size-2 rounded-full bg-violet-400" />Trabalhando <span className="text-xs text-muted-foreground">({visible.length})</span></h2>}
      {error && <p role="alert" className="rounded-xl border border-destructive/30 p-3 text-xs text-destructive">{error}</p>}
      {loading ? <p role="status" className="py-8 text-center text-sm text-muted-foreground">Carregando suas tarefas…</p> : visible.length === 0 ? <div className="rounded-2xl border border-dashed p-8 text-center"><Check className="mx-auto mb-3 size-6 text-emerald-400" /><p className="text-sm">{error ? 'Aguardando sincronização.' : 'Tudo em dia por aqui.'}</p><p className="mt-2 text-xs text-muted-foreground">{scope === 'kanban' ? 'Nenhuma tarefa sua na coluna Trabalhando.' : scope === 'today' ? 'Veja outras tarefas em Todas abertas.' : 'Tarefas atribuídas a você aparecem aqui.'}</p></div> : <div className="space-y-2">
        {visible.map(task => <article key={task.id} className="flex items-start gap-3 rounded-2xl border border-border/70 bg-card/60 p-3">
          <button className="mt-1 flex size-5 shrink-0 items-center justify-center rounded-full border border-muted-foreground/50 hover:border-primary disabled:opacity-50" disabled={busy !== null} aria-label={`Concluir ${task.titulo}`} onClick={() => void complete(task)}>{busy === task.id && <Loader2 className="size-3 animate-spin" />}</button>
          <div className="min-w-0 flex-1"><a href={`/tarefas/${task.plan_id}?tarefa=${task.id}`} target="_blank" rel="noreferrer" className="block break-words text-sm font-medium hover:text-primary">{task.titulo}</a><p className="mt-1 truncate text-xs text-muted-foreground">{task.plans?.nome ?? 'Projeto'}{task.buckets?.nome ? ` · ${task.buckets.nome}` : ''}</p>{task.prazo && <p className={`mt-2 text-xs ${task.prazo < today ? 'text-amber-500' : 'text-muted-foreground'}`}>{task.prazo < today ? 'Atrasada · ' : ''}{formatDateBR(task.prazo)}{task.prazo_hora ? ` às ${task.prazo_hora.slice(0, 5)}` : ''}</p>}<div className="mt-3"><KanbanSelect value={task.kanban_status} disabled={busy !== null} label={`Coluna de ${task.titulo}`} onChange={column => moveKanban(task, column)} /></div></div>
        </article>)}
      </div>}
    </section>
    <footer className="flex items-center justify-between border-t px-4 py-3 text-xs text-muted-foreground"><span className="max-w-[230px] truncate">{user.email}</span><Button variant="ghost" size="icon-sm" aria-label="Sair da conta" disabled={busy !== null} onClick={async () => { const { error } = await supabase.auth.signOut(); if (error) toast.error('Não foi possível sair.'); }}><LogOut className="size-3.5" /></Button></footer>
  </>;
}

export function MiniPage() {
  const { user, loading } = useSession();
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try { return localStorage.getItem('talki:mini-theme') === 'light' ? 'light' : 'dark'; }
    catch { return 'dark'; }
  });
  useEffect(() => {
    document.documentElement.classList.remove('dark', 'light');
    document.documentElement.classList.add(theme);
    document.documentElement.style.colorScheme = theme;
    try { localStorage.setItem('talki:mini-theme', theme); } catch { /* storage unavailable */ }
    return () => { document.documentElement.style.colorScheme = ''; };
  }, [theme]);
  return <main className="app-canvas min-h-screen">
    <header className="flex items-center justify-between border-b border-border/60 px-4 py-3"><div className="flex items-center gap-2"><TalkiLogo className="size-6" /><span className="font-semibold tracking-tight">talki <span className="text-xs font-normal text-muted-foreground">mini</span></span></div><div className="flex items-center gap-2"><Button variant="ghost" size="icon-sm" aria-label={theme === 'dark' ? 'Usar tema dia' : 'Usar tema noite'} title={theme === 'dark' ? 'Tema dia' : 'Tema noite'} onClick={() => setTheme(previous => previous === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}</Button><a href="/" target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary">Abrir Talki <ExternalLink className="size-3" /></a></div></header>
    {loading ? <p role="status" className="p-8 text-sm text-muted-foreground">Conectando…</p> : user ? <MiniTasks key={user.id} user={user} /> : <MiniLogin />}
  </main>;
}

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/supabase';
import type { AssigneeProfile, BucketWithTasks, ChecklistItem, PlanWithMembers, Task, TaskLabel, TaskWithRelations } from '@/lib/types';

// Espelha no client, de forma otimista, a mesma regra do trigger
// sync_task_status_from_checklist no banco: tarefa com checklist
// (>=1 item) fecha sozinha em 100% e reabre se cair abaixo disso.
// Tarefa sem checklist (total 0) nunca é afetada.
function deriveChecklistStatusPatch(checklist: ChecklistItem[], currentStatus: string): { status: string; concluida_em: string | null } | null {
  const total = checklist.length;
  if (total === 0) return null;
  const done = checklist.filter(i => i.feito).length;
  if (done === total && currentStatus !== 'concluida') {
    return { status: 'concluida', concluida_em: new Date().toISOString() };
  }
  if (done < total && currentStatus === 'concluida') {
    return { status: 'em_andamento', concluida_em: null };
  }
  return null;
}

const TASK_SELECT = `
  id, plan_id, bucket_id, titulo, descricao, prioridade, status, prazo, inicio, ordem, cor, criado_por, criado_em, concluida_em,
  task_assignees(profiles!task_assignees_user_id_fkey(id, nome, email, avatar_url, cargo)),
  task_checklist(id, task_id, texto, feito, ordem),
  task_label_links(task_labels(id, nome, cor, plan_id))
`;

type TaskFieldsPatch = Partial<
  Pick<Task, 'titulo' | 'descricao' | 'status' | 'prioridade' | 'inicio' | 'prazo' | 'concluida_em' | 'ordem' | 'cor'>
>;

export function usePlanBoard(planId: string) {
  const [plan, setPlan] = useState<PlanWithMembers | null>(null);
  const [buckets, setBuckets] = useState<BucketWithTasks[]>([]);
  const [planLabels, setPlanLabels] = useState<TaskLabel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const [planRes, bucketsRes, labelsRes] = await Promise.all([
        supabase
          .from('plans')
          .select('*, plan_members(profiles(id, nome, email, avatar_url, cargo)), tasks(id, status)')
          .eq('id', planId)
          .single(),
        supabase
          .from('buckets')
          .select(`id, plan_id, nome, ordem, tasks(${TASK_SELECT})`)
          .eq('plan_id', planId)
          .order('ordem')
          .order('ordem', { referencedTable: 'tasks' }),
        supabase.from('task_labels').select('*').eq('plan_id', planId).order('nome'),
      ]);

      if (planRes.error) throw planRes.error;
      if (bucketsRes.error) throw bucketsRes.error;
      if (labelsRes.error) throw labelsRes.error;

      setPlan(planRes.data as unknown as PlanWithMembers);
      setBuckets(bucketsRes.data as unknown as BucketWithTasks[]);
      setPlanLabels(labelsRes.data);
    } catch (err) {
      console.error('Erro ao carregar o plano:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [planId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- fetch-on-mount, load() manages its own loading flag
    load();
  }, [load]);

  const updateTaskInState = useCallback((taskId: string, patch: Partial<TaskWithRelations>) => {
    setBuckets(prev => prev.map(b => ({ ...b, tasks: b.tasks.map(t => (t.id === taskId ? { ...t, ...patch } : t)) })));
  }, []);

  const findTask = useCallback(
    (taskId: string): TaskWithRelations | undefined => buckets.flatMap(b => b.tasks).find(t => t.id === taskId),
    [buckets]
  );

  const createBucket = useCallback(async (nome: string) => {
    const ordem = buckets.length;
    const { data, error: insertError } = await supabase
      .from('buckets')
      .insert({ plan_id: planId, nome, ordem })
      .select()
      .single();

    if (insertError) {
      toast.error('Não foi possível criar o bucket.');
      return;
    }

    setBuckets(prev => [...prev, { ...data, tasks: [] }]);
  }, [planId, buckets.length]);

  const renameBucket = useCallback(async (bucketId: string, nome: string) => {
    setBuckets(prev => prev.map(b => (b.id === bucketId ? { ...b, nome } : b)));
    const { error: updateError } = await supabase.from('buckets').update({ nome }).eq('id', bucketId);
    if (updateError) toast.error('Não foi possível renomear o bucket.');
  }, []);

  const createTask = useCallback(async (bucketId: string, titulo: string, criadoPor: string) => {
    const bucket = buckets.find(b => b.id === bucketId);
    if (!bucket) return null;
    const ordem = bucket.tasks.length;

    const { data, error: insertError } = await supabase
      .from('tasks')
      .insert({ plan_id: planId, bucket_id: bucketId, titulo, criado_por: criadoPor, ordem })
      .select(TASK_SELECT)
      .single();

    if (insertError) {
      toast.error('Não foi possível criar a tarefa.');
      return null;
    }

    const task = data as unknown as TaskWithRelations;
    setBuckets(prev => prev.map(b => (b.id === bucketId ? { ...b, tasks: [...b.tasks, task] } : b)));
    return task;
  }, [planId, buckets]);

  const toggleTaskDone = useCallback(async (taskId: string, done: boolean) => {
    const status = done ? 'concluida' : 'nao_iniciada';
    const concluida_em = done ? new Date().toISOString() : null;
    updateTaskInState(taskId, { status, concluida_em });
    const { error: updateError } = await supabase.from('tasks').update({ status, concluida_em }).eq('id', taskId);
    if (updateError) toast.error('Não foi possível atualizar a tarefa.');
  }, [updateTaskInState]);

  const persistTasksOrder = useCallback(async (affectedBucketIds: string[]) => {
    const unique = Array.from(new Set(affectedBucketIds));
    await Promise.all(
      unique.flatMap(bucketId => {
        const tasks = buckets.find(b => b.id === bucketId)?.tasks ?? [];
        return tasks.map((t, idx) => supabase.from('tasks').update({ ordem: idx, bucket_id: bucketId }).eq('id', t.id));
      })
    );
  }, [buckets]);

  const updateTaskFields = useCallback(async (taskId: string, patch: TaskFieldsPatch) => {
    updateTaskInState(taskId, patch);
    const { error: updateError } = await supabase.from('tasks').update(patch).eq('id', taskId);
    if (updateError) toast.error('Não foi possível salvar a alteração.');
    return !updateError;
  }, [updateTaskInState]);

  const moveTaskToBucket = useCallback(async (taskId: string, toBucketId: string) => {
    const task = findTask(taskId);
    if (!task || task.bucket_id === toBucketId) return;
    const fromBucketId = task.bucket_id;

    setBuckets(prev => {
      const toBucket = prev.find(b => b.id === toBucketId);
      const nextOrdem = toBucket?.tasks.length ?? 0;
      return prev.map(b => {
        if (b.id === fromBucketId) return { ...b, tasks: b.tasks.filter(t => t.id !== taskId) };
        if (b.id === toBucketId) return { ...b, tasks: [...b.tasks, { ...task, bucket_id: toBucketId, ordem: nextOrdem }] };
        return b;
      });
    });

    await persistTasksOrder([fromBucketId, toBucketId]);
  }, [findTask, persistTasksOrder]);

  const setTaskAssignees = useCallback(async (taskId: string, userIds: string[], assignedBy: string) => {
    const memberProfiles = plan?.plan_members.map(m => m.profiles) ?? [];
    const resolved = userIds
      .map(id => memberProfiles.find(p => p.id === id))
      .filter((p): p is NonNullable<typeof p> => !!p);

    // Diff em vez de delete-all+insert-all: reinserir quem já era
    // responsável dispararia de novo o trigger de e-mail de atribuição
    // (AFTER INSERT), reenviando notificação pra quem não mudou.
    const currentIds = findTask(taskId)?.task_assignees.map(a => a.profiles.id) ?? [];
    const currentSet = new Set(currentIds);
    const nextSet = new Set(userIds);
    const toRemove = currentIds.filter(id => !nextSet.has(id));
    const toAdd = userIds.filter(id => !currentSet.has(id));

    updateTaskInState(taskId, { task_assignees: resolved.map(profiles => ({ profiles })) });

    if (toRemove.length > 0) {
      await supabase.from('task_assignees').delete().eq('task_id', taskId).in('user_id', toRemove);
    }
    if (toAdd.length > 0) {
      // Passa atribuido_por explicitamente em vez de confiar só no
      // default auth.uid() do banco — não vale se o insert algum dia
      // rodar por um caminho elevado (service role) sem sessão de usuário.
      const { error: insertError } = await supabase
        .from('task_assignees')
        .insert(toAdd.map(user_id => ({ task_id: taskId, user_id, atribuido_por: assignedBy })));
      if (insertError) toast.error('Não foi possível atualizar os responsáveis.');
    }
  }, [plan, findTask, updateTaskInState]);

  const addPlanMember = useCallback(async (profile: AssigneeProfile) => {
    const { error: insertError } = await supabase
      .from('plan_members')
      .insert({ plan_id: planId, user_id: profile.id });

    if (insertError) {
      toast.error('Não foi possível adicionar o membro.');
      return false;
    }

    setPlan(prev => (prev ? { ...prev, plan_members: [...prev.plan_members, { profiles: profile }] } : prev));
    return true;
  }, [planId]);

  const removePlanMember = useCallback(async (userId: string, unassignTasks: boolean) => {
    const { error: deleteError } = await supabase
      .from('plan_members')
      .delete()
      .eq('plan_id', planId)
      .eq('user_id', userId);

    if (deleteError) {
      toast.error('Não foi possível remover o membro.');
      return false;
    }

    if (unassignTasks) {
      const affectedTaskIds = buckets.flatMap(b => b.tasks).filter(t => t.task_assignees.some(a => a.profiles.id === userId)).map(t => t.id);
      if (affectedTaskIds.length > 0) {
        await supabase.from('task_assignees').delete().eq('user_id', userId).in('task_id', affectedTaskIds);
        setBuckets(prev => prev.map(b => ({
          ...b,
          tasks: b.tasks.map(t => (
            affectedTaskIds.includes(t.id)
              ? { ...t, task_assignees: t.task_assignees.filter(a => a.profiles.id !== userId) }
              : t
          )),
        })));
      }
    }

    setPlan(prev => (prev ? { ...prev, plan_members: prev.plan_members.filter(m => m.profiles.id !== userId) } : prev));
    return true;
  }, [planId, buckets]);

  const setTaskLabels = useCallback(async (taskId: string, labelIds: string[]) => {
    const resolved = labelIds
      .map(id => planLabels.find(l => l.id === id))
      .filter((l): l is TaskLabel => !!l);

    updateTaskInState(taskId, { task_label_links: resolved.map(task_labels => ({ task_labels })) });

    await supabase.from('task_label_links').delete().eq('task_id', taskId);
    if (labelIds.length > 0) {
      const { error: insertError } = await supabase
        .from('task_label_links')
        .insert(labelIds.map(label_id => ({ task_id: taskId, label_id })));
      if (insertError) toast.error('Não foi possível atualizar as labels.');
    }
  }, [planLabels, updateTaskInState]);

  const createLabel = useCallback(async (nome: string, cor: string) => {
    const { data, error: insertError } = await supabase
      .from('task_labels')
      .insert({ plan_id: planId, nome, cor })
      .select()
      .single();

    if (insertError || !data) {
      toast.error('Não foi possível criar a label.');
      return null;
    }

    setPlanLabels(prev => [...prev, data]);
    return data;
  }, [planId]);

  const addChecklistItem = useCallback(async (taskId: string, texto: string) => {
    const task = findTask(taskId);
    const ordem = task?.task_checklist.length ?? 0;

    const { data, error: insertError } = await supabase
      .from('task_checklist')
      .insert({ task_id: taskId, texto, ordem })
      .select()
      .single();

    if (insertError || !data) {
      toast.error('Não foi possível adicionar o item.');
      return;
    }

    const nextChecklist = [...(task?.task_checklist ?? []), data];
    const statusPatch = task ? deriveChecklistStatusPatch(nextChecklist, task.status) : null;
    updateTaskInState(taskId, { task_checklist: nextChecklist, ...statusPatch });
  }, [findTask, updateTaskInState]);

  const toggleChecklistItem = useCallback(async (taskId: string, itemId: string, feito: boolean) => {
    const task = findTask(taskId);
    if (!task) return;
    const nextChecklist = task.task_checklist.map(i => (i.id === itemId ? { ...i, feito } : i));
    const statusPatch = deriveChecklistStatusPatch(nextChecklist, task.status);
    updateTaskInState(taskId, { task_checklist: nextChecklist, ...statusPatch });
    const { error: updateError } = await supabase.from('task_checklist').update({ feito }).eq('id', itemId);
    if (updateError) toast.error('Não foi possível atualizar o item.');
  }, [findTask, updateTaskInState]);

  const deleteChecklistItem = useCallback(async (taskId: string, itemId: string) => {
    const task = findTask(taskId);
    if (!task) return;
    const nextChecklist = task.task_checklist.filter(i => i.id !== itemId);
    const statusPatch = deriveChecklistStatusPatch(nextChecklist, task.status);
    updateTaskInState(taskId, { task_checklist: nextChecklist, ...statusPatch });
    const { error: deleteError } = await supabase.from('task_checklist').delete().eq('id', itemId);
    if (deleteError) toast.error('Não foi possível remover o item.');
  }, [findTask, updateTaskInState]);

  const reorderChecklistItems = useCallback(async (taskId: string, orderedItems: ChecklistItem[]) => {
    updateTaskInState(taskId, { task_checklist: orderedItems });
    await Promise.all(orderedItems.map((item, idx) => supabase.from('task_checklist').update({ ordem: idx }).eq('id', item.id)));
  }, [updateTaskInState]);

  const duplicateTask = useCallback(async (taskId: string) => {
    const task = findTask(taskId);
    if (!task) return null;

    const bucket = buckets.find(b => b.id === task.bucket_id);
    const ordem = bucket?.tasks.length ?? 0;

    const { data, error: insertError } = await supabase
      .from('tasks')
      .insert({
        plan_id: task.plan_id,
        bucket_id: task.bucket_id,
        titulo: `${task.titulo} (cópia)`,
        descricao: task.descricao,
        prioridade: task.prioridade,
        inicio: task.inicio,
        prazo: task.prazo,
        criado_por: task.criado_por,
        ordem,
      })
      .select(TASK_SELECT)
      .single();

    if (insertError || !data) {
      toast.error('Não foi possível duplicar a tarefa.');
      return null;
    }

    const newTask = data as unknown as TaskWithRelations;
    setBuckets(prev => prev.map(b => (b.id === task.bucket_id ? { ...b, tasks: [...b.tasks, newTask] } : b)));
    return newTask;
  }, [findTask, buckets]);

  const moveTaskToPlan = useCallback(async (taskId: string, targetPlanId: string) => {
    const task = findTask(taskId);
    if (!task) return false;

    const { data: targetBucket, error: bucketError } = await supabase
      .from('buckets')
      .select('id')
      .eq('plan_id', targetPlanId)
      .order('ordem')
      .limit(1)
      .maybeSingle();

    if (bucketError || !targetBucket) {
      toast.error('O projeto de destino precisa ter pelo menos um bucket.');
      return false;
    }

    const { error: updateError } = await supabase
      .from('tasks')
      .update({ plan_id: targetPlanId, bucket_id: targetBucket.id })
      .eq('id', taskId);

    if (updateError) {
      toast.error('Não foi possível mover a tarefa.');
      return false;
    }

    await supabase.from('task_assignees').delete().eq('task_id', taskId);
    await supabase.from('task_label_links').delete().eq('task_id', taskId);

    setBuckets(prev => prev.map(b => (b.id === task.bucket_id ? { ...b, tasks: b.tasks.filter(t => t.id !== taskId) } : b)));
    return true;
  }, [findTask]);

  const deleteTask = useCallback(async (taskId: string) => {
    const task = findTask(taskId);
    if (!task) return;
    setBuckets(prev => prev.map(b => (b.id === task.bucket_id ? { ...b, tasks: b.tasks.filter(t => t.id !== taskId) } : b)));
    const { error: deleteError } = await supabase.from('tasks').delete().eq('id', taskId);
    if (deleteError) toast.error('Não foi possível excluir a tarefa.');
  }, [findTask]);

  const deletePlan = useCallback(async () => {
    const { error: deleteError } = await supabase.from('plans').delete().eq('id', planId);
    if (deleteError) {
      toast.error('Não foi possível excluir o projeto.');
      return false;
    }
    return true;
  }, [planId]);

  return {
    plan,
    buckets,
    setBuckets,
    planLabels,
    loading,
    error,
    reload: load,
    findTask,
    createBucket,
    renameBucket,
    createTask,
    toggleTaskDone,
    persistTasksOrder,
    updateTaskFields,
    moveTaskToBucket,
    setTaskAssignees,
    addPlanMember,
    removePlanMember,
    setTaskLabels,
    createLabel,
    addChecklistItem,
    toggleChecklistItem,
    deleteChecklistItem,
    reorderChecklistItems,
    duplicateTask,
    moveTaskToPlan,
    deleteTask,
    deletePlan,
  };
}

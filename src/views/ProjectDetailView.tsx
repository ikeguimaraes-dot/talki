import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '../supabase';
import type { Project, TaskWithAssignees, TeamMember, Bucket } from '../types';
import { TaskDetailsModal } from '../components/TaskDetailsModal';

interface ProjectDetailViewProps {
  projectId: string;
  onNavigateHome: () => void;
}

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
};

const getStatusTagStyle = (status: string) => {
  switch (status) {
    case 'Em andamento':
      return {
        backgroundColor: 'rgba(163, 133, 96, 0.15)',
        color: 'var(--accent-gold)',
        border: '1px solid rgba(163, 133, 96, 0.3)'
      };
    case 'Concluído':
      return {
        backgroundColor: 'rgba(7, 34, 26, 0.6)',
        color: '#8ce6cd',
        border: '1px solid rgba(163, 133, 96, 0.15)'
      };
    case 'Não iniciado':
    default:
      return {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        color: 'var(--text-secondary)',
        border: '1px solid rgba(255, 255, 255, 0.1)'
      };
  }
};

const LABEL_COLORS = [
  '#E53935', '#E91E63', '#9C27B0', '#1565C0', '#00838F',
  '#2E7D32', '#558B2F', '#F9A825', '#E65100', '#4E342E',
];

const getPriorityTagStyle = (priority: string) => {
  switch (priority) {
    case 'Urgente':
      return {
        backgroundColor: 'rgba(216, 59, 1, 0.1)',
        color: '#D83B01',
        border: '1px solid rgba(216, 59, 1, 0.3)'
      };
    case 'Alta':
      return {
        backgroundColor: 'rgba(230, 126, 34, 0.1)',
        color: '#E67E22',
        border: '1px solid rgba(230, 126, 34, 0.3)'
      };
    default:
      return null;
  }
};

export const ProjectDetailView: React.FC<ProjectDetailViewProps> = ({ projectId, onNavigateHome }) => {
  const [project, setProject] = useState<Project | null>(null);
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [tasks, setTasks] = useState<TaskWithAssignees[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Task modal
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // Add bucket
  const [isAddingBucket, setIsAddingBucket] = useState(false);
  const [newBucketName, setNewBucketName] = useState('');

  // Quick add task
  const [activeQuickAddBucketId, setActiveQuickAddBucketId] = useState<string | null>(null);
  const [quickTaskTitle, setQuickTaskTitle] = useState('');

  // Bucket menu (⋯ dropdown)
  const [bucketMenuOpenId, setBucketMenuOpenId] = useState<string | null>(null);

  // Rename bucket
  const [renamingBucketId, setRenamingBucketId] = useState<string | null>(null);
  const [renameBucketName, setRenameBucketName] = useState('');
  const [renameLoading, setRenameLoading] = useState(false);

  // Delete bucket
  const [deleteBucketLoadingId, setDeleteBucketLoadingId] = useState<string | null>(null);

  // Task label
  const [taskMenuOpenId, setTaskMenuOpenId] = useState<string | null>(null);
  const [labelEditingTaskId, setLabelEditingTaskId] = useState<string | null>(null);
  const [labelText, setLabelText] = useState('');
  const [labelColor, setLabelColor] = useState(LABEL_COLORS[0]);
  const [labelSaveLoading, setLabelSaveLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('quadro');

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: projData, error: projError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (projError) throw projError;
      setProject(projData);

      // Fetch plan members; fallback to all team_members if none defined
      const { data: planMembersData } = await supabase
        .from('plan_members')
        .select('member:team_members(*)')
        .eq('plan_id', projectId);

      const planMembers = (planMembersData || [])
        .map((pm: any) => pm.member)
        .filter(Boolean)
        .sort((a: any, b: any) => a.name.localeCompare(b.name));

      if (planMembers.length > 0) {
        setTeamMembers(planMembers);
      } else {
        const { data: allMembersData } = await supabase
          .from('team_members')
          .select('*')
          .order('name');
        setTeamMembers(allMembersData || []);
      }

      const { data: bucketsData, error: bucketsError } = await supabase
        .from('buckets')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });

      if (bucketsError) throw bucketsError;
      setBuckets(bucketsData || []);

      await fetchTasks();
    } catch (err: any) {
      console.error('Erro ao buscar dados do projeto:', err);
      setError('Não foi possível carregar as informações deste projeto.');
    } finally {
      setLoading(false);
    }
  };

  const fetchTasks = async () => {
    try {
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select(`
          *,
          assignees:task_assignees(
            member:team_members(*)
          )
        `)
        .eq('project_id', projectId)
        .order('id', { ascending: true });

      if (tasksError) throw tasksError;

      const formattedTasks: TaskWithAssignees[] = (tasksData || []).map((task: any) => ({
        ...task,
        assignees: task.assignees
          ? task.assignees.map((a: any) => a.member).filter(Boolean)
          : []
      }));

      setTasks(formattedTasks);
    } catch (err) {
      console.error('Erro ao buscar tarefas:', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, [projectId]);

  const handleToggleStatus = async (task: TaskWithAssignees, event: React.MouseEvent) => {
    event.stopPropagation();
    const nextStatus = task.status === 'Concluído' ? 'Não iniciado' : 'Concluído';

    try {
      const { error: patchError } = await supabase
        .from('tasks')
        .update({ status: nextStatus })
        .eq('id', task.id);

      if (patchError) throw patchError;

      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: nextStatus } : t));
    } catch (err) {
      console.error('Erro ao atualizar status da tarefa:', err);
      toast.error('Não foi possível atualizar o status da tarefa.');
    }
  };

  const handleCreateBucket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBucketName.trim()) return;

    try {
      const { data, error: dbError } = await supabase
        .from('buckets')
        .insert([{ project_id: projectId, name: newBucketName.trim() }])
        .select();

      if (dbError) throw dbError;

      if (data && data[0]) {
        setBuckets([...buckets, data[0]]);
        setNewBucketName('');
        setIsAddingBucket(false);
        toast.success(`Bucket "${data[0].name}" criado.`);
      }
    } catch (err) {
      console.error('Erro ao criar bucket:', err);
      toast.error('Não foi possível criar o bucket.');
    }
  };

  const handleRenameBucket = async (e: React.FormEvent, bucketId: string) => {
    e.preventDefault();
    if (!renameBucketName.trim()) return;

    try {
      setRenameLoading(true);

      const { error: dbError } = await supabase
        .from('buckets')
        .update({ name: renameBucketName.trim() })
        .eq('id', bucketId);

      if (dbError) throw dbError;

      setBuckets(prev => prev.map(b => b.id === bucketId ? { ...b, name: renameBucketName.trim() } : b));
      setRenamingBucketId(null);
      toast.success('Bucket renomeado.');
    } catch (err) {
      console.error('Erro ao renomear bucket:', err);
      toast.error('Não foi possível renomear o bucket.');
    } finally {
      setRenameLoading(false);
    }
  };

  const handleDeleteBucket = async (bucketId: string, bucketName: string, taskCount: number) => {
    const msg = taskCount > 0
      ? `Excluir "${bucketName}"? As ${taskCount} tarefa(s) dentro serão removidas permanentemente.`
      : `Excluir o bucket "${bucketName}"?`;

    if (!window.confirm(msg)) return;

    try {
      setDeleteBucketLoadingId(bucketId);

      const { error: dbError } = await supabase
        .from('buckets')
        .delete()
        .eq('id', bucketId);

      if (dbError) throw dbError;

      setBuckets(prev => prev.filter(b => b.id !== bucketId));
      setTasks(prev => prev.filter(t => t.bucket_id !== bucketId));
      toast.success(`Bucket "${bucketName}" excluído.`);
    } catch (err) {
      console.error('Erro ao excluir bucket:', err);
      toast.error('Não foi possível excluir o bucket.');
    } finally {
      setDeleteBucketLoadingId(null);
    }
  };

  const handleSaveLabel = async (e: React.FormEvent, taskId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const text = labelText.trim();
    try {
      setLabelSaveLoading(true);
      const { error } = await supabase
        .from('tasks')
        .update({ label_text: text || null, label_color: text ? labelColor : null })
        .eq('id', taskId);
      if (error) throw error;
      setTasks(prev => prev.map(t =>
        t.id === taskId ? { ...t, label_text: text || null, label_color: text ? labelColor : null } : t
      ));
      setLabelEditingTaskId(null);
      toast.success('Rótulo salvo.');
    } catch (err) {
      console.error('Erro ao salvar rótulo:', err);
      toast.error('Não foi possível salvar o rótulo.');
    } finally {
      setLabelSaveLoading(false);
    }
  };

  const handleRemoveLabel = async (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ label_text: null, label_color: null })
        .eq('id', taskId);
      if (error) throw error;
      setTasks(prev => prev.map(t =>
        t.id === taskId ? { ...t, label_text: null, label_color: null } : t
      ));
      setLabelEditingTaskId(null);
      toast.success('Rótulo removido.');
    } catch (err) {
      console.error('Erro ao remover rótulo:', err);
      toast.error('Não foi possível remover o rótulo.');
    }
  };

  const handleQuickAddTask = async (e: React.FormEvent, bucketId: string) => {
    e.preventDefault();
    if (!quickTaskTitle.trim()) return;

    try {
      const { data: taskData, error: taskError } = await supabase
        .from('tasks')
        .insert([{
          project_id: projectId,
          bucket_id: bucketId,
          title: quickTaskTitle.trim(),
          status: 'Não iniciado',
          priority: 'Média'
        }])
        .select();

      if (taskError) throw taskError;

      if (taskData && taskData[0]) {
        await fetchTasks();
        setQuickTaskTitle('');
        setActiveQuickAddBucketId(null);
        toast.success('Tarefa adicionada.');
      }
    } catch (err: any) {
      console.error('Erro ao criar tarefa rápida:', err);
      toast.error('Falha ao registrar a tarefa. Tente novamente.');
    }
  };

  const isOverdue = (dueDateStr: string | null, status: string) => {
    if (!dueDateStr || status === 'Concluído') return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const [year, month, day] = dueDateStr.split('-').map(Number);
    return new Date(year, month - 1, day) < today;
  };

  const getInitials = (name: string) =>
    name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '6rem 0' }}>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', color: 'var(--accent-gold)', fontStyle: 'italic' }}>
          Carregando memorial e quadro...
        </div>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="empty-state">
        <h3 style={{ color: '#ff99bb' }}>Projeto não encontrado</h3>
        <p style={{ marginBottom: '1.5rem' }}>{error || 'Não foi possível carregar as informações deste projeto.'}</p>
        <button onClick={onNavigateHome} className="btn btn-primary">Voltar para o Dashboard</button>
      </div>
    );
  }

  return (
    <div>
      {/* Breadcrumb + project header */}
      <div style={{ marginBottom: '2.5rem', borderBottom: '1px solid rgba(163, 133, 96, 0.1)', paddingBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.25rem', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
          <button
            onClick={onNavigateHome}
            className="btn btn-text"
            style={{ padding: 0, fontSize: '0.82rem', color: 'var(--text-secondary)' }}
          >
            Meus planos
          </button>
          <span style={{ color: 'var(--text-secondary)', opacity: 0.5 }}>›</span>
          <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{project.name}</span>
        </div>

        <h1 style={{ fontSize: '2.2rem', marginBottom: '0.25rem' }}>{project.name}</h1>

        {project.start_date && project.end_date && (
          <div style={{
            fontSize: '0.8rem',
            color: 'var(--accent-gold)',
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            fontWeight: 600,
            marginBottom: '0.5rem'
          }}>
            Cronograma: {formatDate(project.start_date)} — {formatDate(project.end_date)}
          </div>
        )}

        {project.description && (
          <p style={{
            fontSize: '0.95rem',
            fontStyle: 'italic',
            borderLeft: '2px solid var(--accent-gold)',
            paddingLeft: '1.25rem',
            marginTop: '0.75rem',
            color: 'var(--text-secondary)',
            maxWidth: '900px',
            lineHeight: '1.6'
          }}>
            "{project.description}"
          </p>
        )}
      </div>

      {/* View Tabs */}
      <div className="view-tabs">
        {[
          { id: 'grade', label: 'Grade' },
          { id: 'quadro', label: 'Quadro' },
          { id: 'calendario', label: 'Calendário' },
          { id: 'graficos', label: 'Gráficos' },
        ].map(tab => (
          <button
            key={tab.id}
            className={`view-tab${activeTab === tab.id ? ' active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
            disabled={tab.id !== 'quadro'}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'quadro' ? (
      <div className="kanban-board scroller">
        {buckets.map(bucket => {
          const bucketTasks = tasks.filter(t => t.bucket_id === bucket.id);
          const isRenaming = renamingBucketId === bucket.id;
          const isMenuOpen = bucketMenuOpenId === bucket.id;

          return (
            <div key={bucket.id} className="kanban-column">

              {/* Column Header */}
              {isRenaming ? (
                <form
                  onSubmit={(e) => handleRenameBucket(e, bucket.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0 0 0.75rem 0' }}
                >
                  <input
                    type="text"
                    className="form-input"
                    style={{ flex: 1, padding: '0.3rem 0.5rem', fontSize: '0.85rem' }}
                    value={renameBucketName}
                    onChange={(e) => setRenameBucketName(e.target.value)}
                    autoFocus
                    required
                  />
                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                    disabled={renameLoading}
                  >
                    {renameLoading ? '...' : '✓'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                    onClick={() => setRenamingBucketId(null)}
                  >
                    ✗
                  </button>
                </form>
              ) : (
                <>
                  <div className="kanban-column-header">
                    <h3 className="kanban-column-title" title={bucket.name}>
                      {bucket.name}
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <span className="kanban-column-count">{bucketTasks.length}</span>
                      <button
                        className="btn btn-text"
                        style={{
                          fontSize: '1.1rem',
                          padding: '0 0.2rem',
                          color: 'var(--text-secondary)',
                          lineHeight: 1,
                          letterSpacing: '0.05em'
                        }}
                        onClick={() => setBucketMenuOpenId(isMenuOpen ? null : bucket.id)}
                        title="Opções do bucket"
                      >
                        ⋯
                      </button>
                    </div>
                  </div>

                  {isMenuOpen && (
                    <div style={{
                      display: 'flex',
                      gap: '0.5rem',
                      padding: '0.4rem 0',
                      marginBottom: '0.25rem',
                      borderBottom: '1px solid rgba(163, 133, 96, 0.1)'
                    }}>
                      <button
                        className="btn btn-text"
                        style={{ fontSize: '0.72rem', padding: '0.15rem 0.4rem', color: 'var(--text-secondary)' }}
                        onClick={() => {
                          setRenamingBucketId(bucket.id);
                          setRenameBucketName(bucket.name);
                          setBucketMenuOpenId(null);
                        }}
                      >
                        Renomear
                      </button>
                      <button
                        className="btn btn-text"
                        style={{ fontSize: '0.72rem', padding: '0.15rem 0.4rem', color: '#D83B01' }}
                        onClick={() => {
                          setBucketMenuOpenId(null);
                          handleDeleteBucket(bucket.id, bucket.name, bucketTasks.length);
                        }}
                        disabled={deleteBucketLoadingId === bucket.id}
                      >
                        {deleteBucketLoadingId === bucket.id ? 'Excluindo...' : 'Excluir'}
                      </button>
                    </div>
                  )}
                </>
              )}

              {/* Quick Task Inline Creator */}
              {activeQuickAddBucketId === bucket.id ? (
                <div className="kanban-quick-add">
                  <form onSubmit={(e) => handleQuickAddTask(e, bucket.id)} className="kanban-quick-add-form">
                    <input
                      type="text"
                      className="form-input"
                      style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
                      placeholder="Título da tarefa..."
                      value={quickTaskTitle}
                      onChange={(e) => setQuickTaskTitle(e.target.value)}
                      autoFocus
                      required
                    />
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <button type="submit" className="btn btn-primary" style={{ flex: 1, padding: '0.25rem', fontSize: '0.7rem' }}>
                        Adicionar
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{ flex: 1, padding: '0.25rem', fontSize: '0.7rem' }}
                        onClick={() => {
                          setActiveQuickAddBucketId(null);
                          setQuickTaskTitle('');
                        }}
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="kanban-quick-add">
                  <button
                    className="kanban-quick-add-btn"
                    onClick={() => {
                      setActiveQuickAddBucketId(bucket.id);
                      setQuickTaskTitle('');
                    }}
                  >
                    + Adicionar tarefa
                  </button>
                </div>
              )}

              {/* Tasks List */}
              <div className="kanban-tasks-list scroller">
                {bucketTasks.length === 0 ? (
                  <div style={{
                    fontStyle: 'italic',
                    color: 'var(--text-secondary)',
                    fontSize: '0.8rem',
                    textAlign: 'center',
                    padding: '2rem 0',
                    border: '1px dashed rgba(163, 133, 96, 0.15)',
                    borderRadius: 'var(--radius-sm)'
                  }}>
                    Vazio
                  </div>
                ) : (
                  bucketTasks.map(task => {
                    const taskOverdue = isOverdue(task.due_date, task.status);
                    const priorityStyle = getPriorityTagStyle(task.priority);
                    const isTaskMenuOpen = taskMenuOpenId === task.id;
                    const isLabelEditing = labelEditingTaskId === task.id;
                    return (
                      <div
                        key={task.id}
                        className={`kanban-task-card ${task.status === 'Concluído' ? 'completed' : ''} ${taskOverdue ? 'overdue' : ''}`}
                        onClick={() => {
                          if (isTaskMenuOpen) { setTaskMenuOpenId(null); return; }
                          if (isLabelEditing) return;
                          setSelectedTaskId(task.id);
                        }}
                      >
                        {/* Label Tag */}
                        {task.label_text && (
                          <div style={{ marginBottom: '0.3rem' }}>
                            <span className="label-tag" style={{ backgroundColor: task.label_color || '#A38560' }}>
                              {task.label_text}
                            </span>
                          </div>
                        )}

                        {/* Status/Priority Badges + ⋯ button */}
                        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.35rem', marginBottom: '0.25rem' }}>
                          <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', flex: 1 }}>
                            <span style={{
                              fontSize: '0.62rem', padding: '0.15rem 0.4rem', borderRadius: '2px',
                              textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em',
                              ...getStatusTagStyle(task.status)
                            }}>
                              {task.status || 'Não iniciado'}
                            </span>
                            {priorityStyle && (
                              <span style={{
                                fontSize: '0.62rem', padding: '0.15rem 0.4rem', borderRadius: '2px',
                                textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em',
                                ...priorityStyle
                              }}>
                                {task.priority}
                              </span>
                            )}
                          </div>
                          <button
                            onClick={e => {
                              e.stopPropagation();
                              setTaskMenuOpenId(isTaskMenuOpen ? null : task.id);
                              setLabelEditingTaskId(null);
                            }}
                            style={{
                              background: 'none', border: 'none', cursor: 'pointer',
                              fontSize: '1rem', color: '#999', padding: '0 0.1rem',
                              lineHeight: 1, flexShrink: 0, letterSpacing: '0.05em',
                            }}
                            title="Opções"
                          >
                            ⋯
                          </button>
                        </div>

                        {/* Task quick menu */}
                        {isTaskMenuOpen && (
                          <div
                            onClick={e => e.stopPropagation()}
                            style={{ marginBottom: '0.35rem', paddingBottom: '0.35rem', borderBottom: '1px solid #F0F0F0' }}
                          >
                            <button
                              onClick={e => {
                                e.stopPropagation();
                                setLabelEditingTaskId(task.id);
                                setLabelText(task.label_text || '');
                                setLabelColor(task.label_color || LABEL_COLORS[0]);
                                setTaskMenuOpenId(null);
                              }}
                              style={{
                                background: 'none', border: 'none', cursor: 'pointer',
                                fontSize: '0.82rem', color: 'var(--text-primary)',
                                padding: '0.2rem 0.25rem', display: 'flex',
                                alignItems: 'center', gap: '0.35rem',
                                fontFamily: 'var(--font-sans)', width: '100%',
                              }}
                            >
                              <span style={{ fontSize: '0.9rem' }}>🏷</span> Rótulo
                            </button>
                          </div>
                        )}

                        {/* Checkbox & Title */}
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                          <button
                            onClick={(e) => handleToggleStatus(task, e)}
                            style={{
                              width: '18px', height: '18px',
                              border: '1.5px solid #A0A0A0', borderRadius: '50%',
                              backgroundColor: task.status === 'Concluído' ? '#A0A0A0' : 'transparent',
                              color: '#FFFFFF', cursor: 'pointer', display: 'flex',
                              alignItems: 'center', justifyContent: 'center',
                              flexShrink: 0, fontSize: '0.7rem', padding: 0, marginTop: '0.15rem',
                            }}
                            title={task.status === 'Concluído' ? 'Reabrir tarefa' : 'Concluir tarefa'}
                          >
                            {task.status === 'Concluído' && '✓'}
                          </button>
                          <div style={{ flex: 1 }}>
                            <h4
                              className="kanban-task-title"
                              style={{ margin: '0 0 0.25rem 0', textDecoration: task.status === 'Concluído' ? 'line-through' : 'none' }}
                            >
                              {task.title}
                            </h4>
                            {task.description && (
                              <p className="kanban-task-desc">{task.description}</p>
                            )}
                          </div>
                        </div>

                        {/* Footer: Date and Avatars */}
                        <div className="kanban-task-footer">
                          {task.due_date ? (
                            <span className={`kanban-date-badge ${taskOverdue ? 'overdue' : ''}`}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px' }}>
                                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                                <line x1="16" y1="2" x2="16" y2="6"></line>
                                <line x1="8" y1="2" x2="8" y2="6"></line>
                                <line x1="3" y1="10" x2="21" y2="10"></line>
                              </svg>
                              {formatDate(task.due_date).substring(0, 5)}
                            </span>
                          ) : <div />}

                          {task.assignees && task.assignees.length > 0 && (
                            <div className="kanban-avatar-group">
                              {task.assignees.slice(0, 3).map(assignee => (
                                <div key={assignee.id} className="kanban-avatar" title={assignee.name}>
                                  {getInitials(assignee.name)}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Inline Label Editor */}
                        {isLabelEditing && (
                          <form
                            onSubmit={e => handleSaveLabel(e, task.id)}
                            onClick={e => e.stopPropagation()}
                            style={{ borderTop: '1px solid #F0F0F0', marginTop: '0.75rem', paddingTop: '0.75rem' }}
                          >
                            <div style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                              Rótulo
                            </div>
                            <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                              {LABEL_COLORS.map(color => (
                                <button
                                  key={color}
                                  type="button"
                                  onClick={() => setLabelColor(color)}
                                  style={{
                                    width: '22px', height: '22px', borderRadius: '4px',
                                    backgroundColor: color, padding: 0, flexShrink: 0, cursor: 'pointer',
                                    border: labelColor === color ? '2.5px solid #242424' : '2px solid transparent',
                                  }}
                                />
                              ))}
                            </div>
                            <input
                              type="text"
                              style={{
                                width: '100%', padding: '0.35rem 0.5rem', fontSize: '0.82rem',
                                border: '1px solid #EAEAEA', borderRadius: '3px',
                                fontFamily: 'var(--font-sans)', color: 'var(--text-primary)',
                                backgroundColor: '#fff', marginBottom: '0.5rem', outline: 'none',
                              }}
                              placeholder="Texto do rótulo..."
                              value={labelText}
                              onChange={e => setLabelText(e.target.value)}
                              maxLength={30}
                              autoFocus
                            />
                            <div style={{ display: 'flex', gap: '0.35rem' }}>
                              <button
                                type="submit"
                                disabled={labelSaveLoading}
                                style={{
                                  flex: 1, padding: '0.3rem', fontSize: '0.72rem',
                                  backgroundColor: 'var(--accent-gold)', color: '#fff',
                                  border: 'none', borderRadius: '3px', cursor: 'pointer',
                                  fontWeight: 600, fontFamily: 'var(--font-sans)',
                                  opacity: labelSaveLoading ? 0.6 : 1,
                                }}
                              >
                                {labelSaveLoading ? '...' : 'Salvar'}
                              </button>
                              {task.label_text && (
                                <button
                                  type="button"
                                  onClick={e => handleRemoveLabel(task.id, e)}
                                  style={{
                                    flex: 1, padding: '0.3rem', fontSize: '0.72rem',
                                    backgroundColor: 'transparent', color: '#D83B01',
                                    border: '1px solid rgba(216, 59, 1, 0.3)', borderRadius: '3px',
                                    cursor: 'pointer', fontFamily: 'var(--font-sans)',
                                  }}
                                >
                                  Remover
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={e => { e.stopPropagation(); setLabelEditingTaskId(null); }}
                                style={{
                                  flex: 1, padding: '0.3rem', fontSize: '0.72rem',
                                  backgroundColor: 'transparent', color: 'var(--text-secondary)',
                                  border: '1px solid #EAEAEA', borderRadius: '3px',
                                  cursor: 'pointer', fontFamily: 'var(--font-sans)',
                                }}
                              >
                                Cancelar
                              </button>
                            </div>
                          </form>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}

        {/* Add Bucket Column */}
        {isAddingBucket ? (
          <div className="kanban-column" style={{ minHeight: '120px' }}>
            <form onSubmit={handleCreateBucket} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <input
                type="text"
                className="form-input"
                style={{ padding: '0.4rem 0.6rem', fontSize: '0.85rem' }}
                placeholder="Nome da coluna..."
                value={newBucketName}
                onChange={(e) => setNewBucketName(e.target.value)}
                autoFocus
                required
              />
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1, padding: '0.25rem', fontSize: '0.7rem' }}>
                  Criar
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ flex: 1, padding: '0.25rem', fontSize: '0.7rem' }}
                  onClick={() => setIsAddingBucket(false)}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        ) : (
          <div className="kanban-add-column" onClick={() => setIsAddingBucket(true)}>
            <h3>Adicionar um novo bucket</h3>
          </div>
        )}
      </div>
      ) : (
        <div style={{
          padding: '4rem 2rem', textAlign: 'center',
          color: 'var(--text-secondary)', backgroundColor: 'var(--bg-surface)',
          borderRadius: 'var(--radius-md)', marginTop: '0.5rem',
        }}>
          <p style={{ fontSize: '1rem' }}>Visualização em desenvolvimento.</p>
        </div>
      )}

      {/* Task Details Modal */}
      {selectedTaskId && (
        <TaskDetailsModal
          taskId={selectedTaskId}
          teamMembers={teamMembers}
          onClose={() => {
            setSelectedTaskId(null);
            fetchTasks();
          }}
        />
      )}
    </div>
  );
};

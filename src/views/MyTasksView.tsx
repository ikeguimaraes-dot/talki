import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import type { TeamMember } from '../types';
import { TaskDetailsModal } from '../components/TaskDetailsModal';

const STORAGE_KEY = 'checkplan_current_member';

interface MyTask {
  id: string;
  title: string;
  project_id: string;
  bucket_id: string;
  status: 'Não iniciado' | 'Em andamento' | 'Concluído';
  priority: 'Baixa' | 'Média' | 'Alta' | 'Urgente';
  due_date: string | null;
  label_text: string | null;
  label_color: string | null;
  project_name: string;
}

const COLUMNS: { key: 'Não iniciado' | 'Em andamento' | 'Concluído'; label: string }[] = [
  { key: 'Não iniciado', label: 'Não iniciado' },
  { key: 'Em andamento', label: 'Em andamento' },
  { key: 'Concluído', label: 'Concluído' },
];

const formatDate = (dateStr: string | null): string => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  return `${parts[2]}/${parts[1]}`;
};

const isOverdue = (dueDateStr: string | null, status: string): boolean => {
  if (!dueDateStr || status === 'Concluído') return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [year, month, day] = dueDateStr.split('-').map(Number);
  return new Date(year, month - 1, day) < today;
};

export const MyTasksView: React.FC = () => {
  const [currentMemberId, setCurrentMemberId] = useState<string | null>(
    () => localStorage.getItem(STORAGE_KEY)
  );
  const [allMembers, setAllMembers] = useState<TeamMember[]>([]);
  const [tasks, setTasks] = useState<MyTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedTaskMembers, setSelectedTaskMembers] = useState<TeamMember[]>([]);

  useEffect(() => {
    supabase.from('team_members').select('*').order('name').then(({ data }) => {
      setAllMembers(data || []);
    });
  }, []);

  useEffect(() => {
    if (!currentMemberId) {
      setLoading(false);
      return;
    }
    fetchMyTasks();
  }, [currentMemberId]);

  const fetchMyTasks = async () => {
    if (!currentMemberId) return;
    setLoading(true);
    try {
      const { data: assigneeData } = await supabase
        .from('task_assignees')
        .select('task_id')
        .eq('member_id', currentMemberId);

      const taskIds = (assigneeData || []).map((a: any) => a.task_id);

      if (taskIds.length === 0) {
        setTasks([]);
        return;
      }

      const { data: tasksData } = await supabase
        .from('tasks')
        .select('*, project:projects(id, name)')
        .in('id', taskIds)
        .order('project_id');

      const formatted: MyTask[] = (tasksData || []).map((t: any) => ({
        ...t,
        project_name: t.project?.name || 'Plano desconhecido',
      }));

      setTasks(formatted);
    } catch (err) {
      console.error('Erro ao buscar minhas tarefas:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectMember = (memberId: string) => {
    localStorage.setItem(STORAGE_KEY, memberId);
    setCurrentMemberId(memberId);
  };

  const handleTaskClick = async (task: MyTask) => {
    const { data: planMembersData } = await supabase
      .from('plan_members')
      .select('member:team_members(*)')
      .eq('plan_id', task.project_id);

    const members = (planMembersData || []).map((pm: any) => pm.member).filter(Boolean);
    setSelectedTaskMembers(members.length > 0 ? members : allMembers);
    setSelectedTaskId(task.id);
  };

  const currentMember = allMembers.find(m => m.id === currentMemberId);

  if (!currentMemberId) {
    return (
      <div>
        <div style={{
          marginBottom: '2.5rem',
          borderBottom: '1px solid rgba(163, 133, 96, 0.1)',
          paddingBottom: '1.5rem',
        }}>
          <h1 style={{ fontSize: '2.2rem', marginBottom: '0.25rem' }}>Minhas Tarefas</h1>
        </div>
        <div style={{ maxWidth: '420px', margin: '2rem auto', textAlign: 'center' }}>
          <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', marginBottom: '2rem' }}>
            Selecione seu perfil para ver as tarefas atribuídas a você.
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {allMembers.map(m => (
              <button
                key={m.id}
                className="btn btn-secondary"
                style={{
                  justifyContent: 'flex-start',
                  padding: '0.65rem 1.25rem',
                  fontSize: '0.9rem',
                  gap: '0.75rem',
                  textTransform: 'none',
                  letterSpacing: 0,
                }}
                onClick={() => handleSelectMember(m.id)}
              >
                <div style={{
                  width: '30px', height: '30px', borderRadius: '50%',
                  backgroundColor: 'var(--accent-gold)', color: '#03110D',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.65rem', fontWeight: 700, flexShrink: 0,
                }}>
                  {m.name.split(' ').map((p: string) => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()}
                </div>
                {m.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div style={{
        marginBottom: '2rem',
        borderBottom: '1px solid rgba(163, 133, 96, 0.1)',
        paddingBottom: '1.25rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
      }}>
        <div>
          <h1 style={{ fontSize: '2.2rem', marginBottom: '0.2rem' }}>Minhas Tarefas</h1>
          {currentMember && (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Mostrando tarefas de{' '}
              <strong style={{ color: 'var(--text-primary)' }}>{currentMember.name}</strong>
            </p>
          )}
        </div>
        <button
          className="btn btn-text"
          style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', padding: '0.4rem 0.6rem' }}
          onClick={() => { localStorage.removeItem(STORAGE_KEY); setCurrentMemberId(null); setTasks([]); }}
        >
          Mudar perfil
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem 0', fontStyle: 'italic', color: 'var(--accent-gold)' }}>
          Carregando tarefas...
        </div>
      ) : tasks.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: '4rem 2rem',
          border: '1px dashed rgba(163, 133, 96, 0.2)',
          borderRadius: 'var(--radius-sm)',
        }}>
          <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>
            Nenhuma tarefa atribuída a você.
          </p>
        </div>
      ) : (
        <div className="kanban-board scroller">
          {COLUMNS.map(col => {
            const colTasks = tasks.filter(t => t.status === col.key);
            const groups: Record<string, MyTask[]> = {};
            for (const task of colTasks) {
              if (!groups[task.project_name]) groups[task.project_name] = [];
              groups[task.project_name].push(task);
            }

            return (
              <div key={col.key} className="kanban-column">
                <div className="kanban-column-header">
                  <h3 className="kanban-column-title">{col.label}</h3>
                  {colTasks.length > 0 && (
                    <span style={{
                      fontSize: '0.72rem', fontWeight: 700,
                      backgroundColor: '#EAEAEA', color: 'var(--text-secondary)',
                      borderRadius: '10px', padding: '0.1rem 0.45rem',
                    }}>
                      {colTasks.length}
                    </span>
                  )}
                </div>

                <div className="kanban-tasks-list scroller">
                  {colTasks.length === 0 ? (
                    <div style={{
                      fontStyle: 'italic', color: 'var(--text-secondary)', fontSize: '0.8rem',
                      textAlign: 'center', padding: '2rem 0',
                      border: '1px dashed rgba(163, 133, 96, 0.15)',
                      borderRadius: 'var(--radius-sm)',
                    }}>
                      Vazio
                    </div>
                  ) : (
                    Object.entries(groups).map(([planName, planTasks]) => (
                      <div key={planName} style={{ marginBottom: '0.75rem' }}>
                        <div style={{
                          fontSize: '0.65rem', fontWeight: 700, color: 'var(--accent-gold)',
                          textTransform: 'uppercase', letterSpacing: '0.06em',
                          padding: '0.2rem 0.25rem 0.35rem',
                          borderBottom: '1px solid rgba(163, 133, 96, 0.15)',
                          marginBottom: '0.4rem',
                        }}>
                          {planName}
                        </div>
                        {planTasks.map(task => {
                          const overdue = isOverdue(task.due_date, task.status);
                          return (
                            <div
                              key={task.id}
                              className={`kanban-task-card${task.status === 'Concluído' ? ' completed' : ''}${overdue ? ' overdue' : ''}`}
                              style={{ marginBottom: '0.5rem', cursor: 'pointer' }}
                              onClick={() => handleTaskClick(task)}
                            >
                              {task.label_text && (
                                <div style={{ marginBottom: '0.3rem' }}>
                                  <span className="label-tag" style={{ backgroundColor: task.label_color || '#A38560' }}>
                                    {task.label_text}
                                  </span>
                                </div>
                              )}
                              <h4 className="kanban-task-title" style={{ marginBottom: task.due_date ? '0.4rem' : 0 }}>
                                {task.title}
                              </h4>
                              {task.due_date && (
                                <span className={`kanban-date-badge${overdue ? ' overdue' : ''}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                    <line x1="16" y1="2" x2="16" y2="6" />
                                    <line x1="8" y1="2" x2="8" y2="6" />
                                    <line x1="3" y1="10" x2="21" y2="10" />
                                  </svg>
                                  {formatDate(task.due_date)}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedTaskId && (
        <TaskDetailsModal
          taskId={selectedTaskId}
          teamMembers={selectedTaskMembers}
          onClose={() => {
            setSelectedTaskId(null);
            fetchMyTasks();
          }}
        />
      )}
    </div>
  );
};

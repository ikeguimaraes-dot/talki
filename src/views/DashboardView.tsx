import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '../supabase';
import type { ProjectWithMembers } from '../types';
import { CreatePlanModal } from '../components/CreatePlanModal';

interface DashboardViewProps {
  onSelectProject: (projectId: string) => void;
}

const PLAN_COLORS = [
  '#E53935', '#8E24AA', '#3949AB', '#039BE5',
  '#00897B', '#7CB342', '#F4511E', '#F6BF26',
  '#A38560', '#6264A7',
];

const getPlanColor = (name: string): string => {
  const code = (name.trim().toUpperCase().charCodeAt(0) || 65);
  return PLAN_COLORS[code % PLAN_COLORS.length];
};

const getPlanInitials = (name: string): string =>
  name.split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();

const formatDate = (dateStr: string): string => {
  const d = new Date(dateStr);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
};

export const DashboardView: React.FC<DashboardViewProps> = ({ onSelectProject }) => {
  const [projects, setProjects] = useState<ProjectWithMembers[]>([]);
  const [taskCounts, setTaskCounts] = useState<Record<string, { total: number; completed: number }>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showCreateModal, setShowCreateModal] = useState(false);

  // Row menu
  const [rowMenuOpenId, setRowMenuOpenId] = useState<string | null>(null);

  // Edit state
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editStatus, setEditStatus] = useState('Não iniciado');
  const [editLoading, setEditLoading] = useState(false);

  // Delete
  const [deleteLoadingId, setDeleteLoadingId] = useState<string | null>(null);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: dbError } = await supabase
        .from('projects')
        .select(`
          *,
          planMembers:plan_members(
            member:team_members(id, name)
          )
        `)
        .order('created_at', { ascending: false });

      if (dbError) throw dbError;

      const projectsWithMembers: ProjectWithMembers[] = (data || []).map((p: any) => ({
        ...p,
        members: (p.planMembers || []).map((pm: any) => pm.member).filter(Boolean),
      }));

      setProjects(projectsWithMembers);

      const projectIds = projectsWithMembers.map(p => p.id);
      if (projectIds.length > 0) {
        const { data: tasksData } = await supabase
          .from('tasks')
          .select('project_id, status')
          .in('project_id', projectIds);

        const counts: Record<string, { total: number; completed: number }> = {};
        for (const p of projectsWithMembers) counts[p.id] = { total: 0, completed: 0 };
        for (const task of (tasksData || [])) {
          if (counts[task.project_id]) {
            counts[task.project_id].total++;
            if (task.status === 'Concluído') counts[task.project_id].completed++;
          }
        }
        setTaskCounts(counts);
      }
    } catch (err: any) {
      console.error('Erro ao buscar planos:', err);
      setError('Não foi possível carregar os planos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handlePlanCreated = (project: any, memberIds: string[]) => {
    const allMembers = memberIds.length === 0 ? [] : projects
      .flatMap(p => p.members)
      .filter((m, i, arr) => memberIds.includes(m.id) && arr.findIndex(x => x.id === m.id) === i);

    const newPlan: ProjectWithMembers = { ...project, members: allMembers };
    setProjects(prev => [newPlan, ...prev]);
    setTaskCounts(prev => ({ ...prev, [project.id]: { total: 0, completed: 0 } }));

    // Refresh to get correct member data
    fetchProjects();
  };

  const handleStartEdit = (e: React.MouseEvent, project: ProjectWithMembers) => {
    e.stopPropagation();
    setRowMenuOpenId(null);
    setEditingProjectId(project.id);
    setEditName(project.name);
    setEditStatus(project.status);
  };

  const handleSaveEdit = async (e: React.FormEvent, projectId: string) => {
    e.preventDefault();
    if (!editName.trim()) return;

    try {
      setEditLoading(true);

      const { data, error: dbError } = await supabase
        .from('projects')
        .update({ name: editName.trim(), status: editStatus })
        .eq('id', projectId)
        .select()
        .single();

      if (dbError) throw dbError;

      setProjects(prev => prev.map(p =>
        p.id === projectId ? { ...p, ...data } : p
      ));
      setEditingProjectId(null);
      toast.success('Plano atualizado.');
    } catch (err) {
      console.error('Erro ao atualizar plano:', err);
      toast.error('Não foi possível atualizar o plano.');
    } finally {
      setEditLoading(false);
    }
  };

  const handleDeleteProject = async (e: React.MouseEvent, project: ProjectWithMembers) => {
    e.stopPropagation();
    setRowMenuOpenId(null);
    if (!window.confirm(`Excluir "${project.name}"? Todos os buckets e tarefas serão removidos permanentemente.`)) return;

    try {
      setDeleteLoadingId(project.id);

      const { error: dbError } = await supabase
        .from('projects')
        .delete()
        .eq('id', project.id);

      if (dbError) throw dbError;

      setProjects(prev => prev.filter(p => p.id !== project.id));
      setTaskCounts(prev => { const n = { ...prev }; delete n[project.id]; return n; });
      toast.success(`"${project.name}" excluído.`);
    } catch (err) {
      console.error('Erro ao excluir plano:', err);
      toast.error('Não foi possível excluir o plano.');
    } finally {
      setDeleteLoadingId(null);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '6rem 0' }}>
        <div style={{ fontFamily: 'var(--font-serif)', fontSize: '1.25rem', color: 'var(--accent-gold)', fontStyle: 'italic' }}>
          Carregando planos...
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Page header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        marginBottom: '2.5rem',
        borderBottom: '1px solid rgba(163, 133, 96, 0.1)',
        paddingBottom: '1.5rem',
      }}>
        <div>
          <h1 style={{ fontSize: '2.5rem', marginBottom: '0.25rem' }}>Meus Planos</h1>
          <p style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
            Selecione um plano para abrir o quadro ou crie um novo.
          </p>
        </div>
        <button
          className="btn btn-primary"
          style={{ padding: '0.6rem 1.25rem', fontSize: '0.85rem', flexShrink: 0 }}
          onClick={() => setShowCreateModal(true)}
        >
          + Criar um plano
        </button>
      </div>

      {error && (
        <div style={{
          backgroundColor: '#FCE8E1',
          border: '1px solid #D83B01',
          padding: '1.25rem',
          borderRadius: 'var(--radius-sm)',
          marginBottom: '2rem',
        }}>
          <p style={{ color: '#A82E00', fontSize: '0.9rem', marginBottom: '0.75rem' }}>{error}</p>
          <button onClick={fetchProjects} className="btn btn-secondary" style={{ fontSize: '0.75rem', color: '#D83B01', borderColor: '#D83B01' }}>
            Tentar Novamente
          </button>
        </div>
      )}

      {/* Plans list */}
      <div style={{
        backgroundColor: 'var(--bg-surface)',
        borderRadius: 'var(--radius)',
        border: '1px solid #EAEAEA',
        overflow: 'hidden',
      }}>
        {/* Table header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '3fr 1fr 1.5fr 1.5fr 80px',
          padding: '0.6rem 1.25rem',
          borderBottom: '1px solid #EAEAEA',
          backgroundColor: '#F8F8F8',
        }}>
          {['Nome', 'Criado em', 'Tarefas', 'Membros', ''].map(col => (
            <span key={col} style={{
              fontSize: '0.7rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'var(--text-secondary)',
            }}>
              {col}
            </span>
          ))}
        </div>

        {projects.length === 0 && !loading && (
          <div style={{ padding: '4rem 1.5rem', textAlign: 'center' }}>
            <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic', marginBottom: '1rem' }}>
              Nenhum plano criado ainda.
            </p>
            <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
              Criar primeiro plano
            </button>
          </div>
        )}

        {projects.map((project, idx) => {
          const count = taskCounts[project.id] ?? { total: 0, completed: 0 };
          const pct = count.total > 0 ? Math.round((count.completed / count.total) * 100) : 0;
          const isEditing = editingProjectId === project.id;
          const isMenuOpen = rowMenuOpenId === project.id;
          const isDeleting = deleteLoadingId === project.id;
          const planColor = getPlanColor(project.name);
          const isLast = idx === projects.length - 1;

          return (
            <div
              key={project.id}
              style={{
                borderBottom: isLast ? 'none' : '1px solid #F0F0F0',
                transition: 'background 0.15s',
              }}
            >
              {isEditing ? (
                /* Edit form row */
                <form
                  onSubmit={(e) => handleSaveEdit(e, project.id)}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.75rem',
                    padding: '0.9rem 1.25rem',
                    backgroundColor: 'rgba(163, 133, 96, 0.04)',
                  }}
                >
                  <div style={{
                    width: '32px', height: '32px', borderRadius: '6px',
                    backgroundColor: planColor, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.65rem', fontWeight: 700, color: '#fff',
                  }}>
                    {getPlanInitials(editName || project.name)}
                  </div>
                  <input
                    type="text"
                    className="form-input"
                    style={{ flex: 2, padding: '0.35rem 0.6rem', fontSize: '0.9rem' }}
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                    autoFocus
                  />
                  <select
                    className="form-select"
                    style={{ flex: 1, padding: '0.35rem 0.6rem', fontSize: '0.85rem' }}
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                  >
                    <option value="Não iniciado">Não iniciado</option>
                    <option value="Em andamento">Em andamento</option>
                    <option value="Concluído">Concluído</option>
                  </select>
                  <button type="submit" className="btn btn-primary" style={{ padding: '0.35rem 0.9rem', fontSize: '0.8rem' }} disabled={editLoading}>
                    {editLoading ? '...' : 'Salvar'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: '0.35rem 0.9rem', fontSize: '0.8rem' }}
                    onClick={(e) => { e.stopPropagation(); setEditingProjectId(null); }}
                  >
                    Cancelar
                  </button>
                </form>
              ) : (
                /* Normal row */
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '3fr 1fr 1.5fr 1.5fr 80px',
                    alignItems: 'center',
                    padding: '0.9rem 1.25rem',
                    cursor: 'pointer',
                    backgroundColor: 'transparent',
                  }}
                  onClick={() => { setRowMenuOpenId(null); onSelectProject(project.id); }}
                  onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#F8F7F5')}
                  onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
                >
                  {/* Nome */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                    <div style={{
                      width: '32px', height: '32px', borderRadius: '6px',
                      backgroundColor: planColor, flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.65rem', fontWeight: 700, color: '#fff',
                    }}>
                      {getPlanInitials(project.name)}
                    </div>
                    <div>
                      <span style={{ fontWeight: 600, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                        {project.name}
                      </span>
                      {project.status !== 'Não iniciado' && (
                        <span style={{
                          marginLeft: '0.6rem',
                          fontSize: '0.62rem',
                          padding: '0.1rem 0.35rem',
                          borderRadius: '2px',
                          backgroundColor: project.status === 'Concluído' ? '#EBF5EB' : '#E6F4FF',
                          color: project.status === 'Concluído' ? '#137333' : '#1A73E8',
                          border: '1px solid',
                          borderColor: project.status === 'Concluído' ? '#CEEAD6' : '#D2E3FC',
                          fontWeight: 600,
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                        }}>
                          {project.status}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Criado em */}
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    {formatDate(project.created_at)}
                  </span>

                  {/* Tarefas */}
                  <div>
                    {count.total === 0 ? (
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                        Nenhuma
                      </span>
                    ) : (
                      <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '0.3rem' }}>
                          <span style={{ color: 'var(--text-secondary)' }}>{count.completed}/{count.total}</span>
                          <span style={{ color: pct === 100 ? '#137333' : 'var(--text-secondary)', fontWeight: 600 }}>{pct}%</span>
                        </div>
                        <div style={{ height: '3px', backgroundColor: '#EAEAEA', borderRadius: '2px', overflow: 'hidden', maxWidth: '100px' }}>
                          <div style={{
                            height: '100%', width: `${pct}%`,
                            backgroundColor: pct === 100 ? '#137333' : 'var(--accent-gold)',
                            borderRadius: '2px',
                          }} />
                        </div>
                      </>
                    )}
                  </div>

                  {/* Membros */}
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    {project.members.length === 0 ? (
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>—</span>
                    ) : (
                      <>
                        {project.members.slice(0, 4).map((m, i) => (
                          <div
                            key={m.id}
                            title={m.name}
                            style={{
                              width: '26px', height: '26px',
                              borderRadius: '50%',
                              backgroundColor: 'var(--accent-gold)',
                              color: '#03110D',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '0.6rem', fontWeight: 700,
                              border: '2px solid white',
                              marginLeft: i === 0 ? 0 : '-6px',
                              zIndex: 4 - i,
                              position: 'relative',
                            }}
                          >
                            {m.name.split(' ').map((p: string) => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()}
                          </div>
                        ))}
                        {project.members.length > 4 && (
                          <div style={{
                            width: '26px', height: '26px',
                            borderRadius: '50%',
                            backgroundColor: '#EAEAEA',
                            color: 'var(--text-secondary)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.6rem', fontWeight: 700,
                            border: '2px solid white',
                            marginLeft: '-6px',
                          }}>
                            +{project.members.length - 4}
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* Actions */}
                  <div
                    style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {isMenuOpen ? (
                      <>
                        <button
                          className="btn btn-text"
                          style={{ fontSize: '0.72rem', padding: '0.2rem 0.4rem', color: 'var(--text-secondary)' }}
                          onClick={(e) => handleStartEdit(e, project)}
                        >
                          Editar
                        </button>
                        <button
                          className="btn btn-text"
                          style={{ fontSize: '0.72rem', padding: '0.2rem 0.4rem', color: '#D83B01' }}
                          onClick={(e) => handleDeleteProject(e, project)}
                          disabled={isDeleting}
                        >
                          {isDeleting ? '...' : 'Excluir'}
                        </button>
                      </>
                    ) : (
                      <button
                        className="btn btn-text"
                        style={{ fontSize: '1rem', padding: '0 0.3rem', color: 'var(--text-secondary)', letterSpacing: '0.05em' }}
                        onClick={(e) => { e.stopPropagation(); setRowMenuOpenId(project.id); }}
                        title="Opções"
                      >
                        ⋯
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {showCreateModal && (
        <CreatePlanModal
          onCreated={handlePlanCreated}
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </div>
  );
};

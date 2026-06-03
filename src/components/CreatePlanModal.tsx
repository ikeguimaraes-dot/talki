import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '../supabase';
import type { TeamMember, Project } from '../types';

interface CreatePlanModalProps {
  onCreated: (project: Project, memberIds: string[]) => void;
  onClose: () => void;
  currentUserId?: string;
}

const getInitials = (name: string) =>
  name.split(' ').map(p => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();

export const CreatePlanModal: React.FC<CreatePlanModalProps> = ({ onCreated, onClose, currentUserId }) => {
  const dialogRef = useRef<HTMLDialogElement>(null);

  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [fetchingMembers, setFetchingMembers] = useState(true);

  const [name, setName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchMembers = async () => {
      const { data } = await supabase.from('team_members').select('*').order('name');
      setTeamMembers(data || []);
      setFetchingMembers(false);
    };
    fetchMembers();
  }, []);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    dialog.showModal();

    const handleClose = () => onClose();
    const handleBackdropClick = (e: MouseEvent) => {
      if (e.target !== dialog) return;
      const r = dialog.getBoundingClientRect();
      const inside = r.top <= e.clientY && e.clientY <= r.top + r.height &&
                     r.left <= e.clientX && e.clientX <= r.left + r.width;
      if (!inside) dialog.close();
    };

    dialog.addEventListener('close', handleClose);
    dialog.addEventListener('click', handleBackdropClick);
    return () => {
      dialog.removeEventListener('close', handleClose);
      dialog.removeEventListener('click', handleBackdropClick);
    };
  }, [onClose]);

  const handleToggleMember = (memberId: string) => {
    setSelectedMembers(prev =>
      prev.includes(memberId) ? prev.filter(id => id !== memberId) : [...prev, memberId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setLoading(true);

      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .insert([{
          name: name.trim(),
          status: 'Não iniciado',
          ...(currentUserId ? { owner_id: currentUserId } : {}),
        }])
        .select()
        .single();

      if (projectError) throw projectError;

      const { error: bucketError } = await supabase
        .from('buckets')
        .insert([{ project_id: projectData.id, name: 'A Fazer' }]);

      if (bucketError) throw bucketError;

      if (selectedMembers.length > 0) {
        const { error: membersError } = await supabase
          .from('plan_members')
          .insert(selectedMembers.map(memberId => ({
            plan_id: projectData.id,
            member_id: memberId
          })));

        if (membersError) throw membersError;
      }

      toast.success(`Plano "${projectData.name}" criado.`);
      onCreated(projectData, selectedMembers);
      dialogRef.current?.close();
    } catch (err) {
      console.error('Erro ao criar plano:', err);
      toast.error('Não foi possível criar o plano.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      className="premium-modal"
      aria-labelledby="create-plan-title"
      style={{ maxWidth: '460px', width: '95%' }}
    >
      <div className="modal-header">
        <h2 id="create-plan-title" style={{ fontSize: '1.4rem', fontFamily: 'var(--font-serif)' }}>
          Novo Plano
        </h2>
        <button className="modal-close" onClick={() => dialogRef.current?.close()}>×</button>
      </div>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Nome do Plano</label>
          <input
            type="text"
            className="form-input"
            placeholder="Ex: Gerenciamento de Projetos"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
          />
        </div>

        <div>
          <label className="form-label" style={{ display: 'block', marginBottom: '0.6rem' }}>
            Membros do Plano
            <span style={{ fontWeight: 400, color: 'var(--text-secondary)', marginLeft: '0.4rem', fontSize: '0.75rem' }}>
              (opcional)
            </span>
          </label>

          {fetchingMembers ? (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
              Carregando membros...
            </p>
          ) : teamMembers.length === 0 ? (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
              Nenhum membro cadastrado na tabela team_members.
            </p>
          ) : (
            <div style={{
              border: '1px solid rgba(163, 133, 96, 0.2)',
              borderRadius: 'var(--radius-sm)',
              maxHeight: '220px',
              overflowY: 'auto',
            }}>
              {teamMembers.map(member => {
                const checked = selectedMembers.includes(member.id);
                return (
                  <label
                    key={member.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      padding: '0.55rem 0.9rem',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      backgroundColor: checked ? 'rgba(163, 133, 96, 0.07)' : 'transparent',
                      borderBottom: '1px solid rgba(163, 133, 96, 0.07)',
                      transition: 'background 0.15s',
                    }}
                  >
                    <input
                      type="checkbox"
                      className="assignee-checkbox"
                      checked={checked}
                      onChange={() => handleToggleMember(member.id)}
                    />
                    <div style={{
                      width: '30px',
                      height: '30px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--accent-gold)',
                      color: '#03110D',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      flexShrink: 0,
                    }}>
                      {getInitials(member.name)}
                    </div>
                    <span>{member.name}</span>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', paddingTop: '0.25rem' }}>
          <button
            type="submit"
            className="btn btn-primary"
            style={{ flex: 1 }}
            disabled={loading || !name.trim()}
          >
            {loading ? 'Criando...' : 'Criar Plano'}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ flex: 1 }}
            onClick={() => dialogRef.current?.close()}
          >
            Cancelar
          </button>
        </div>
      </form>
    </dialog>
  );
};

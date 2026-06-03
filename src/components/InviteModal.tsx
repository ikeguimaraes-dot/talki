import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '../supabase';
import type { Project, ProjectMember } from '../types';

interface InviteModalProps {
  project: Project;
  currentUserId: string;
  onClose: () => void;
}

interface MemberWithEmail extends ProjectMember {
  email?: string;
}

export const InviteModal: React.FC<InviteModalProps> = ({ project, currentUserId, onClose }) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [tab, setTab] = useState<'email' | 'link'>('email');

  // Email tab
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteLoading, setInviteLoading] = useState(false);
  const [members, setMembers] = useState<MemberWithEmail[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);

  // Link tab
  const [inviteLink, setInviteLink] = useState('');
  const [linkLoading, setLinkLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    const handleClose = () => onClose();
    const handleBackdrop = (e: MouseEvent) => {
      if (e.target !== dialog) return;
      const r = dialog.getBoundingClientRect();
      if (!(r.top <= e.clientY && e.clientY <= r.bottom && r.left <= e.clientX && e.clientX <= r.right)) {
        dialog.close();
      }
    };
    dialog.addEventListener('close', handleClose);
    dialog.addEventListener('click', handleBackdrop);
    return () => { dialog.removeEventListener('close', handleClose); dialog.removeEventListener('click', handleBackdrop); };
  }, [onClose]);

  useEffect(() => {
    fetchMembers();
  }, []);

  const fetchMembers = async () => {
    try {
      setMembersLoading(true);
      const { data } = await supabase
        .from('project_members')
        .select('*')
        .eq('project_id', project.id);
      setMembers(data || []);
    } finally {
      setMembersLoading(false);
    }
  };

  const handleInviteByEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    try {
      setInviteLoading(true);

      // Find profile by email to get user_id
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, name')
        .eq('email', inviteEmail.trim())
        .single();

      if (!profileData) {
        toast.error('Nenhum usuário cadastrado com esse email.');
        return;
      }

      // Insert into project_members
      const { error: memberError } = await supabase
        .from('project_members')
        .insert({
          project_id: project.id,
          user_id: profileData.id,
          role: 'member',
          invited_by: currentUserId,
          status: 'pending',
        });

      if (memberError) {
        if (memberError.code === '23505') {
          toast.error('Esse usuário já foi convidado.');
        } else {
          throw memberError;
        }
        return;
      }

      // Create notification for the invited user
      await supabase.from('notifications').insert({
        user_id: profileData.id,
        type: 'project_invite',
        title: 'Você foi convidado para um projeto',
        body: `Convite para participar de "${project.name}"`,
        project_id: project.id,
      });

      toast.success(`Convite enviado para ${inviteEmail}.`);
      setInviteEmail('');
      fetchMembers();
    } catch (err: any) {
      console.error('Erro ao convidar:', err);
      toast.error('Não foi possível enviar o convite.');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleGenerateLink = async () => {
    try {
      setLinkLoading(true);
      const { data, error } = await supabase
        .from('project_invites')
        .insert({ project_id: project.id, created_by: currentUserId })
        .select()
        .single();

      if (error) throw error;
      const link = `${window.location.origin}/invite/${data.token}`;
      setInviteLink(link);
    } catch (err: any) {
      console.error('Erro ao gerar link:', err);
      toast.error('Não foi possível gerar o link.');
    } finally {
      setLinkLoading(false);
    }
  };

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    toast.success('Link copiado!');
    setTimeout(() => setCopied(false), 2000);
  };

  const statusLabel = (s: string) => s === 'accepted' ? 'Aceito' : 'Pendente';
  const statusColor = (s: string) => s === 'accepted' ? '#137333' : '#A38560';

  const tabStyle = (active: boolean): React.CSSProperties => ({
    flex: 1, padding: '0.5rem', border: 'none', borderRadius: '4px',
    cursor: 'pointer', fontFamily: 'Inter, sans-serif',
    fontSize: '0.875rem', fontWeight: active ? 600 : 400,
    backgroundColor: active ? '#FFFFFF' : 'transparent',
    color: active ? '#03110D' : '#888',
    boxShadow: active ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
    transition: 'all 0.15s',
  });

  return (
    <dialog ref={dialogRef} className="premium-modal" style={{ maxWidth: '480px', width: '95%' }}>
      <div className="modal-header">
        <h2 style={{ fontSize: '1.3rem', fontFamily: 'var(--font-serif)' }}>
          Compartilhar "{project.name}"
        </h2>
        <button className="modal-close" onClick={() => dialogRef.current?.close()}>×</button>
      </div>

      {/* Tab toggle */}
      <div style={{
        display: 'flex', backgroundColor: '#F5F5F5', borderRadius: '6px',
        padding: '3px', marginBottom: '1.5rem', gap: '3px',
      }}>
        <button style={tabStyle(tab === 'email')} onClick={() => setTab('email')}>Por email</button>
        <button style={tabStyle(tab === 'link')} onClick={() => setTab('link')}>Por link</button>
      </div>

      {tab === 'email' ? (
        <div>
          <form onSubmit={handleInviteByEmail} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
            <input
              type="email" required
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              placeholder="email@exemplo.com"
              autoFocus
              className="form-input"
              style={{ flex: 1, padding: '0.5rem 0.75rem', fontSize: '0.9rem' }}
            />
            <button
              type="submit"
              className="btn btn-primary"
              style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', textTransform: 'none', letterSpacing: 0 }}
              disabled={inviteLoading}
            >
              {inviteLoading ? '...' : 'Convidar'}
            </button>
          </form>

          <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#AAAAAA', marginBottom: '0.6rem' }}>
            Membros ({members.length})
          </div>
          {membersLoading ? (
            <p style={{ fontSize: '0.85rem', color: '#888', fontStyle: 'italic' }}>Carregando...</p>
          ) : members.length === 0 ? (
            <p style={{ fontSize: '0.85rem', color: '#888', fontStyle: 'italic' }}>Nenhum membro ainda.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '200px', overflowY: 'auto' }}>
              {members.map(m => (
                <div key={m.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '0.5rem 0.75rem', backgroundColor: '#F8F8F8', borderRadius: '4px',
                  fontSize: '0.85rem',
                }}>
                  <span style={{ color: '#242424' }}>{m.user_id.slice(0, 8)}…</span>
                  <span style={{ color: statusColor(m.status), fontWeight: 600, fontSize: '0.75rem' }}>
                    {statusLabel(m.status)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div>
          <p style={{ fontSize: '0.875rem', color: '#666', marginBottom: '1.25rem', lineHeight: 1.6 }}>
            Gere um link de convite com validade de 7 dias. Qualquer pessoa com o link poderá entrar no projeto.
          </p>

          {!inviteLink ? (
            <button
              className="btn btn-primary"
              style={{ width: '100%', textTransform: 'none', letterSpacing: 0 }}
              onClick={handleGenerateLink}
              disabled={linkLoading}
            >
              {linkLoading ? 'Gerando...' : 'Gerar link de convite'}
            </button>
          ) : (
            <div>
              <div style={{
                backgroundColor: '#F5F5F5', border: '1px solid #EAEAEA',
                borderRadius: '4px', padding: '0.75rem',
                fontSize: '0.82rem', color: '#242424',
                wordBreak: 'break-all', marginBottom: '0.75rem',
                fontFamily: 'monospace',
              }}>
                {inviteLink}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  className="btn btn-primary"
                  style={{ flex: 1, textTransform: 'none', letterSpacing: 0 }}
                  onClick={handleCopyLink}
                >
                  {copied ? 'Copiado!' : 'Copiar link'}
                </button>
                <button
                  className="btn btn-secondary"
                  style={{ flex: 1, textTransform: 'none', letterSpacing: 0 }}
                  onClick={() => setInviteLink('')}
                >
                  Novo link
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </dialog>
  );
};

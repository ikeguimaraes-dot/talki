import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../supabase';

interface InviteAcceptViewProps {
  token: string;
  user: User | null;
  onAccepted: () => void;
}

interface InviteData {
  id: string;
  project_id: string;
  expires_at: string;
  project: { name: string } | { name: string }[] | null;
}

const getProjectName = (project: InviteData['project']): string => {
  if (!project) return '';
  return Array.isArray(project) ? (project[0]?.name ?? '') : project.name;
};

export const InviteAcceptView: React.FC<InviteAcceptViewProps> = ({ token, user, onAccepted }) => {
  const [invite, setInvite] = useState<InviteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInvite = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .from('project_invites')
          .select('id, project_id, expires_at, project:projects(name)')
          .eq('token', token)
          .single();

        if (fetchError || !data) {
          setError('Convite não encontrado ou inválido.');
          return;
        }

        if (new Date(data.expires_at) < new Date()) {
          setError('Este link de convite expirou.');
          return;
        }

        setInvite(data as InviteData);
      } catch {
        setError('Erro ao carregar o convite.');
      } finally {
        setLoading(false);
      }
    };

    fetchInvite();
  }, [token]);

  const handleAccept = async () => {
    if (!user || !invite) return;
    try {
      setAccepting(true);

      const { error: insertError } = await supabase
        .from('project_members')
        .insert({
          project_id: invite.project_id,
          user_id: user.id,
          role: 'member',
          status: 'accepted',
        });

      if (insertError && insertError.code !== '23505') throw insertError;

      // If already exists (23505), update status to accepted
      if (insertError?.code === '23505') {
        await supabase
          .from('project_members')
          .update({ status: 'accepted' })
          .eq('project_id', invite.project_id)
          .eq('user_id', user.id);
      }

      toast.success(`Você entrou no projeto "${getProjectName(invite.project)}"!`);
      onAccepted();
    } catch (err: any) {
      console.error('Erro ao aceitar convite:', err);
      toast.error('Não foi possível entrar no projeto.');
    } finally {
      setAccepting(false);
    }
  };

  const cardStyle: React.CSSProperties = {
    backgroundColor: '#FFFFFF',
    borderRadius: '8px',
    padding: '2.5rem',
    width: '100%',
    maxWidth: '400px',
    boxShadow: '0 24px 48px rgba(0,0,0,0.5)',
    textAlign: 'center',
  };

  return (
    <div style={{
      minHeight: '100vh', backgroundColor: '#03110D',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem',
    }}>
      <div style={cardStyle}>
        <div style={{
          fontFamily: 'Playfair Display, Georgia, serif',
          fontSize: '1.75rem', fontWeight: 700, color: '#03110D',
          letterSpacing: '0.05em', marginBottom: '0.2rem',
        }}>
          CheckPlan
        </div>
        <div style={{ fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.15em', color: '#A38560', marginBottom: '2rem' }}>
          Gestão & Delegação
        </div>

        {loading ? (
          <p style={{ color: '#888', fontStyle: 'italic' }}>Validando convite...</p>
        ) : error ? (
          <>
            <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>⚠️</div>
            <p style={{ color: '#D83B01', fontWeight: 600, marginBottom: '1rem' }}>{error}</p>
            <a href="/" style={{ color: '#A38560', fontSize: '0.875rem' }}>Voltar para o início</a>
          </>
        ) : invite ? (
          <>
            <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>📋</div>
            <h2 style={{
              fontFamily: 'Playfair Display, Georgia, serif',
              fontSize: '1.25rem', color: '#03110D', marginBottom: '0.5rem',
            }}>
              Você foi convidado para
            </h2>
            <p style={{
              fontSize: '1.1rem', fontWeight: 700, color: '#242424',
              marginBottom: '1.5rem',
              backgroundColor: '#F5F5F5', borderRadius: '4px', padding: '0.5rem 1rem',
            }}>
              {getProjectName(invite.project)}
            </p>

            {!user ? (
              <>
                <p style={{ fontSize: '0.875rem', color: '#666', marginBottom: '1.25rem', lineHeight: 1.6 }}>
                  Faça login ou crie uma conta para aceitar o convite.
                </p>
                <a
                  href="/"
                  style={{
                    display: 'block', width: '100%', padding: '0.75rem',
                    backgroundColor: '#03110D', color: '#F4F1EA',
                    border: 'none', borderRadius: '4px',
                    fontSize: '0.95rem', fontWeight: 600,
                    textDecoration: 'none', textAlign: 'center',
                    boxSizing: 'border-box',
                  }}
                >
                  Entrar / Criar conta
                </a>
              </>
            ) : (
              <>
                <p style={{ fontSize: '0.875rem', color: '#666', marginBottom: '1.25rem' }}>
                  Logado como <strong>{user.email}</strong>
                </p>
                <button
                  onClick={handleAccept}
                  disabled={accepting}
                  style={{
                    width: '100%', padding: '0.75rem',
                    backgroundColor: '#03110D', color: '#F4F1EA',
                    border: 'none', borderRadius: '4px',
                    fontSize: '0.95rem', fontWeight: 600,
                    fontFamily: 'Inter, sans-serif',
                    cursor: accepting ? 'not-allowed' : 'pointer',
                    opacity: accepting ? 0.7 : 1,
                  }}
                >
                  {accepting ? 'Entrando...' : 'Entrar no projeto'}
                </button>
              </>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
};

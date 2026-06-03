import React from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../supabase';
import { toast } from 'sonner';

interface SidebarProps {
  activeView: 'dashboard' | 'project' | 'myTasks';
  onNavigateDashboard: () => void;
  onNavigateMyTasks: () => void;
  onCreatePlan: () => void;
  user: User;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  onNavigateDashboard,
  onNavigateMyTasks,
  onCreatePlan,
  user,
}) => {
  const isMeusPlanosActive = activeView === 'dashboard' || activeView === 'project';

  const displayName: string = user.user_metadata?.name || user.email || 'Usuário';
  const initials: string = displayName
    .split(' ')
    .map((p: string) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) toast.error('Erro ao sair.');
  };

  return (
    <aside className="sidebar" style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: 1 }}>
        <button className="sidebar-create-btn" onClick={onCreatePlan}>
          + Criar um plano
        </button>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem', marginBottom: '1rem' }}>
          <button
            className="sidebar-nav-item"
            disabled
            style={{ opacity: 0.4, cursor: 'default' }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5"/>
              <line x1="12" y1="1" x2="12" y2="3"/>
              <line x1="12" y1="21" x2="12" y2="23"/>
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
              <line x1="1" y1="12" x2="3" y2="12"/>
              <line x1="21" y1="12" x2="23" y2="12"/>
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
            </svg>
            Meu dia
          </button>

          <button
            className={`sidebar-nav-item${activeView === 'myTasks' ? ' active' : ''}`}
            onClick={onNavigateMyTasks}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 11l3 3L22 4"/>
              <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
            </svg>
            Minhas tarefas
          </button>

          <button
            className={`sidebar-nav-item${isMeusPlanosActive ? ' active' : ''}`}
            onClick={onNavigateDashboard}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7"/>
              <rect x="14" y="3" width="7" height="7"/>
              <rect x="14" y="14" width="7" height="7"/>
              <rect x="3" y="14" width="7" height="7"/>
            </svg>
            Meus planos
          </button>
        </nav>

        <div style={{ borderTop: '1px solid #EAEAEA', paddingTop: '0.75rem' }}>
          <p className="sidebar-section-title">Fixado</p>
          <p style={{ fontSize: '0.78rem', color: '#BBBBBB', padding: '0.2rem 0.75rem', fontStyle: 'italic' }}>
            Sem planos fixados
          </p>
        </div>
      </div>

      {/* User profile footer */}
      <div style={{
        borderTop: '1px solid #EAEAEA',
        paddingTop: '0.75rem',
        marginTop: '0.5rem',
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.6rem',
          padding: '0.4rem 0.75rem',
        }}>
          <div style={{
            width: '30px', height: '30px', borderRadius: '50%',
            backgroundColor: '#03110D', color: '#F4F1EA',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.62rem', fontWeight: 700, flexShrink: 0,
          }}>
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: '0.82rem', fontWeight: 600,
              color: '#242424', overflow: 'hidden',
              textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {displayName}
            </div>
            <div style={{
              fontSize: '0.7rem', color: '#888',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {user.email}
            </div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="sidebar-nav-item"
          style={{ color: '#D83B01', marginTop: '0.1rem' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          Sair
        </button>
      </div>
    </aside>
  );
};

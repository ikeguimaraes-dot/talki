import React from 'react';

interface SidebarProps {
  activeView: 'dashboard' | 'project' | 'myTasks';
  onNavigateDashboard: () => void;
  onNavigateMyTasks: () => void;
  onCreatePlan: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  onNavigateDashboard,
  onNavigateMyTasks,
  onCreatePlan,
}) => {
  const isMeusPlanosActive = activeView === 'dashboard' || activeView === 'project';

  return (
    <aside className="sidebar">
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
    </aside>
  );
};

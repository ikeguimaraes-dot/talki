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
      <button
        className="btn btn-primary"
        style={{
          width: '100%',
          fontSize: '0.82rem',
          padding: '0.6rem 0.75rem',
          textTransform: 'none',
          letterSpacing: 0,
          justifyContent: 'center',
          marginBottom: '0.75rem',
        }}
        onClick={onCreatePlan}
      >
        + Criar um plano
      </button>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
        <button
          className={`sidebar-nav-item${activeView === 'myTasks' ? ' active' : ''}`}
          onClick={onNavigateMyTasks}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 11l3 3L22 4" />
            <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
          </svg>
          Minhas tarefas
        </button>
        <button
          className={`sidebar-nav-item${isMeusPlanosActive ? ' active' : ''}`}
          onClick={onNavigateDashboard}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="14" y="14" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
          </svg>
          Meus planos
        </button>
      </nav>
    </aside>
  );
};

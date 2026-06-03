import { useState, useEffect } from 'react';
import type { User } from '@supabase/supabase-js';
import { Toaster } from 'sonner';
import { supabase } from './supabase';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { CreatePlanModal } from './components/CreatePlanModal';
import { NotificationsPanel } from './components/NotificationsPanel';
import { DashboardView } from './views/DashboardView';
import { ProjectDetailView } from './views/ProjectDetailView';
import { MyTasksView } from './views/MyTasksView';
import { AuthView } from './views/AuthView';
import { InviteAcceptView } from './views/InviteAcceptView';
import type { Project } from './types';

const getInviteToken = (): string | null => {
  const match = window.location.pathname.match(/^\/invite\/(.+)$/);
  return match ? match[1] : null;
};

const toasterStyle = {
  background: '#0F1F1A',
  border: '1px solid rgba(163, 133, 96, 0.3)',
  color: '#F4F1EA',
  fontFamily: 'Inter, sans-serif',
  fontSize: '0.85rem',
};

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [view, setView] = useState<'dashboard' | 'project' | 'myTasks'>('dashboard');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [showSidebarCreateModal, setShowSidebarCreateModal] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const inviteToken = getInviteToken();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSelectProject = (projectId: string) => {
    setSelectedProjectId(projectId);
    setView('project');
  };

  const handleNavigateHome = () => {
    setSelectedProjectId(null);
    setView('dashboard');
  };

  const handleSidebarPlanCreated = (project: Project) => {
    setShowSidebarCreateModal(false);
    handleSelectProject(project.id);
  };

  if (authLoading) {
    return (
      <div style={{
        minHeight: '100vh', backgroundColor: '#03110D',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          fontFamily: 'Playfair Display, Georgia, serif',
          fontSize: '1.25rem', color: '#A38560', fontStyle: 'italic',
        }}>
          CheckPlan...
        </div>
      </div>
    );
  }

  // Handle /invite/[token] route — accessible before login
  if (inviteToken) {
    return (
      <>
        <Toaster position="bottom-right" toastOptions={{ style: toasterStyle }} />
        <InviteAcceptView
          token={inviteToken}
          user={user}
          onAccepted={() => {
            window.history.pushState({}, '', '/');
            handleNavigateHome();
          }}
        />
      </>
    );
  }

  if (!user) {
    return (
      <>
        <Toaster position="bottom-right" toastOptions={{ style: toasterStyle }} />
        <AuthView />
      </>
    );
  }

  return (
    <div className="app-container">
      <Toaster position="bottom-right" toastOptions={{ style: toasterStyle }} />
      <Header
        onNavigateHome={handleNavigateHome}
        user={user}
        onNotifClick={() => setNotifOpen(prev => !prev)}
      />
      <div className="app-body">
        <Sidebar
          activeView={view}
          onNavigateDashboard={handleNavigateHome}
          onNavigateMyTasks={() => setView('myTasks')}
          onCreatePlan={() => setShowSidebarCreateModal(true)}
          user={user}
        />
        <main className="main-content">
          {view === 'dashboard' ? (
            <DashboardView onSelectProject={handleSelectProject} currentUser={user} />
          ) : view === 'myTasks' ? (
            <MyTasksView />
          ) : (
            selectedProjectId && (
              <ProjectDetailView
                projectId={selectedProjectId}
                onNavigateHome={handleNavigateHome}
                currentUser={user}
              />
            )
          )}
        </main>

        {notifOpen && (
          <NotificationsPanel
            userId={user.id}
            onClose={() => setNotifOpen(false)}
          />
        )}
      </div>

      {showSidebarCreateModal && (
        <CreatePlanModal
          onCreated={(project) => handleSidebarPlanCreated(project)}
          onClose={() => setShowSidebarCreateModal(false)}
          currentUserId={user.id}
        />
      )}
    </div>
  );
}

export default App;

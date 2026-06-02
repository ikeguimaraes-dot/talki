import { useState } from 'react';
import { Toaster } from 'sonner';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { CreatePlanModal } from './components/CreatePlanModal';
import { DashboardView } from './views/DashboardView';
import { ProjectDetailView } from './views/ProjectDetailView';
import { MyTasksView } from './views/MyTasksView';
import type { Project } from './types';

function App() {
  const [view, setView] = useState<'dashboard' | 'project' | 'myTasks'>('dashboard');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [showSidebarCreateModal, setShowSidebarCreateModal] = useState(false);

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

  return (
    <div className="app-container">
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#0F1F1A',
            border: '1px solid rgba(163, 133, 96, 0.3)',
            color: '#F4F1EA',
            fontFamily: 'Inter, sans-serif',
            fontSize: '0.85rem',
          },
        }}
      />
      <Header onNavigateHome={handleNavigateHome} />
      <div className="app-body">
        <Sidebar
          activeView={view}
          onNavigateDashboard={handleNavigateHome}
          onNavigateMyTasks={() => setView('myTasks')}
          onCreatePlan={() => setShowSidebarCreateModal(true)}
        />
        <main className="main-content">
          {view === 'dashboard' ? (
            <DashboardView onSelectProject={handleSelectProject} />
          ) : view === 'myTasks' ? (
            <MyTasksView />
          ) : (
            selectedProjectId && (
              <ProjectDetailView
                projectId={selectedProjectId}
                onNavigateHome={handleNavigateHome}
              />
            )
          )}
        </main>
      </div>

      {showSidebarCreateModal && (
        <CreatePlanModal
          onCreated={(project) => handleSidebarPlanCreated(project)}
          onClose={() => setShowSidebarCreateModal(false)}
        />
      )}
    </div>
  );
}

export default App;

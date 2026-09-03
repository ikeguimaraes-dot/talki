import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from 'sonner';
import { ProtectedLayout } from '@/components/layout/protected-layout';
import { PublicOnlyRoute } from '@/components/layout/public-only-route';
import { LoginPage } from '@/pages/login-page';
import { ConvitePage } from '@/pages/convite-page';
import { HomePage } from '@/pages/home-page';
import { TarefasPage } from '@/pages/tarefas-page';
import { PlanPage } from '@/pages/plan-page';
import { MensagensPage } from '@/pages/mensagens-page';
import { ComunicadosPage } from '@/pages/comunicados-page';

const toasterStyle = {
  background: '#1B1712',
  border: '1px solid rgba(201, 161, 90, 0.3)',
  color: '#EFE9DF',
  fontFamily: 'Inter, sans-serif',
  fontSize: '0.85rem',
};

function App() {
  return (
    <BrowserRouter>
      <Toaster position="bottom-right" toastOptions={{ style: toasterStyle }} />
      <Routes>
        <Route path="/convite/:token" element={<ConvitePage />} />
        <Route
          path="/login"
          element={
            <PublicOnlyRoute>
              <LoginPage />
            </PublicOnlyRoute>
          }
        />

        <Route element={<ProtectedLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/tarefas" element={<TarefasPage />} />
          <Route path="/tarefas/:planId" element={<PlanPage />} />
          <Route path="/mensagens" element={<MensagensPage />} />
          <Route path="/comunicados" element={<ComunicadosPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;

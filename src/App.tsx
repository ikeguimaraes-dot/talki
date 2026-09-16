import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from 'sonner';
import { ProtectedLayout } from '@/components/layout/protected-layout';
import { PublicOnlyRoute } from '@/components/layout/public-only-route';
import { LoginPage } from '@/pages/login-page';
import { ConvitePage } from '@/pages/convite-page';
import { HomePage } from '@/pages/home-page';
import { TarefasPage } from '@/pages/tarefas-page';
import { PlanPage } from '@/pages/plan-page';
import { MarcacoesPage } from '@/pages/marcacoes-page';
import { EtiquetasPage } from '@/pages/etiquetas-page';
import { ConcluidasPage } from '@/pages/concluidas-page';
import { ComunicadosPage } from '@/pages/comunicados-page';


const JornadaPage = lazy(() => import('@/pages/jornada-page').then(m => ({ default: m.JornadaPage })));
const JornadaPerfilPage = lazy(() => import('@/pages/jornada-perfil-page').then(m => ({ default: m.JornadaPerfilPage })));
const JornadaRelatoriosPage = lazy(() => import('@/pages/jornada-relatorios-page').then(m => ({ default: m.JornadaRelatoriosPage })));
const JornadaAdminPage = lazy(() => import('@/pages/jornada-admin-page').then(m => ({ default: m.JornadaAdminPage })));
const RecoveryPage = lazy(() => import('@/pages/recovery-page').then(m => ({ default: m.RecoveryPage })));

const toasterStyle = {
  background: 'rgba(20, 22, 32, 0.92)',
  border: '1px solid rgba(255, 255, 255, 0.11)',
  color: '#F4F5FB',
  backdropFilter: 'blur(20px)',
  borderRadius: '14px',
  boxShadow: '0 20px 60px rgba(0, 0, 0, 0.35)',
  fontFamily: 'Inter, sans-serif',
  fontSize: '0.85rem',
};

function App() {
  return (
    <BrowserRouter>
      <Toaster position="bottom-right" toastOptions={{ style: toasterStyle }} />
      <Suspense fallback={<div className="p-8 text-muted-foreground">Carregando…</div>}><Routes>
        <Route path="/recuperar-senha" element={<RecoveryPage />} />
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
          <Route path="/jornada" element={<JornadaPage />} />
          <Route path="/registro" element={<Navigate to="/jornada" replace />} />
          <Route path="/perfil" element={<JornadaPerfilPage />} />
          <Route path="/gestao" element={<JornadaRelatoriosPage dashboard />} />
          <Route path="/relatorios" element={<JornadaRelatoriosPage />} />
          <Route path="/gestao/:cadastro" element={<JornadaAdminPage />} />
          <Route path="/admin" element={<Navigate to="/gestao" replace />} />
          <Route path="/tarefas" element={<TarefasPage />} />
          <Route path="/tarefas/:planId" element={<PlanPage />} />
          <Route path="/marcacoes" element={<MarcacoesPage />} />
          <Route path="/etiquetas" element={<EtiquetasPage />} />
          <Route path="/concluidas" element={<ConcluidasPage />} />
          <Route path="/mensagens" element={<Navigate to="/" replace />} />
          <Route path="/comunicados" element={<ComunicadosPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes></Suspense>
    </BrowserRouter>
  );
}

export default App;

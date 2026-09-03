import { Navigate } from 'react-router-dom';
import { useSession } from '@/hooks/use-session';
import { FullScreenLoading } from '@/components/state/full-screen-loading';
import { AppShell } from '@/components/layout/app-shell';

export function ProtectedLayout() {
  const { user, loading } = useSession();

  if (loading) return <FullScreenLoading />;
  if (!user) return <Navigate to="/login" replace />;

  return <AppShell user={user} />;
}

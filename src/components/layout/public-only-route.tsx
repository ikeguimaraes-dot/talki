import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useSession } from '@/hooks/use-session';
import { FullScreenLoading } from '@/components/state/full-screen-loading';

export function PublicOnlyRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useSession();

  if (loading) return <FullScreenLoading />;
  if (user) return <Navigate to="/" replace />;

  return <>{children}</>;
}

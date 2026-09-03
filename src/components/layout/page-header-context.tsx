import { useState, type ReactNode } from 'react';
import { PageHeaderContext, type PageHeaderState } from '@/lib/page-header-store';

export function PageHeaderProvider({ children }: { children: ReactNode }) {
  const [header, setHeader] = useState<PageHeaderState>({ title: '' });
  const [actions, setActions] = useState<ReactNode>(null);

  return (
    <PageHeaderContext.Provider value={{ header, setHeader, actions, setActions }}>
      {children}
    </PageHeaderContext.Provider>
  );
}

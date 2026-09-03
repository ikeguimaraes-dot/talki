import { useContext, useEffect, type ReactNode } from 'react';
import { PageHeaderContext, type PageHeaderState } from '@/lib/page-header-store';

export function usePageHeaderContext() {
  const ctx = useContext(PageHeaderContext);
  if (!ctx) throw new Error('usePageHeaderContext deve ser usado dentro de PageHeaderProvider');
  return ctx;
}

// `actions` is a useEffect dependency below — pass a `useMemo`-wrapped
// element (or a stable reference), never an inline JSX literal, or every
// render will re-trigger the effect and loop.
export function usePageHeader(header: PageHeaderState, actions?: ReactNode) {
  const { setHeader, setActions } = usePageHeaderContext();
  const breadcrumbKey = header.breadcrumb?.map(b => b.label).join('>') ?? '';

  useEffect(() => {
    setHeader(header);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [header.title, breadcrumbKey]);

  useEffect(() => {
    setActions(actions ?? null);
    return () => setActions(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [actions]);
}

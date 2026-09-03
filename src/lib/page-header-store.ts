import { createContext, type ReactNode } from 'react';

export interface Breadcrumb {
  label: string;
  href?: string;
}

export interface PageHeaderState {
  title: string;
  breadcrumb?: Breadcrumb[];
}

export interface PageHeaderContextValue {
  header: PageHeaderState;
  setHeader: (header: PageHeaderState) => void;
  actions: ReactNode;
  setActions: (actions: ReactNode) => void;
}

export const PageHeaderContext = createContext<PageHeaderContextValue | null>(null);

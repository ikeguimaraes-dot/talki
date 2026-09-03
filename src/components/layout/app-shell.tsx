import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import type { User } from '@supabase/supabase-js';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { SidebarNav } from '@/components/layout/sidebar-nav';
import { AppTopbar } from '@/components/layout/app-topbar';
import { CommandPalette } from '@/components/layout/command-palette';
import { PageHeaderProvider } from '@/components/layout/page-header-context';

const COLLAPSE_STORAGE_KEY = 'talki:sidebar-collapsed';

export function AppShell({ user }: { user: User }) {
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSE_STORAGE_KEY) === '1');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);

  const toggleCollapsed = () => {
    setCollapsed(prev => {
      const next = !prev;
      localStorage.setItem(COLLAPSE_STORAGE_KEY, next ? '1' : '0');
      return next;
    });
  };

  return (
    <PageHeaderProvider>
      <div className="flex h-screen overflow-hidden bg-background">
        <aside
          className={cn(
            'hidden shrink-0 bg-sidebar text-sidebar-foreground transition-all duration-200 ease-out lg:flex',
            collapsed ? 'w-16' : 'w-60'
          )}
        >
          <SidebarNav user={user} collapsed={collapsed} onToggleCollapsed={toggleCollapsed} />
        </aside>

        <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <SheetContent side="left" className="w-64 bg-sidebar p-0 text-sidebar-foreground [&_svg]:text-current">
            <SheetTitle className="sr-only">Menu</SheetTitle>
            <SidebarNav user={user} onNavigate={() => setMobileNavOpen(false)} />
          </SheetContent>
        </Sheet>

        <div className="flex min-w-0 flex-1 flex-col">
          <AppTopbar onOpenMobileNav={() => setMobileNavOpen(true)} onOpenCommandPalette={() => setCommandOpen(true)} />
          <main className="flex-1 overflow-y-auto p-4 sm:p-6">
            <Outlet context={user} />
          </main>
        </div>
      </div>

      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} user={user} />
    </PageHeaderProvider>
  );
}

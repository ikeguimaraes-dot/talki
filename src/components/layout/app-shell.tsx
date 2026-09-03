import { useEffect, useState } from 'react';
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
  const [theme, setTheme] = useState<'dark' | 'light'>(() => (localStorage.getItem('talki:theme') as 'dark' | 'light') || 'dark');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);

  const toggleCollapsed = () => {
    setCollapsed(prev => {
      const next = !prev;
      localStorage.setItem(COLLAPSE_STORAGE_KEY, next ? '1' : '0');
      return next;
    });
  };

  const toggleTheme = () => {
    setTheme(current => {
      const next = current === 'dark' ? 'light' : 'dark';
      localStorage.setItem('talki:theme', next);
      document.documentElement.classList.remove('dark', 'light');
      document.documentElement.classList.add(next);
      return next;
    });
  };

  useEffect(() => {
    document.documentElement.classList.remove('dark', 'light');
    document.documentElement.classList.add(theme);
  }, [theme]);

  return (
    <PageHeaderProvider>
      <div className="app-canvas flex h-screen overflow-hidden p-2 sm:p-3">
        <aside
          className={cn(
            'glass-panel hidden shrink-0 overflow-hidden rounded-[22px] bg-sidebar text-sidebar-foreground transition-[width] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] lg:flex',
            collapsed ? 'w-[72px]' : 'w-[258px]'
          )}
        >
          <SidebarNav user={user} collapsed={collapsed} onToggleCollapsed={toggleCollapsed} />
        </aside>

        <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <SheetContent side="left" className="w-[280px] border-r-white/10 bg-sidebar/95 p-2 text-sidebar-foreground backdrop-blur-2xl [&_svg]:text-current">
            <SheetTitle className="sr-only">Menu</SheetTitle>
            <SidebarNav user={user} onNavigate={() => setMobileNavOpen(false)} />
          </SheetContent>
        </Sheet>

        <div className="flex min-w-0 flex-1 flex-col lg:pl-3">
          <AppTopbar
            theme={theme}
            onToggleTheme={toggleTheme}
            onOpenMobileNav={() => setMobileNavOpen(true)}
            onOpenCommandPalette={() => setCommandOpen(true)}
          />
          <main className="flex-1 overflow-y-auto px-2 pb-3 pt-5 sm:px-5 sm:pb-5 sm:pt-7 xl:px-8">
            <div className="mx-auto w-full max-w-[1560px] animate-enter">
              <Outlet context={user} />
            </div>
          </main>
        </div>
      </div>

      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} user={user} />
    </PageHeaderProvider>
  );
}

import { NavLink } from 'react-router-dom';
import type { User } from '@supabase/supabase-js';
import { LogOut, User as UserIcon, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { toast } from 'sonner';
import { cn, getInitials } from '@/lib/utils';
import { supabase } from '@/supabase';
import { NAV_ITEMS } from '@/components/layout/nav-items';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface SidebarNavProps {
  user: User;
  collapsed?: boolean;
  onNavigate?: () => void;
  onToggleCollapsed?: () => void;
}

export function SidebarNav({ user, collapsed = false, onNavigate, onToggleCollapsed }: SidebarNavProps) {
  const displayName = user.user_metadata?.name || user.email || 'Usuário';
  const initials = getInitials(displayName);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) toast.error('Erro ao sair.');
  };

  return (
    <div className="flex h-full flex-col">
      <div className={cn('flex h-14 shrink-0 items-center border-b border-sidebar-border', collapsed ? 'justify-center px-0' : 'justify-between px-4')}>
        {!collapsed && (
          <span className="font-heading text-lg font-semibold text-sidebar-foreground">Talki</span>
        )}
        {onToggleCollapsed && (
          <button
            onClick={onToggleCollapsed}
            className="hidden rounded-md p-1.5 text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground lg:flex"
            aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
          >
            {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
          </button>
        )}
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
        {NAV_ITEMS.map(({ label, href, icon: Icon }) => (
          <NavLink
            key={href}
            to={href}
            end={href === '/'}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors duration-150',
                collapsed && 'justify-center px-0',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-foreground'
                  : 'text-sidebar-foreground/65 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground'
              )
            }
            title={collapsed ? label : undefined}
          >
            <Icon className="size-4 shrink-0" />
            {!collapsed && label}
          </NavLink>
        ))}
      </nav>

      <div className="shrink-0 border-t border-sidebar-border p-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                'flex w-full items-center gap-2.5 rounded-md p-1.5 text-left transition-colors duration-150 hover:bg-sidebar-accent',
                collapsed && 'justify-center'
              )}
            >
              <Avatar className="size-7 shrink-0">
                <AvatarFallback className="bg-sidebar-primary text-xs font-semibold text-sidebar-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              {!collapsed && (
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-sidebar-foreground">{displayName}</p>
                  <p className="truncate text-xs text-sidebar-foreground/50">{user.email}</p>
                </div>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" className="w-56">
            <DropdownMenuItem disabled>
              <UserIcon />
              Perfil
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={handleLogout}>
              <LogOut />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

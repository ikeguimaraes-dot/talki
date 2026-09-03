import { NavLink } from 'react-router-dom';
import type { User } from '@supabase/supabase-js';
import { CheckCircle2, ChevronsUpDown, CirclePlus, LogOut, PanelLeftClose, PanelLeftOpen, Sparkles, Tag, User as UserIcon } from 'lucide-react';
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
    <div className="flex h-full flex-col p-2">
      <div className={cn('flex h-[58px] shrink-0 items-center', collapsed ? 'justify-center px-0' : 'justify-between px-2')}>
        {!collapsed && (
          <div className="flex items-center gap-2.5">
            <span className="relative flex size-8 items-center justify-center rounded-[11px] bg-gradient-to-br from-[#9a8cff] via-[#7462ff] to-[#478aff] text-white shadow-[0_0_28px_rgba(124,108,255,0.36)]">
              <Sparkles className="size-4" />
              <span className="absolute inset-px rounded-[10px] border border-white/25" />
            </span>
            <span className="font-heading text-lg font-bold tracking-[-0.045em] text-sidebar-foreground">talki</span>
          </div>
        )}
        {onToggleCollapsed && (
          <button
            onClick={onToggleCollapsed}
            className="hidden rounded-lg p-2 text-sidebar-foreground/45 transition-all hover:bg-sidebar-accent hover:text-sidebar-foreground lg:flex"
            aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
          >
            {collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}
          </button>
        )}
      </div>

      {!collapsed && (
        <NavLink to="/tarefas" className="mx-1 mb-5 mt-2 flex h-10 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#7968ff] to-[#5d8dff] text-sm font-semibold text-white shadow-[0_10px_28px_rgba(99,78,255,0.28)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_34px_rgba(99,78,255,0.38)]">
          <CirclePlus className="size-4" /> Capturar tarefa
        </NavLink>
      )}

      <nav className="flex-1 space-y-1 overflow-y-auto px-1">
        {!collapsed && <p className="eyebrow mb-2 px-2.5">Planejar</p>}
        {NAV_ITEMS.map(({ label, href, icon: Icon }) => (
          <NavLink
            key={href}
            to={href}
            end={href === '/'}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-all duration-300',
                collapsed && 'justify-center px-0',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'
                  : 'text-sidebar-foreground/55 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground'
              )
            }
            title={collapsed ? label : undefined}
          >
            <Icon className="size-[17px] shrink-0 transition-transform duration-300 group-hover:scale-105" />
            {!collapsed && label}
          </NavLink>
        ))}
        {!collapsed && (
          <div className="mt-6 space-y-1">
            <p className="eyebrow mb-2 px-2.5">Perspectivas</p>
            <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-medium text-sidebar-foreground/45 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-foreground">
              <Tag className="size-4" /> Etiquetas
            </button>
            <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-medium text-sidebar-foreground/45 transition-colors hover:bg-sidebar-accent/60 hover:text-sidebar-foreground">
              <CheckCircle2 className="size-4" /> Concluídas
            </button>
          </div>
        )}
      </nav>

      <div className="shrink-0 border-t border-sidebar-border pt-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className={cn(
                'flex w-full items-center gap-2.5 rounded-xl p-2 text-left transition-colors duration-200 hover:bg-sidebar-accent',
                collapsed && 'justify-center'
              )}
            >
              <Avatar className="size-8 shrink-0 border border-white/10">
                <AvatarFallback className="bg-gradient-to-br from-primary to-[#438df7] text-xs font-semibold text-white">
                  {initials}
                </AvatarFallback>
              </Avatar>
              {!collapsed && (
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-sidebar-foreground">{displayName}</p>
                  <p className="truncate text-xs text-sidebar-foreground/50">{user.email}</p>
                </div>
              )}
              {!collapsed && <ChevronsUpDown className="size-3.5 text-sidebar-foreground/35" />}
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

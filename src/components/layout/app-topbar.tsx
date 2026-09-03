import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Menu, Moon, Search, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePageHeaderContext } from '@/hooks/use-page-header';

interface AppTopbarProps {
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onOpenMobileNav: () => void;
  onOpenCommandPalette: () => void;
}

export function AppTopbar({ theme, onToggleTheme, onOpenMobileNav, onOpenCommandPalette }: AppTopbarProps) {
  const { header, actions } = usePageHeaderContext();

  return (
    <header className="glass-soft flex h-[62px] shrink-0 items-center gap-3 rounded-[18px] px-3 sm:px-5">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onOpenMobileNav}
        aria-label="Abrir menu"
      >
        <Menu />
      </Button>

      <div className="flex min-w-0 flex-1 items-center gap-1.5">
        {header.breadcrumb?.map((crumb, i) => (
          <Fragment key={`${crumb.label}-${i}`}>
            {crumb.href ? (
              <Link to={crumb.href} className="text-sm text-muted-foreground hover:text-foreground">
                {crumb.label}
              </Link>
            ) : (
              <span className="text-sm text-muted-foreground">{crumb.label}</span>
            )}
            <ChevronRight className="size-3.5 text-muted-foreground/50" />
          </Fragment>
        ))}
        <h1 className="truncate font-heading text-[17px] font-semibold tracking-[-0.03em] text-foreground">{header.title}</h1>
      </div>

      <button
        onClick={onOpenCommandPalette}
        className="hidden h-9 items-center gap-2 rounded-xl border border-border bg-muted/60 px-3 text-sm text-muted-foreground transition-all duration-300 hover:border-primary/30 hover:bg-accent hover:text-foreground sm:flex"
      >
        <Search className="size-3.5" />
        Buscar
        <kbd className="ml-3 rounded-md border border-border bg-background/60 px-1.5 py-0.5 text-[10px] font-medium">
          ⌘K
        </kbd>
      </button>
      <Button variant="ghost" size="icon" className="sm:hidden" onClick={onOpenCommandPalette} aria-label="Buscar">
        <Search />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="rounded-xl text-muted-foreground hover:bg-accent hover:text-foreground"
        onClick={onToggleTheme}
        aria-label={theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro'}
      >
        {theme === 'dark' ? <Sun className="size-[17px]" /> : <Moon className="size-[17px]" />}
      </Button>

      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  );
}

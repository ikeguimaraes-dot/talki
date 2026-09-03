import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Menu, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePageHeaderContext } from '@/hooks/use-page-header';

interface AppTopbarProps {
  onOpenMobileNav: () => void;
  onOpenCommandPalette: () => void;
}

export function AppTopbar({ onOpenMobileNav, onOpenCommandPalette }: AppTopbarProps) {
  const { header, actions } = usePageHeaderContext();

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border bg-background px-4 sm:px-6">
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
        <h1 className="truncate font-heading text-xl font-semibold text-foreground">{header.title}</h1>
      </div>

      <button
        onClick={onOpenCommandPalette}
        className="hidden items-center gap-2 rounded-md border border-border bg-muted/50 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted sm:flex"
      >
        <Search className="size-3.5" />
        Buscar
        <kbd className="ml-2 rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium">
          ⌘K
        </kbd>
      </button>
      <Button variant="ghost" size="icon" className="sm:hidden" onClick={onOpenCommandPalette} aria-label="Buscar">
        <Search />
      </Button>

      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  );
}

import { useEffect, useState, type FormEvent } from 'react';
import { ExternalLink, Link2, LoaderCircle, MessageCircleMore, RefreshCw, Server, ShieldCheck, Sparkles } from 'lucide-react';
import { usePageHeader } from '@/hooks/use-page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

const MATTERMOST_URL_KEY = 'talki:mattermost-url';
const environmentUrl = ((import.meta.env.VITE_MATTERMOST_URL as string | undefined) ?? '').trim();

function normalizeMattermostUrl(value: string) {
  const candidate = value.trim();
  if (!candidate) return '';

  try {
    const parsed = new URL(candidate);
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password) return '';
    return parsed.toString();
  } catch {
    return '';
  }
}

function getInitialMattermostUrl() {
  const fromEnvironment = normalizeMattermostUrl(environmentUrl);
  if (fromEnvironment) return fromEnvironment;
  return normalizeMattermostUrl(localStorage.getItem(MATTERMOST_URL_KEY) ?? '');
}

function MattermostSkeleton({ slow }: { slow: boolean }) {
  return (
    <div className="absolute inset-0 z-10 flex bg-[#0e1017] transition-opacity duration-500" aria-live="polite" aria-label="Carregando Mattermost">
      <aside className="hidden w-[218px] shrink-0 border-r border-white/[0.06] p-4 sm:block">
        <div className="flex items-center gap-3 border-b border-white/[0.06] pb-4">
          <Skeleton className="size-8 rounded-xl bg-white/[0.08]" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-24 bg-white/[0.08]" />
            <Skeleton className="h-2 w-16 bg-white/[0.05]" />
          </div>
        </div>
        <div className="mt-5 space-y-2.5">
          <Skeleton className="h-7 w-full rounded-lg bg-primary/10" />
          {[82, 68, 91, 61, 76, 56].map(width => <Skeleton key={width} className="h-3 bg-white/[0.055]" style={{ width: `${width}%` }} />)}
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <div className="flex h-14 items-center justify-between border-b border-white/[0.06] px-5">
          <div className="space-y-2"><Skeleton className="h-3 w-32 bg-white/[0.08]" /><Skeleton className="h-2 w-48 bg-white/[0.05]" /></div>
          <Skeleton className="size-8 rounded-xl bg-white/[0.06]" />
        </div>
        <div className="mx-auto flex h-[calc(100%-3.5rem)] max-w-3xl flex-col justify-end p-5 sm:p-8">
          <div className="mb-auto flex items-center justify-center pt-12">
            <div className="flex flex-col items-center gap-3 text-center">
              <span className="flex size-11 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                <LoaderCircle className="size-5 animate-spin" />
              </span>
              <p className="text-sm font-medium text-white/80">Abrindo seu workspace</p>
              <p className="max-w-xs text-xs leading-5 text-white/35">{slow ? 'O servidor está demorando um pouco para responder…' : 'Conectando canais, conversas e pessoas.'}</p>
            </div>
          </div>
          <div className="space-y-5">
            {[72, 58, 84].map((width, index) => (
              <div key={width} className={cn('flex gap-3', index === 1 && 'pl-8')}>
                <Skeleton className="size-8 shrink-0 rounded-full bg-white/[0.07]" />
                <div className="flex-1 space-y-2 pt-1">
                  <Skeleton className="h-2.5 w-24 bg-white/[0.07]" />
                  <Skeleton className="h-3 bg-white/[0.055]" style={{ width: `${width}%` }} />
                </div>
              </div>
            ))}
            <Skeleton className="h-11 w-full rounded-xl bg-white/[0.065]" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function MensagensPage() {
  const [mattermostUrl, setMattermostUrl] = useState(getInitialMattermostUrl);
  const [urlDraft, setUrlDraft] = useState(mattermostUrl);
  const [urlError, setUrlError] = useState('');
  const [loading, setLoading] = useState(Boolean(mattermostUrl));
  const [slow, setSlow] = useState(false);
  const [failed, setFailed] = useState(false);
  const [frameKey, setFrameKey] = useState(0);

  usePageHeader({ title: 'Mensagens' });

  useEffect(() => {
    if (!loading) return;
    const timer = window.setTimeout(() => setSlow(true), 12000);
    return () => window.clearTimeout(timer);
  }, [loading, frameKey]);

  const reload = () => {
    setFailed(false);
    setSlow(false);
    setLoading(true);
    setFrameKey(current => current + 1);
  };

  const saveUrl = (event: FormEvent) => {
    event.preventDefault();
    const nextUrl = normalizeMattermostUrl(urlDraft);
    if (!nextUrl) {
      setUrlError('Digite uma URL completa, começando com https://');
      return;
    }

    localStorage.setItem(MATTERMOST_URL_KEY, nextUrl);
    setMattermostUrl(nextUrl);
    setUrlDraft(nextUrl);
    setUrlError('');
    setFailed(false);
    setSlow(false);
    setLoading(true);
    setFrameKey(current => current + 1);
  };

  if (!mattermostUrl) {
    return (
      <div className="flex min-h-[calc(100vh-150px)] items-center justify-center pb-6">
        <section className="glass-panel relative w-full max-w-3xl overflow-hidden rounded-[26px] p-6 sm:p-9">
          <div className="absolute -right-20 -top-24 size-64 rounded-full bg-primary/15 blur-3xl" />
          <div className="relative grid gap-8 md:grid-cols-[1fr_0.9fr] md:items-center">
            <div>
              <span className="mb-6 flex size-12 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
                <MessageCircleMore className="size-5" />
              </span>
              <p className="eyebrow mb-3 flex items-center gap-2"><Sparkles className="size-3 text-primary" /> Colaboração integrada</p>
              <h2 className="gradient-text text-3xl font-semibold leading-[1.08] tracking-[-0.055em] sm:text-4xl">Seu time conversa aqui.</h2>
              <p className="mt-4 max-w-md text-sm leading-6 text-muted-foreground">Conecte o Mattermost uma vez e mantenha canais, mensagens e decisões dentro do fluxo do Talki.</p>
              <div className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
                <ShieldCheck className="size-4 text-[#3ddcaa]" /> A URL fica salva somente neste dispositivo.
              </div>
            </div>

            <form onSubmit={saveUrl} className="rounded-[20px] border border-border bg-muted/35 p-5 shadow-[inset_0_1px_0_var(--glass-highlight)]">
              <div className="flex items-center gap-2 text-sm font-semibold"><Server className="size-4 text-primary" /> Conectar workspace</div>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">Use a URL completa da sua instância ou de um canal específico.</p>
              <label htmlFor="mattermost-url" className="mt-5 block text-[11px] font-semibold text-muted-foreground">URL do Mattermost</label>
              <div className="relative mt-2">
                <Link2 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="mattermost-url"
                  type="url"
                  value={urlDraft}
                  onChange={event => { setUrlDraft(event.target.value); setUrlError(''); }}
                  placeholder="https://chat.suaempresa.com"
                  className="h-11 rounded-xl bg-background/45 pl-9"
                  aria-invalid={Boolean(urlError)}
                  aria-describedby={urlError ? 'mattermost-url-error' : undefined}
                  autoFocus
                />
              </div>
              {urlError && <p id="mattermost-url-error" className="mt-2 text-xs text-destructive">{urlError}</p>}
              <Button type="submit" className="mt-4 h-10 w-full rounded-xl bg-gradient-to-r from-[#7866ff] to-[#568dff] shadow-[0_10px_28px_rgba(103,82,255,0.24)]">
                Conectar ao Talki
              </Button>
            </form>
          </div>
        </section>
      </div>
    );
  }

  const mattermostHost = new URL(mattermostUrl).host;

  return (
    <div className="pb-3">
      <section className="glass-panel flex h-[calc(100vh-126px)] min-h-[600px] flex-col overflow-hidden rounded-[22px]">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-border px-4 sm:px-5">
          <span className="relative flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <MessageCircleMore className="size-4" />
            {!loading && !failed && <span className="neon-orb absolute -right-0.5 -top-0.5 size-2 rounded-full border-2 border-popover bg-[#3ddcaa] text-[#3ddcaa]" />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold">Mattermost</p>
            <p className="truncate text-[10px] text-muted-foreground">{loading ? 'Conectando…' : failed ? 'Conexão interrompida' : `Conectado a ${mattermostHost}`}</p>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={reload} className="rounded-lg text-muted-foreground" aria-label="Recarregar Mattermost">
            <RefreshCw className={cn('size-3.5', loading && 'animate-spin')} />
          </Button>
          <Button variant="ghost" size="icon-sm" asChild className="rounded-lg text-muted-foreground">
            <a href={mattermostUrl} target="_blank" rel="noreferrer" aria-label="Abrir Mattermost em nova aba"><ExternalLink className="size-3.5" /></a>
          </Button>
        </header>

        <div className="relative min-h-0 flex-1 bg-[#0e1017]">
          {(loading || failed) && <MattermostSkeleton slow={slow || failed} />}
          <iframe
            key={`${mattermostUrl}-${frameKey}`}
            src={mattermostUrl}
            title="Chat do Mattermost"
            className="block size-full border-0 bg-[#0e1017]"
            allow="camera; microphone; display-capture; fullscreen; clipboard-read; clipboard-write"
            referrerPolicy="strict-origin-when-cross-origin"
            onLoad={() => { setLoading(false); setSlow(false); setFailed(false); }}
            onError={() => { setLoading(false); setSlow(false); setFailed(true); }}
          />
        </div>
      </section>
    </div>
  );
}

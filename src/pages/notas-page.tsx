import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { FileText, NotebookPen, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/supabase';
import { useCurrentUser } from '@/hooks/use-current-user';
import { usePageHeader } from '@/hooks/use-page-header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Note {
  id: string;
  owner_id: string;
  titulo: string;
  conteudo: string;
  created_at: string;
  updated_at: string;
}

const emptyDraft = { titulo: '', conteudo: '' };

export function NotasPage() {
  const user = useCurrentUser();
  usePageHeader({ title: 'Bloco de notas' });
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Note | null | 'new'>(null);
  const [draft, setDraft] = useState(emptyDraft);
  const [deleting, setDeleting] = useState<Note | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('talki_notes')
      .select('id, owner_id, titulo, conteudo, created_at, updated_at')
      .eq('owner_id', user.id)
      .order('updated_at', { ascending: false });
    if (error) setError('Não foi possível carregar suas notas.');
    else { setNotes(data); setError(''); }
    setLoading(false);
  }, [user.id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial database fetch
    void load();
  }, [load]);

  const visible = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('pt-BR');
    if (!term) return notes;
    return notes.filter(note => `${note.titulo} ${note.conteudo}`.toLocaleLowerCase('pt-BR').includes(term));
  }, [notes, search]);

  function open(note?: Note) {
    setEditing(note ?? 'new');
    setDraft(note ? { titulo: note.titulo, conteudo: note.conteudo } : emptyDraft);
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    const titulo = draft.titulo.trim();
    if (!titulo || busy) return;
    setBusy(true);
    try {
      if (editing === 'new') {
        const { data, error } = await supabase.from('talki_notes')
          .insert({ owner_id: user.id, titulo, conteudo: draft.conteudo })
          .select('id, owner_id, titulo, conteudo, created_at, updated_at').single();
        if (error) throw error;
        setNotes(previous => [data, ...previous]);
        toast.success('Nota criada.');
      } else if (editing) {
        const { data, error } = await supabase.from('talki_notes')
          .update({ titulo, conteudo: draft.conteudo })
          .eq('id', editing.id).eq('owner_id', user.id)
          .select('id, owner_id, titulo, conteudo, created_at, updated_at').single();
        if (error) throw error;
        setNotes(previous => [data, ...previous.filter(note => note.id !== data.id)]);
        toast.success('Nota salva.');
      }
      setEditing(null);
    } catch { toast.error('Não foi possível salvar a nota.'); }
    finally { setBusy(false); }
  }

  async function remove() {
    if (!deleting || busy) return;
    setBusy(true);
    const { error } = await supabase.from('talki_notes').delete()
      .eq('id', deleting.id).eq('owner_id', user.id);
    if (error) toast.error('Não foi possível excluir a nota.');
    else {
      setNotes(previous => previous.filter(note => note.id !== deleting.id));
      setDeleting(null);
      toast.success('Nota excluída.');
    }
    setBusy(false);
  }

  return <div className="space-y-6 pb-8">
    <section className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="eyebrow mb-2 flex items-center gap-2"><NotebookPen className="size-3 text-primary" />Ideias e lembretes</p>
        <h2 className="text-3xl font-semibold tracking-[-0.05em]">Bloco de notas</h2>
        <p className="mt-2 text-sm text-muted-foreground">Suas anotações pessoais ficam salvas e disponíveis na sua conta.</p>
      </div>
      <Button className="rounded-xl" onClick={() => open()}><Plus />Nova nota</Button>
    </section>

    <div className="relative max-w-md">
      <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
      <Input aria-label="Buscar notas" placeholder="Buscar por título ou conteúdo..." value={search} onChange={event => setSearch(event.target.value)} className="pl-9" />
    </div>

    {error ? <div role="alert" className="rounded-2xl border border-destructive/30 p-6"><p className="text-sm text-destructive">{error}</p><Button variant="outline" className="mt-3" onClick={() => void load()}>Tentar novamente</Button></div>
      : loading ? <p role="status" className="py-12 text-center text-sm text-muted-foreground">Carregando suas notas…</p>
      : visible.length === 0 ? <div className="rounded-2xl border border-dashed py-16 text-center"><NotebookPen className="mx-auto mb-4 size-10 text-primary/60" /><h3 className="font-semibold">{search ? 'Nenhuma nota encontrada' : 'Seu bloco está vazio'}</h3><p className="mt-2 text-sm text-muted-foreground">{search ? 'Tente buscar por outro termo.' : 'Crie uma nota para guardar uma ideia ou lembrete.'}</p>{!search && <Button className="mt-5" onClick={() => open()}><Plus />Criar primeira nota</Button>}</div>
      : <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {visible.map(note => <article key={note.id} className="group flex min-h-52 flex-col rounded-2xl border border-border bg-card/60 p-5 transition hover:border-primary/40">
          <div className="flex items-start justify-between gap-3">
            <button className="min-w-0 flex-1 text-left" onClick={() => open(note)}><h3 className="break-words text-base font-semibold group-hover:text-primary">{note.titulo}</h3></button>
            <div className="flex shrink-0 gap-1">
              <Button variant="ghost" size="icon-sm" aria-label={`Editar ${note.titulo}`} onClick={() => open(note)}><Pencil /></Button>
              <Button variant="ghost" size="icon-sm" aria-label={`Excluir ${note.titulo}`} onClick={() => setDeleting(note)}><Trash2 className="text-destructive" /></Button>
            </div>
          </div>
          {note.conteudo ? <button className="mt-3 line-clamp-5 whitespace-pre-wrap text-left text-sm leading-6 text-muted-foreground" onClick={() => open(note)}>{note.conteudo}</button> : <p className="mt-3 text-sm italic text-muted-foreground">Nota sem conteúdo.</p>}
          <p className="mt-auto flex items-center gap-1.5 pt-5 text-[11px] text-muted-foreground"><FileText className="size-3" />Editada em {new Date(note.updated_at).toLocaleString('pt-BR')}</p>
        </article>)}
      </div>}

    <Dialog open={editing !== null} onOpenChange={next => { if (!next && !busy) setEditing(null); }}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader><DialogTitle>{editing === 'new' ? 'Nova nota' : 'Editar nota'}</DialogTitle><DialogDescription>Escreva e salve uma anotação pessoal.</DialogDescription></DialogHeader>
        <form onSubmit={save} className="space-y-4">
          <label className="block space-y-1.5 text-sm font-medium">Título<Input autoFocus required maxLength={200} value={draft.titulo} onChange={event => setDraft(previous => ({ ...previous, titulo: event.target.value }))} placeholder="Título da nota" /></label>
          <label className="block space-y-1.5 text-sm font-medium">Conteúdo<Textarea rows={14} maxLength={100000} value={draft.conteudo} onChange={event => setDraft(previous => ({ ...previous, conteudo: event.target.value }))} placeholder="Escreva sua nota..." className="resize-y leading-6" /></label>
          <div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={busy} onClick={() => setEditing(null)}>Cancelar</Button><Button disabled={busy || !draft.titulo.trim()}>{busy ? 'Salvando…' : 'Salvar nota'}</Button></div>
        </form>
      </DialogContent>
    </Dialog>

    <AlertDialog open={!!deleting} onOpenChange={next => { if (!next && !busy) setDeleting(null); }}>
      <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Excluir nota?</AlertDialogTitle><AlertDialogDescription>A nota “{deleting?.titulo}” será excluída definitivamente.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel><AlertDialogAction disabled={busy} onClick={event => { event.preventDefault(); void remove(); }}>Excluir nota</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
    </AlertDialog>
  </div>;
}

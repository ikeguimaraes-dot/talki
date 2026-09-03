import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { AlertTriangle, ClipboardList } from 'lucide-react';
import { supabase } from '@/supabase';
import { useSession } from '@/hooks/use-session';
import { Button } from '@/components/ui/button';
import { FullScreenLoading } from '@/components/state/full-screen-loading';

interface InviteData {
  planId: string;
  planNome: string;
}

export function ConvitePage() {
  const { token } = useParams<{ token: string }>();
  const { user, loading: sessionLoading } = useSession();
  const navigate = useNavigate();

  const [invite, setInvite] = useState<InviteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    const fetchInvite = async () => {
      try {
        const { data, error: fetchError } = await supabase
          .rpc('get_plan_invite', { p_token: token })
          .maybeSingle();

        if (fetchError || !data) {
          setError('Convite não encontrado ou inválido.');
          return;
        }

        setInvite({ planId: data.plan_id, planNome: data.plan_nome });
      } catch {
        setError('Erro ao carregar o convite.');
      } finally {
        setLoading(false);
      }
    };

    fetchInvite();
  }, [token]);

  const handleAccept = async () => {
    if (!user || !invite || !token) return;
    try {
      setAccepting(true);

      const { error: acceptError } = await supabase.rpc('accept_plan_invite', { p_token: token });
      if (acceptError) throw acceptError;

      toast.success(`Você entrou no plano "${invite.planNome}"!`);
      navigate('/', { replace: true });
    } catch (err) {
      console.error('Erro ao aceitar convite:', err);
      toast.error('Não foi possível entrar no plano.');
    } finally {
      setAccepting(false);
    }
  };

  if (loading || sessionLoading) return <FullScreenLoading />;

  return (
    <div className="flex min-h-screen items-center justify-center bg-sidebar p-8">
      <div className="w-full max-w-[400px] rounded-lg bg-card p-8 text-center shadow-md">
        <p className="mb-6 font-heading text-2xl font-semibold text-foreground">Talki</p>

        {error ? (
          <>
            <AlertTriangle className="mx-auto mb-3 size-8 text-destructive" />
            <p className="mb-4 font-medium text-destructive">{error}</p>
            <Button variant="outline" onClick={() => navigate('/')}>Voltar para o início</Button>
          </>
        ) : invite ? (
          <>
            <ClipboardList className="mx-auto mb-3 size-8 text-primary" />
            <p className="mb-2 text-sm text-muted-foreground">Você foi convidado para</p>
            <p className="mb-6 rounded-md bg-muted px-4 py-2 text-lg font-semibold text-foreground">
              {invite.planNome}
            </p>

            {!user ? (
              <>
                <p className="mb-4 text-sm text-muted-foreground">
                  Faça login ou crie uma conta para aceitar o convite.
                </p>
                <Button className="w-full" onClick={() => navigate('/login')}>Entrar / Criar conta</Button>
              </>
            ) : (
              <>
                <p className="mb-4 text-sm text-muted-foreground">
                  Logado como <strong className="text-foreground">{user.email}</strong>
                </p>
                <Button className="w-full" disabled={accepting} onClick={handleAccept}>
                  {accepting ? 'Entrando...' : 'Entrar no plano'}
                </Button>
              </>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}

import { useState, type FormEvent } from 'react';
import { ArrowRight, Check, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function LoginPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Credenciais inválidas.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error('As senhas não coincidem.');
      return;
    }
    if (password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres.');
      return;
    }
    try {
      setLoading(true);
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name } },
      });
      if (error) throw error;
      toast.success('Conta criada! Verifique seu email para confirmar o cadastro.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao criar conta.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-canvas relative grid min-h-screen overflow-hidden lg:grid-cols-[1.05fr_0.95fr]">
      <div className="relative hidden flex-col justify-between overflow-hidden border-r border-white/8 p-12 lg:flex xl:p-16">
        <div className="absolute left-[18%] top-[22%] size-80 rounded-full bg-primary/20 blur-[110px]" />
        <div className="absolute bottom-[12%] right-[4%] size-72 rounded-full bg-[#218cff]/15 blur-[100px]" />
        <div className="relative flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-[12px] bg-gradient-to-br from-[#9a8cff] via-[#7462ff] to-[#478aff] text-white shadow-[0_0_30px_rgba(124,108,255,0.38)]"><Sparkles className="size-4" /></span>
          <span className="text-xl font-bold tracking-[-0.05em]">talki</span>
        </div>

        <div className="relative max-w-2xl">
          <p className="eyebrow mb-5 text-[#aca2ff]">Seu segundo cérebro, com calma</p>
          <h1 className="gradient-text text-[clamp(3.3rem,6.2vw,6.7rem)] font-semibold leading-[0.94] tracking-[-0.075em]">
            Clareza para fazer acontecer.
          </h1>
          <p className="mt-7 max-w-lg text-base leading-7 text-muted-foreground">
            Projetos, tarefas e conversas em um espaço silencioso, bonito e desenhado para o seu melhor trabalho.
          </p>
        </div>

        <div className="relative flex gap-7 text-xs text-muted-foreground">
          {['Planeje com intenção', 'Colabore sem ruído', 'Avance todos os dias'].map(item => (
            <span key={item} className="flex items-center gap-2"><Check className="size-3.5 text-[#3ddcaa]" /> {item}</span>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-center p-5 sm:p-8 lg:p-12">
      <div className="glass-panel w-full max-w-[430px] rounded-[26px] p-6 sm:p-8">
        <div className="mb-7 lg:hidden">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-[12px] bg-gradient-to-br from-[#9a8cff] to-[#478aff] text-white"><Sparkles className="size-4" /></span>
            <span className="text-xl font-bold tracking-[-0.05em]">talki</span>
          </div>
        </div>

        <div className="mb-6">
          <p className="text-2xl font-semibold tracking-[-0.045em]">Bem-vindo de volta</p>
          <p className="mt-2 text-sm text-muted-foreground">Entre para retomar seu melhor fluxo.</p>
        </div>

        <Tabs value={mode} onValueChange={value => setMode(value as 'login' | 'signup')} className="mb-7">
          <TabsList className="h-10 w-full rounded-xl border border-border bg-muted/70 p-1">
            <TabsTrigger value="login" className="h-8 flex-1 rounded-lg text-xs">Entrar</TabsTrigger>
            <TabsTrigger value="signup" className="h-8 flex-1 rounded-lg text-xs">Criar conta</TabsTrigger>
          </TabsList>
        </Tabs>

        {mode === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input className="h-11 rounded-xl bg-muted/55" id="email" type="email" required autoFocus value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between"><Label htmlFor="password">Senha</Label><button type="button" className="text-[11px] text-primary hover:text-accent-foreground">Esqueceu a senha?</button></div>
              <Input className="h-11 rounded-xl bg-muted/55" id="password" type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
            </div>
            <Button type="submit" disabled={loading} className="h-11 w-full rounded-xl bg-gradient-to-r from-[#7866ff] to-[#568dff] text-sm shadow-[0_10px_28px_rgba(103,82,255,0.3)] hover:brightness-110">
              {loading ? 'Entrando...' : <><span>Entrar no Talki</span><ArrowRight className="size-4" /></>}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleSignup} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="name">Nome completo</Label>
              <Input className="h-10 rounded-xl bg-muted/55" id="name" type="text" required autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="Seu nome" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="signup-email">Email</Label>
              <Input className="h-10 rounded-xl bg-muted/55" id="signup-email" type="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="signup-password">Senha</Label>
              <Input className="h-10 rounded-xl bg-muted/55" id="signup-password" type="password" required value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="confirm-password">Confirmar senha</Label>
              <Input className="h-10 rounded-xl bg-muted/55" id="confirm-password" type="password" required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="••••••••" />
            </div>
            <Button type="submit" disabled={loading} className="h-11 w-full rounded-xl bg-gradient-to-r from-[#7866ff] to-[#568dff] shadow-[0_10px_28px_rgba(103,82,255,0.3)]">
              {loading ? 'Criando conta...' : 'Criar conta'}
            </Button>
          </form>
        )}
      </div>
      </div>
    </div>
  );
}

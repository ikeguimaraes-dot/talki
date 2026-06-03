import React, { useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '../supabase';

export const AuthView: React.FC = () => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.7rem 0.9rem',
    border: '1px solid #EAEAEA',
    borderRadius: '4px',
    fontSize: '0.95rem',
    fontFamily: 'Inter, system-ui, sans-serif',
    color: '#242424',
    outline: 'none',
    boxSizing: 'border-box',
    transition: 'border-color 0.15s',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '0.72rem',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    color: '#A38560',
    marginBottom: '0.4rem',
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
    } catch (err: any) {
      toast.error(err.message || 'Credenciais inválidas.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) { toast.error('As senhas não coincidem.'); return; }
    if (password.length < 6) { toast.error('A senha deve ter pelo menos 6 caracteres.'); return; }
    try {
      setLoading(true);
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name } },
      });
      if (error) throw error;
      toast.success('Conta criada! Verifique seu email para confirmar o cadastro.');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao criar conta.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#03110D',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '2rem',
    }}>
      <div style={{
        backgroundColor: '#FFFFFF',
        borderRadius: '8px',
        padding: '2.5rem',
        width: '100%',
        maxWidth: '420px',
        boxShadow: '0 24px 48px rgba(0,0,0,0.5)',
      }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{
            fontFamily: 'Playfair Display, Georgia, serif',
            fontSize: '2rem',
            fontWeight: 700,
            color: '#03110D',
            letterSpacing: '0.05em',
            lineHeight: 1,
          }}>
            CheckPlan
          </div>
          <div style={{
            fontSize: '0.62rem',
            textTransform: 'uppercase',
            letterSpacing: '0.15em',
            color: '#A38560',
            marginTop: '0.3rem',
          }}>
            Gestão & Delegação
          </div>
        </div>

        {/* Mode toggle */}
        <div style={{
          display: 'flex',
          backgroundColor: '#F5F5F5',
          borderRadius: '6px',
          padding: '3px',
          marginBottom: '1.75rem',
          gap: '3px',
        }}>
          {(['login', 'signup'] as const).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              style={{
                flex: 1, padding: '0.5rem',
                border: 'none', borderRadius: '4px',
                cursor: 'pointer',
                fontFamily: 'Inter, sans-serif',
                fontSize: '0.875rem',
                fontWeight: mode === m ? 600 : 400,
                transition: 'all 0.15s',
                backgroundColor: mode === m ? '#FFFFFF' : 'transparent',
                color: mode === m ? '#03110D' : '#888888',
                boxShadow: mode === m ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              {m === 'login' ? 'Entrar' : 'Criar conta'}
            </button>
          ))}
        </div>

        {mode === 'login' ? (
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={labelStyle}>Email</label>
              <input
                type="email" required autoFocus
                value={email} onChange={e => setEmail(e.target.value)}
                placeholder="seu@email.com"
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#A38560'}
                onBlur={e => e.target.style.borderColor = '#EAEAEA'}
              />
            </div>
            <div>
              <label style={labelStyle}>Senha</label>
              <input
                type="password" required
                value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#A38560'}
                onBlur={e => e.target.style.borderColor = '#EAEAEA'}
              />
            </div>
            <button
              type="submit" disabled={loading}
              style={{
                width: '100%', padding: '0.75rem',
                backgroundColor: '#03110D', color: '#F4F1EA',
                border: 'none', borderRadius: '4px',
                fontSize: '0.95rem', fontWeight: 600,
                fontFamily: 'Inter, sans-serif',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                marginTop: '0.25rem',
              }}
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleSignup} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={labelStyle}>Nome completo</label>
              <input
                type="text" required autoFocus
                value={name} onChange={e => setName(e.target.value)}
                placeholder="Seu nome"
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#A38560'}
                onBlur={e => e.target.style.borderColor = '#EAEAEA'}
              />
            </div>
            <div>
              <label style={labelStyle}>Email</label>
              <input
                type="email" required
                value={email} onChange={e => setEmail(e.target.value)}
                placeholder="seu@email.com"
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#A38560'}
                onBlur={e => e.target.style.borderColor = '#EAEAEA'}
              />
            </div>
            <div>
              <label style={labelStyle}>Senha</label>
              <input
                type="password" required
                value={password} onChange={e => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#A38560'}
                onBlur={e => e.target.style.borderColor = '#EAEAEA'}
              />
            </div>
            <div>
              <label style={labelStyle}>Confirmar senha</label>
              <input
                type="password" required
                value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = '#A38560'}
                onBlur={e => e.target.style.borderColor = '#EAEAEA'}
              />
            </div>
            <button
              type="submit" disabled={loading}
              style={{
                width: '100%', padding: '0.75rem',
                backgroundColor: '#03110D', color: '#F4F1EA',
                border: 'none', borderRadius: '4px',
                fontSize: '0.95rem', fontWeight: 600,
                fontFamily: 'Inter, sans-serif',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                marginTop: '0.25rem',
              }}
            >
              {loading ? 'Criando conta...' : 'Criar conta'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

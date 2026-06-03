import React from 'react';
import type { User } from '@supabase/supabase-js';

interface HeaderProps {
  onNavigateHome: () => void;
  user?: User | null;
  onNotifClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onNavigateHome, user, onNotifClick }) => {
  return (
    <header style={{
      borderBottom: '1px solid rgba(163, 133, 96, 0.15)',
      backgroundColor: '#03110D',
      padding: '0.9rem 2rem',
      flexShrink: 0,
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
      }}>
        <div
          onClick={onNavigateHome}
          style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}
        >
          <span style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '1.4rem',
            fontWeight: 600,
            color: '#F4F1EA',
            letterSpacing: '0.05em',
            lineHeight: 1,
          }}>
            CheckPlan
          </span>
          <span style={{
            fontSize: '0.58rem',
            textTransform: 'uppercase',
            letterSpacing: '0.15em',
            color: '#A38560',
            marginTop: '0.2rem',
          }}>
            Gestão & Delegação
          </span>
        </div>

        {user && onNotifClick && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <button
              onClick={onNotifClick}
              title="Notificações"
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#A38560', padding: '0.4rem',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: '4px', transition: 'background 0.15s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(163,133,96,0.12)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'none')}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
            </button>
            <div style={{
              width: '30px', height: '30px', borderRadius: '50%',
              backgroundColor: '#A38560',
              color: '#03110D',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.65rem', fontWeight: 700,
              cursor: 'default',
            }}
              title={user.email || ''}
            >
              {(user.user_metadata?.name || user.email || '?')
                .split(' ').map((p: string) => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

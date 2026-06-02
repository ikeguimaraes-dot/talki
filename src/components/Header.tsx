import React from 'react';

interface HeaderProps {
  onNavigateHome: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onNavigateHome }) => {
  return (
    <header style={{
      borderBottom: '1px solid rgba(163, 133, 96, 0.15)',
      backgroundColor: '#03110D',
      padding: '1.1rem 2rem',
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        width: '100%'
      }}>
        <div
          onClick={onNavigateHome}
          style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}
        >
          <span style={{
            fontFamily: 'var(--font-serif)',
            fontSize: '1.5rem',
            fontWeight: 600,
            color: '#F4F1EA',
            letterSpacing: '0.05em',
            lineHeight: 1
          }}>
            CheckPlan
          </span>
          <span style={{
            fontSize: '0.6rem',
            textTransform: 'uppercase',
            letterSpacing: '0.15em',
            color: '#A38560',
            marginTop: '0.2rem'
          }}>
            Gestão & Delegação
          </span>
        </div>
      </div>
    </header>
  );
};

import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../supabase';
import type { AppNotification } from '../types';

interface NotificationsPanelProps {
  userId: string;
  onClose: () => void;
}

const typeIcon: Record<string, string> = {
  task_assigned: '✓',
  project_invite: '📋',
  comment_added: '💬',
  task_due_soon: '⏰',
};

const relativeTime = (dateStr: string): string => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `há ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `há ${hours}h`;
  const days = Math.floor(hours / 24);
  return `há ${days}d`;
};

export const NotificationsPanel: React.FC<NotificationsPanelProps> = ({ userId, onClose }) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const panelRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async () => {
    try {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(30);
      setNotifications((data as AppNotification[]) || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();

    // Realtime subscription for new notifications
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` },
        (payload) => {
          setNotifications(prev => [payload.new as AppNotification, ...prev]);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  const markAsRead = async (id: string) => {
    await supabase.from('notifications').update({ read: true }).eq('id', id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id);
    if (unreadIds.length === 0) return;
    await supabase.from('notifications').update({ read: true }).in('id', unreadIds);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div
      ref={panelRef}
      style={{
        position: 'fixed',
        top: 0, right: 0,
        width: '340px',
        height: '100vh',
        backgroundColor: '#FFFFFF',
        borderLeft: '1px solid #EAEAEA',
        boxShadow: '-4px 0 20px rgba(0,0,0,0.12)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 1000,
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      {/* Header */}
      <div style={{
        padding: '1.25rem 1.25rem 1rem',
        borderBottom: '1px solid #EAEAEA',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#242424' }}>
            Notificações
            {unreadCount > 0 && (
              <span style={{
                marginLeft: '0.5rem',
                backgroundColor: '#D83B01', color: '#FFF',
                borderRadius: '10px', padding: '0.1rem 0.45rem',
                fontSize: '0.68rem', fontWeight: 700,
              }}>
                {unreadCount}
              </span>
            )}
          </h3>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: '0.75rem', color: '#A38560', fontFamily: 'Inter, sans-serif',
              }}
            >
              Marcar todas como lidas
            </button>
          )}
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: '1.2rem', color: '#888', lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {loading ? (
          <p style={{ padding: '2rem', textAlign: 'center', color: '#888', fontStyle: 'italic' }}>
            Carregando...
          </p>
        ) : notifications.length === 0 ? (
          <div style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔔</div>
            <p style={{ color: '#888', fontSize: '0.875rem' }}>Nenhuma notificação ainda.</p>
          </div>
        ) : (
          notifications.map(notif => (
            <div
              key={notif.id}
              onClick={() => markAsRead(notif.id)}
              style={{
                padding: '1rem 1.25rem',
                borderBottom: '1px solid #F0F0F0',
                cursor: 'pointer',
                backgroundColor: notif.read ? '#FFFFFF' : '#F5F8FF',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#F8F8F8'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = notif.read ? '#FFFFFF' : '#F5F8FF'}
            >
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                <div style={{
                  width: '32px', height: '32px', borderRadius: '50%',
                  backgroundColor: notif.read ? '#F0F0F0' : '#E8EEF8',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.9rem', flexShrink: 0,
                }}>
                  {typeIcon[notif.type] || '🔔'}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{
                    fontSize: '0.875rem', fontWeight: notif.read ? 400 : 600,
                    color: '#242424', marginBottom: '0.2rem', lineHeight: 1.4,
                  }}>
                    {notif.title}
                  </div>
                  {notif.body && (
                    <div style={{
                      fontSize: '0.8rem', color: '#666',
                      marginBottom: '0.25rem', lineHeight: 1.4,
                    }}>
                      {notif.body}
                    </div>
                  )}
                  <div style={{ fontSize: '0.72rem', color: '#AAAAAA' }}>
                    {relativeTime(notif.created_at)}
                  </div>
                </div>
                {!notif.read && (
                  <div style={{
                    width: '8px', height: '8px', borderRadius: '50%',
                    backgroundColor: '#A38560', flexShrink: 0, marginTop: '0.35rem',
                  }} />
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

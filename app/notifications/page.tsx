// app/notifications/page.tsx
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Bell, Heart, UserPlus, MessageCircle, Repeat2, AtSign } from 'lucide-react';
import Link from 'next/link';

interface Notification {
  id: string;
  type: 'like' | 'follow' | 'comment' | 'repost' | 'mention' | string;
  message: string;
  is_read: boolean;
  created_at: string;
  actor_id: string | null;
  post_id: string | null;
  actor?: {
    username: string;
    avatar_url: string | null;
    full_name: string | null;
  };
}

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function NotifIcon({ type }: { type: string }) {
  const size = 14;
  switch (type) {
    case 'like':    return <Heart size={size} fill="currentColor" className="text-rose-500" />;
    case 'follow':  return <UserPlus size={size} className="text-violet-500" />;
    case 'comment': return <MessageCircle size={size} className="text-blue-500" />;
    case 'repost':  return <Repeat2 size={size} className="text-green-500" />;
    case 'mention': return <AtSign size={size} className="text-orange-500" />;
    default:        return <Bell size={size} className="text-gray-400" />;
  }
}

export default function Notifications() {
  const supabase = createClient();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const markedRef = useRef<Set<string>>(new Set());

  const fetchNotifications = useCallback(async (uid: string) => {
    const { data, error } = await supabase
      .from('notifications')
      .select(`
        id, type, message, is_read, created_at, actor_id, post_id,
        actor:profiles!notifications_actor_id_fkey(username, avatar_url, full_name)
      `)
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      // Fallback: select without join if FK alias fails (schema variance)
      const { data: fallback } = await supabase
        .from('notifications')
        .select('id, type, message, is_read, created_at, actor_id, post_id')
        .eq('user_id', uid)
        .order('created_at', { ascending: false })
        .limit(50);
      setNotifications((fallback as Notification[]) ?? []);
    } else {
      setNotifications((data as unknown as Notification[]) ?? []);
    }
    setLoading(false);
  }, [supabase]);

  // Mark all unread as read
  const markAllRead = useCallback(async (uid: string, items: Notification[]) => {
    const unread = items.filter(n => !n.is_read && !markedRef.current.has(n.id));
    if (unread.length === 0) return;
    const ids = unread.map(n => n.id);
    ids.forEach(id => markedRef.current.add(id));
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .in('id', ids)
      .eq('user_id', uid);
    // Optimistically update local state
    setNotifications(prev =>
      prev.map(n => ids.includes(n.id) ? { ...n, is_read: true } : n)
    );
  }, [supabase]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { setLoading(false); return; }
      setUserId(user.id);
      fetchNotifications(user.id).then(() => {
        // Mark all as read after a brief delay so user sees the unread state first
        setTimeout(() => {
          setNotifications(prev => {
            markAllRead(user.id, prev);
            return prev;
          });
        }, 1500);
      });

      // Real-time: add new notifications to top of list
      const channel = supabase
        .channel(`notifs-page-${user.id}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
          (payload) => {
            const newNotif = payload.new as Notification;
            setNotifications(prev => [newNotif, ...prev]);
          }
        )
        .subscribe();

      return () => { supabase.removeChannel(channel); };
    });
  }, []); // eslint-disable-line

  if (loading) {
    return (
      <div className="max-w-xl mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Notifications</h1>
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="p-3 border rounded-lg bg-(--surface-1) animate-pulse h-16" />
          ))}
        </div>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="max-w-xl mx-auto p-4">
        <p className="text-(--text-secondary)">Please log in to see your notifications.</p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Notifications</h1>

      {notifications.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-(--text-secondary)">
          <Bell size={40} strokeWidth={1.5} />
          <p className="text-sm">No notifications yet</p>
        </div>
      ) : (
        <ul className="space-y-1">
          {notifications.map((n) => {
            const href = n.post_id
              ? `/posts/${n.post_id}`
              : n.actor_id
              ? `/profile/${n.actor_id}`
              : '#';

            const avatarUrl = n.actor?.avatar_url;
            const displayName = n.actor?.full_name || n.actor?.username || 'Someone';

            return (
              <li key={n.id}>
                <Link
                  href={href}
                  className="flex items-start gap-3 p-3 rounded-xl transition-colors hover:bg-(--surface-2)"
                  style={!n.is_read ? { background: 'rgba(91,33,182,0.05)' } : {}}
                >
                  {/* Avatar or icon */}
                  <div className="relative shrink-0">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={displayName}
                        className="w-9 h-9 rounded-full object-cover"
                      />
                    ) : (
                      <div
                        className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm"
                        style={{ background: 'var(--grad-brand)' }}
                      >
                        {displayName[0]?.toUpperCase() ?? '?'}
                      </div>
                    )}
                    <span
                      className="absolute -bottom-0.5 -right-0.5 w-4.5 h-4.5 rounded-full border-2 border-(--surface-0) flex items-center justify-center"
                      style={{ background: 'var(--surface-1)' }}
                    >
                      <NotifIcon type={n.type} />
                    </span>
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-(--text-primary)ing-snug">
                      {n.message}
                    </p>
                    <p className="text-xs text-(--text-tertiary) mt-0.5">
                      {timeAgo(n.created_at)}
                    </p>
                  </div>

                  {/* Unread dot */}
                  {!n.is_read && (
                    <span
                      className="shrink-0 w-2 h-2 rounded-full mt-1.5"
                      style={{ background: 'var(--nia-violet)' }}
                    />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
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
  entity_id: string | null;
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

// Three query strategies tried in order:
// 1. Explicit FK hint  — works if the constraint name matches exactly
// 2. Generic hint      — works when Supabase can infer the join unambiguously
// 3. No join at all    — always works; actor data hydrated in a second query
const SELECT_WITH_FK     = `id, type, message, is_read, created_at, actor_id, entity_id, actor:profiles!notifications_actor_id_fkey(username, avatar_url, full_name)`;
const SELECT_GENERIC_JOIN= `id, type, message, is_read, created_at, actor_id, entity_id, actor:profiles(username, avatar_url, full_name)`;
const SELECT_BASE        = `id, type, message, is_read, created_at, actor_id, entity_id`;

export default function Notifications() {
  // Stable client — never recreated, preserves auth state across renders
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading]             = useState(true);
  const [fetchError, setFetchError]       = useState<string | null>(null);
  const [userId, setUserId]               = useState<string | null>(null);
  const markedRef = useRef<Set<string>>(new Set());

  // Hydrate actor data for notifications that came back without a join
  const hydrateActors = useCallback(async (items: Notification[]): Promise<Notification[]> => {
    const ids = [...new Set(items.map(n => n.actor_id).filter(Boolean))] as string[];
    if (ids.length === 0) return items;
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, username, avatar_url, full_name')
      .in('id', ids);
    if (!profiles) return items;
    const map = Object.fromEntries(profiles.map((p: any) => [p.id, p]));
    return items.map(n => ({
      ...n,
      actor: n.actor_id ? map[n.actor_id] ?? n.actor : n.actor,
    }));
  }, [supabase]);

  const fetchNotifications = useCallback(async (uid: string) => {
    setFetchError(null);

    // Strategy 1 — explicit FK alias
    const { data: d1, error: e1 } = await supabase
      .from('notifications')
      .select(SELECT_WITH_FK)
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .limit(50);

    if (!e1 && d1) {
      setNotifications(d1 as unknown as Notification[]);
      setLoading(false);
      return;
    }

    // Strategy 2 — generic join hint (no explicit FK name)
    const { data: d2, error: e2 } = await supabase
      .from('notifications')
      .select(SELECT_GENERIC_JOIN)
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .limit(50);

    if (!e2 && d2) {
      setNotifications(d2 as unknown as Notification[]);
      setLoading(false);
      return;
    }

    // Strategy 3 — base columns only, then hydrate actors in a separate query
    const { data: d3, error: e3 } = await supabase
      .from('notifications')
      .select(SELECT_BASE)
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .limit(50);

    if (!e3 && d3) {
      const hydrated = await hydrateActors(d3 as Notification[]);
      setNotifications(hydrated);
      setLoading(false);
      return;
    }

    // All three strategies failed — surface the error
    const msg = e3?.message ?? e2?.message ?? e1?.message ?? 'Unknown error';
    console.error('[Notifications] All fetch strategies failed:', { e1, e2, e3 });
    setFetchError(msg);
    setLoading(false);
  }, [supabase, hydrateActors]);

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
    setNotifications(prev =>
      prev.map(n => ids.includes(n.id) ? { ...n, is_read: true } : n)
    );
  }, [supabase]);

  useEffect(() => {
    // FIX: the realtime channel and its cleanup must live at the top level
    // of the effect so React can actually call removeChannel on unmount.
    // Previously `return () => removeChannel(channel)` was returned from
    // inside the .then() callback, which useEffect never sees — so every
    // mount (including React Strict Mode's double-invoke in dev, or simply
    // navigating away and back) leaked a brand new channel subscription on
    // the same topic name, eventually breaking realtime delivery entirely.
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (cancelled) return;
      if (!user) { setLoading(false); return; }
      setUserId(user.id);

      fetchNotifications(user.id).then(() => {
        // Show unread state briefly, then mark all read
        setTimeout(() => {
          // FIX: don't smuggle an async side effect inside a setState
          // updater (updaters must be pure and can be invoked more than
          // once). Read the latest snapshot via the ref-backed state value
          // instead and call markAllRead directly.
          if (!cancelled) {
            setNotifications(prev => {
              markAllRead(user.id, prev);
              return prev;
            });
          }
        }, 1500);
      });

      // Real-time: re-fetch the single inserted row with actor data
      // (payload.new from postgres_changes never includes joined relations)
      channel = supabase
        .channel(`notifs-page-${user.id}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
          async (payload) => {
            const raw = payload.new as Notification;
            // Try to hydrate actor, fall back to raw row
            const [hydrated] = await hydrateActors([raw]);
            if (!cancelled) {
              setNotifications(prev => [hydrated, ...prev]);
            }
          }
        )
        .subscribe();
    });

    // This cleanup now actually belongs to the effect, so React will call
    // it on unmount / before the effect re-runs.
    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, []); // eslint-disable-line

  /* ── Loading skeleton ── */
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

  /* ── Not logged in ── */
  if (!userId) {
    return (
      <div className="max-w-xl mx-auto p-4">
        <p className="text-(--text-secondary)">Please log in to see your notifications.</p>
      </div>
    );
  }

  /* ── Fetch error ── */
  if (fetchError) {
    return (
      <div className="max-w-xl mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Notifications</h1>
        <div className="flex flex-col items-center gap-3 py-16 text-(--text-secondary)">
          <Bell size={40} strokeWidth={1.5} />
          <p className="text-sm">Could not load notifications</p>
          <button
            className="text-xs underline text-(--text-tertiary)"
            onClick={() => { setLoading(true); fetchNotifications(userId); }}
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  /* ── Main render ── */
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
            const href = n.entity_id
              ? `/posts/${n.entity_id}`
              : n.actor_id
              ? `/profile/${n.actor_id}`
              : '#';

            const avatarUrl  = n.actor?.avatar_url;
            const displayName = n.actor?.full_name || n.actor?.username || 'Someone';

            return (
              <li key={n.id}>
                <Link
                  href={href}
                  className="flex items-start gap-3 p-3 rounded-xl transition-colors hover:bg-(--surface-2)"
                  style={!n.is_read ? { background: 'rgba(91,33,182,0.05)' } : {}}
                >
                  {/* Avatar or fallback initial */}
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

                  {/* Message + timestamp */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-(--text-primary) leading-snug">
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
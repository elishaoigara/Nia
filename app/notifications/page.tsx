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

// Returns the coloured badge icon that sits over the avatar
function NotifBadge({ type }: { type: string }) {
  const base = 'absolute -bottom-0.5 -right-0.5 w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center';
  const iconSize = 9;

  switch (type) {
    case 'like':
      return (
        <span className={base} style={{ borderColor: 'var(--surface-0)', background: '#FEF2F2' }}>
          <Heart size={iconSize} fill="#DC2626" strokeWidth={0} />
        </span>
      );
    case 'follow':
      return (
        <span className={base} style={{ borderColor: 'var(--surface-0)', background: '#EDE9FE' }}>
          <UserPlus size={iconSize} className="text-violet-600" strokeWidth={2} />
        </span>
      );
    case 'comment':
      return (
        <span className={base} style={{ borderColor: 'var(--surface-0)', background: '#EFF6FF' }}>
          <MessageCircle size={iconSize} className="text-blue-600" strokeWidth={2} />
        </span>
      );
    case 'repost':
      return (
        <span className={base} style={{ borderColor: 'var(--surface-0)', background: '#F0FDF4' }}>
          <Repeat2 size={iconSize} className="text-green-600" strokeWidth={2} />
        </span>
      );
    case 'mention':
      return (
        <span className={base} style={{ borderColor: 'var(--surface-0)', background: '#FFF7ED' }}>
          <AtSign size={iconSize} className="text-orange-500" strokeWidth={2} />
        </span>
      );
    default:
      return (
        <span className={base} style={{ borderColor: 'var(--surface-0)', background: 'var(--surface-2)' }}>
          <Bell size={iconSize} className="text-(--text-tertiary)" strokeWidth={2} />
        </span>
      );
  }
}

// Three query strategies tried in order:
// 1. Explicit FK hint  — works if the constraint name matches exactly
// 2. Generic hint      — works when Supabase can infer the join unambiguously
// 3. No join at all    — always works; actor data hydrated in a second query
const SELECT_WITH_FK      = `id, type, message, is_read, created_at, actor_id, entity_id, actor:profiles!notifications_actor_id_fkey(username, avatar_url, full_name)`;
const SELECT_GENERIC_JOIN = `id, type, message, is_read, created_at, actor_id, entity_id, actor:profiles(username, avatar_url, full_name)`;
const SELECT_BASE         = `id, type, message, is_read, created_at, actor_id, entity_id`;

// Split a flat list into "new" (unread) and "earlier" (read) buckets
function partitionNotifications(items: Notification[]) {
  return {
    fresh:   items.filter(n => !n.is_read),
    earlier: items.filter(n =>  n.is_read),
  };
}

export default function Notifications() {
  // Stable client — never recreated, preserves auth state across renders
  const supabaseRef = useRef(createClient());
  const supabase    = supabaseRef.current;

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

  // Mark all unread as read (called after a short delay so users see unread state first)
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

  // Immediate mark-all-read triggered by the header button
  const handleMarkAllRead = useCallback(() => {
    if (userId) markAllRead(userId, notifications);
  }, [userId, notifications, markAllRead]);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (cancelled) return;
      if (!user) { setLoading(false); return; }
      setUserId(user.id);

      fetchNotifications(user.id).then(() => {
        // Show unread state briefly, then mark all read
        setTimeout(() => {
          if (!cancelled) {
            setNotifications(prev => {
              markAllRead(user.id, prev);
              return prev;
            });
          }
        }, 1500);
      });

      // Real-time: re-fetch the single inserted row with actor data
      channel = supabase
        .channel(`notifs-page-${user.id}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
          async (payload) => {
            const raw = payload.new as Notification;
            const [hydrated] = await hydrateActors([raw]);
            if (!cancelled) {
              setNotifications(prev => [hydrated, ...prev]);
            }
          }
        )
        .subscribe();
    });

    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, []); // eslint-disable-line

  /* ── Loading skeleton ── */
  if (loading) {
    return (
      <div className="max-w-xl mx-auto">
        {/* Sticky header skeleton */}
        <div
          className="sticky top-0 z-10 flex items-center justify-between px-4 py-3.5 border-b"
          style={{ borderColor: 'var(--divider)', background: 'var(--surface-0)' }}
        >
          <h1 className="text-[17px] font-bold tracking-tight text-(--text-primary)">Notifications</h1>
        </div>
        <div className="mt-2">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 px-4 py-3 border-b"
              style={{ borderColor: 'var(--divider)' }}
            >
              <div className="skeleton w-10 h-10 rounded-full shrink-0" />
              <div className="flex-1 flex flex-col gap-2">
                <div className="skeleton h-3 rounded-full w-3/4" />
                <div className="skeleton h-2.5 rounded-full w-1/3" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* ── Not logged in ── */
  if (!userId) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 flex flex-col items-center gap-3">
        <Bell size={36} strokeWidth={1.5} className="text-(--text-tertiary)" />
        <p className="text-sm text-(--text-secondary)">Please log in to see your notifications.</p>
      </div>
    );
  }

  /* ── Fetch error ── */
  if (fetchError) {
    return (
      <div className="max-w-xl mx-auto">
        <div
          className="sticky top-0 z-10 px-4 py-3.5 border-b"
          style={{ borderColor: 'var(--divider)', background: 'var(--surface-0)' }}
        >
          <h1 className="text-[17px] font-bold tracking-tight text-(--text-primary)">Notifications</h1>
        </div>
        <div className="flex flex-col items-center gap-3 py-16 text-(--text-secondary)">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ background: 'var(--surface-2)' }}
          >
            <Bell size={22} strokeWidth={1.5} />
          </div>
          <p className="text-sm">Could not load notifications</p>
          <button
            className="text-xs text-(--text-tertiary) underline underline-offset-2"
            onClick={() => { setLoading(true); fetchNotifications(userId); }}
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  const { fresh, earlier } = partitionNotifications(notifications);
  const hasUnread = fresh.length > 0;

  /* ── Main render ── */
  return (
    <div className="max-w-xl mx-auto pb-8">

      {/* Sticky frosted header */}
      <div
        className="sticky top-0 z-10 flex items-center justify-between px-4 py-3.5 border-b"
        style={{
          borderColor: 'var(--divider)',
          background: 'rgba(249,248,246,0.88)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        }}
      >
        <h1 className="text-[17px] font-bold tracking-tight text-(--text-primary)">Notifications</h1>
        {hasUnread && (
          <button
            onClick={handleMarkAllRead}
            className="text-xs font-medium rounded-lg px-2 py-1 transition-colors"
            style={{ color: 'var(--nia-accent-soft)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(91,33,182,0.07)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            Mark all read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ background: 'var(--surface-2)' }}
          >
            <Bell size={22} strokeWidth={1.5} className="text-(--text-tertiary)" />
          </div>
          <p className="text-sm text-(--text-secondary)">No notifications yet</p>
        </div>
      ) : (
        <>
          {/* ── New (unread) section ── */}
          {fresh.length > 0 && (
            <>
              <p
                className="px-4 pt-3.5 pb-1.5 text-[11px] font-semibold tracking-widest uppercase"
                style={{ color: 'var(--text-tertiary)' }}
              >
                New
              </p>
              <ul>
                {fresh.map(n => (
                  <NotifRow key={n.id} n={n} />
                ))}
              </ul>
            </>
          )}

          {/* ── Earlier (read) section ── */}
          {earlier.length > 0 && (
            <>
              <p
                className="px-4 pt-4 pb-1.5 text-[11px] font-semibold tracking-widest uppercase"
                style={{ color: 'var(--text-tertiary)' }}
              >
                {fresh.length > 0 ? 'Earlier' : 'Recent'}
              </p>
              <ul>
                {earlier.map(n => (
                  <NotifRow key={n.id} n={n} />
                ))}
              </ul>
            </>
          )}
        </>
      )}
    </div>
  );
}

/* ── Individual notification row ── */
function NotifRow({ n }: { n: Notification }) {
  const href = n.entity_id
    ? `/posts/${n.entity_id}`
    : n.actor_id
    ? `/profile/${n.actor_id}`
    : '#';

  const avatarUrl   = n.actor?.avatar_url;
  const displayName = n.actor?.full_name || n.actor?.username || 'Someone';
  const initial     = displayName[0]?.toUpperCase() ?? '?';

  return (
    <li>
      <Link
        href={href}
        className="relative flex items-start gap-3 px-4 py-3 transition-colors border-b tap-sm"
        style={{
          borderColor: 'var(--divider)',
          background: n.is_read ? 'transparent' : 'rgba(91,33,182,0.04)',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.background = n.is_read
            ? 'var(--surface-1)'
            : 'rgba(91,33,182,0.07)';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.background = n.is_read
            ? 'transparent'
            : 'rgba(91,33,182,0.04)';
        }}
      >
        {/* Violet left bar for unread */}
        {!n.is_read && (
          <span
            className="absolute left-0 top-1/2 -translate-y-1/2 w-0.75 rounded-r-sm"
            style={{
              height: '60%',
              background: 'var(--grad-brand)',
            }}
          />
        )}

        {/* Avatar + badge */}
        <div className="relative shrink-0">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={displayName}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
              style={{ background: 'var(--grad-brand)' }}
            >
              {initial}
            </div>
          )}
          <NotifBadge type={n.type} />
        </div>

        {/* Message + timestamp */}
        <div className="flex-1 min-w-0 pt-0.5">
          <p
            className="text-sm leading-snug"
            style={{ color: 'var(--text-primary)' }}
          >
            {n.message}
          </p>
          <p
            className="text-xs mt-0.5"
            style={{ color: 'var(--text-tertiary)' }}
          >
            {timeAgo(n.created_at)}
          </p>
        </div>

        {/* Unread dot */}
        {!n.is_read && (
          <span
            className="shrink-0 w-2 h-2 rounded-full mt-2 self-start"
            style={{ background: 'var(--grad-brand)' }}
          />
        )}
      </Link>
    </li>
  );
}
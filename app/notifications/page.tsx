// app/notifications/page.tsx
'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Bell, Heart, UserPlus, MessageCircle, Repeat2, AtSign } from 'lucide-react';
import Link from 'next/link';

interface Actor {
  username: string;
  avatar_url: string | null;
  full_name: string | null;
}

interface Notification {
  id: string;
  type: 'like' | 'follow' | 'comment' | 'repost' | 'mention' | string;
  message: string;
  is_read: boolean;
  created_at: string;
  actor_id: string | null;
  entity_id: string | null;
  actor?: Actor;
}

interface GroupedNotification extends Notification {
  extraActors?: Actor[];
  groupCount?: number;
}

const PAGE_SIZE = 50;

const FILTERS = [
  { key: 'all',      label: 'All' },
  { key: 'like',     label: 'Likes' },
  { key: 'follow',   label: 'Follows' },
  { key: 'comment',  label: 'Comments' },
  { key: 'mention',  label: 'Mentions' },
  { key: 'message',  label: 'Messages' },
] as const;

function timeAgo(date: string): string {
  const d = new Date(date);
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return sameYear
    ? d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
    : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function verbForType(type: string): string {
  switch (type) {
    case 'like':    return 'liked your post';
    case 'repost':  return 'reposted your post';
    case 'follow':  return 'started following you';
    case 'comment': return 'commented on your post';
    case 'mention': return 'mentioned you';
    case 'message': return 'sent you a message';
    default:        return 'interacted with you';
  }
}

// Types where merging repeats into "X and N others ___" reads better than a
// wall of near-identical rows. Comments/mentions carry unique content per
// notification, so they stay ungrouped.
const GROUPABLE = new Set(['like', 'repost', 'follow']);

function groupNotifications(items: Notification[]): GroupedNotification[] {
  const result: GroupedNotification[] = [];
  const seen = new Map<string, GroupedNotification>();

  for (const n of items) {
    if (GROUPABLE.has(n.type)) {
      // Posts/reposts group per entity; follows have no entity so they
      // group as one running bucket per type.
      const key = n.entity_id ? `${n.type}:${n.entity_id}` : n.type;
      const existing = seen.get(key);
      if (existing) {
        existing.groupCount = (existing.groupCount ?? 1) + 1;
        existing.extraActors = existing.extraActors ?? [];
        if (n.actor) existing.extraActors.push(n.actor);
        existing.is_read = existing.is_read && n.is_read;
        continue;
      }
      const copy: GroupedNotification = { ...n };
      seen.set(key, copy);
      result.push(copy);
      continue;
    }
    result.push({ ...n });
  }
  return result;
}

// Returns the coloured badge icon that sits over the avatar.
// Palette is intentionally restrained to match the rest of the app:
// coral only for likes (the app's one "warm" accent, reserved for
// like/destructive actions elsewhere), violet for everything else —
// types are told apart by icon shape, not by a rainbow of hues.
function NotifBadge({ type }: { type: string }) {
  const base = 'absolute -bottom-0.5 -right-0.5 w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center';
  const iconSize = 9;
  const isLike = type === 'like';
  const tint = isLike
    ? 'color-mix(in srgb, var(--nia-coral) 18%, var(--surface-0))'
    : 'color-mix(in srgb, var(--nia-violet) 18%, var(--surface-0))';
  const iconColor = isLike ? 'var(--nia-coral)' : 'var(--nia-violet)';

  const icon = (() => {
    switch (type) {
      case 'like':    return <Heart size={iconSize} fill={iconColor} color={iconColor} strokeWidth={0} />;
      case 'follow':  return <UserPlus size={iconSize} color={iconColor} strokeWidth={2} />;
      case 'comment': return <MessageCircle size={iconSize} color={iconColor} strokeWidth={2} />;
      case 'repost':  return <Repeat2 size={iconSize} color={iconColor} strokeWidth={2} />;
      case 'mention': return <AtSign size={iconSize} color={iconColor} strokeWidth={2} />;
      case 'message': return <MessageCircle size={iconSize} color={iconColor} strokeWidth={2} />;
      default:        return <Bell size={iconSize} color="var(--text-tertiary)" strokeWidth={2} />;
    }
  })();

  return (
    <span className={base} style={{ borderColor: 'var(--surface-0)', background: tint }}>
      {icon}
    </span>
  );
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
  const supabase = createClient();

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading]             = useState(true);
  const [loadingMore, setLoadingMore]     = useState(false);
  const [hasMore, setHasMore]             = useState(true);
  const [fetchError, setFetchError]       = useState<string | null>(null);
  const [userId, setUserId]               = useState<string | null>(null);
  const [filter, setFilter]               = useState<typeof FILTERS[number]['key']>('all');
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
    const map: Record<string, Actor> = Object.fromEntries(
      profiles.map(profile => [profile.id, profile as Actor]),
    );
    return items.map(n => ({
      ...n,
      actor: n.actor_id ? map[n.actor_id] ?? n.actor : n.actor,
    }));
  }, [supabase]);

  const fetchNotifications = useCallback(async (uid: string, offset = 0, append = false) => {
    if (offset === 0) setFetchError(null);

    const range: [number, number] = [offset, offset + PAGE_SIZE - 1];

    // Strategy 1 — explicit FK alias
    const { data: d1, error: e1 } = await supabase
      .from('notifications')
      .select(SELECT_WITH_FK)
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .range(range[0], range[1]);

    let finalData: Notification[] | null = null;

    if (!e1 && d1) {
      finalData = d1 as unknown as Notification[];
    } else {
      // Strategy 2 — generic join hint (no explicit FK name)
      const { data: d2, error: e2 } = await supabase
        .from('notifications')
        .select(SELECT_GENERIC_JOIN)
        .eq('user_id', uid)
        .order('created_at', { ascending: false })
        .range(range[0], range[1]);

      if (!e2 && d2) {
        finalData = d2 as unknown as Notification[];
      } else {
        // Strategy 3 — base columns only, then hydrate actors separately
        const { data: d3, error: e3 } = await supabase
          .from('notifications')
          .select(SELECT_BASE)
          .eq('user_id', uid)
          .order('created_at', { ascending: false })
          .range(range[0], range[1]);

        if (!e3 && d3) {
          finalData = await hydrateActors(d3 as Notification[]);
        } else {
          const msg = e3?.message ?? e2?.message ?? e1?.message ?? 'Unknown error';
          console.error('[Notifications] All fetch strategies failed:', { e1, e2, e3 });
          if (offset === 0) setFetchError(msg);
          setLoading(false);
          setLoadingMore(false);
          return [];
        }
      }
    }

    setHasMore((finalData?.length ?? 0) === PAGE_SIZE);
    setNotifications(prev => append ? [...prev, ...(finalData ?? [])] : (finalData ?? []));
    setLoading(false);
    setLoadingMore(false);
    return finalData ?? [];
  }, [supabase, hydrateActors]);

  const handleLoadMore = useCallback(() => {
    if (!userId || loadingMore) return;
    setLoadingMore(true);
    fetchNotifications(userId, notifications.length, true);
  }, [userId, notifications.length, loadingMore, fetchNotifications]);

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
    let markTimer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (cancelled) return;
      if (!user) { setLoading(false); return; }
      setUserId(user.id);

      fetchNotifications(user.id, 0, false).then(items => {
        // Keep the unread state visible briefly before acknowledging the
        // notifications that were actually fetched for this page.
        markTimer = setTimeout(() => {
          if (!cancelled) void markAllRead(user.id, items);
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
      if (markTimer) clearTimeout(markTimer);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [fetchNotifications, hydrateActors, markAllRead, supabase]);

  const filtered = useMemo(
    () => filter === 'all' ? notifications : notifications.filter(n => n.type === filter),
    [notifications, filter]
  );
  const grouped = useMemo(() => groupNotifications(filtered), [filtered]);

  /* ── Loading skeleton ── */
  if (loading) {
    return (
      <div className="max-w-xl mx-auto">
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
            onClick={() => { setLoading(true); fetchNotifications(userId, 0, false); }}
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  const { fresh, earlier } = partitionNotifications(grouped);
  const hasUnread = fresh.length > 0;

  /* ── Main render ── */
  return (
    <div className="max-w-xl mx-auto pb-8">

      {/* Sticky header — theme-aware, not hardcoded to light mode */}
      <div
        className="sticky top-0 z-10 flex items-center justify-between px-4 py-3.5 border-b"
        style={{
          borderColor: 'var(--divider)',
          background: 'color-mix(in srgb, var(--surface-0) 88%, transparent)',
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

      {/* Filter tabs */}
      <div
        className="flex gap-1 px-3 py-2 border-b overflow-x-auto"
        style={{ borderColor: 'var(--divider)' }}
      >
        {FILTERS.map(f => {
          const active = filter === f.key;
          return (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className="tap-sm"
              style={{
                flexShrink: 0,
                padding: '6px 12px',
                borderRadius: 20,
                border: 'none',
                fontSize: 12.5,
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'inherit',
                background: active ? 'color-mix(in srgb, var(--nia-violet) 14%, transparent)' : 'transparent',
                color: active ? 'var(--nia-violet)' : 'var(--text-tertiary)',
              }}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {grouped.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16">
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center"
            style={{ background: 'var(--surface-2)' }}
          >
            <Bell size={22} strokeWidth={1.5} className="text-(--text-tertiary)" />
          </div>
          <p className="text-sm text-(--text-secondary)">
            {filter === 'all' ? 'No notifications yet' : `No ${FILTERS.find(f => f.key === filter)?.label.toLowerCase()} yet`}
          </p>
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

          {hasMore && filter === 'all' && (
            <div className="flex justify-center py-4">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="tap-sm text-sm font-semibold"
                style={{
                  color: 'var(--nia-violet)',
                  opacity: loadingMore ? 0.6 : 1,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                {loadingMore ? 'Loading…' : 'Load more'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ── Individual notification row ── */
function NotifRow({ n }: { n: GroupedNotification }) {
  const href = n.type === 'message' && n.actor_id
    ? `/messages/${n.actor_id}`
    : n.entity_id
    ? `/posts/${n.entity_id}`
    : n.actor_id
    ? `/profile/${n.actor_id}`
    : '#';

  const avatarUrl   = n.actor?.avatar_url;
  const displayName = n.actor?.full_name || n.actor?.username || 'Someone';
  const initial     = displayName[0]?.toUpperCase() ?? '?';

  const groupCount = n.groupCount ?? 1;
  const message = groupCount > 1
    ? `${displayName} and ${groupCount - 1} other${groupCount - 1 > 1 ? 's' : ''} ${verbForType(n.type)}`
    : n.message;

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
            className="absolute left-0 top-1/2 -translate-y-1/2 rounded-r-sm"
            style={{
              width: 3,
              height: '60%',
              background: 'var(--grad-brand)',
            }}
          />
        )}

        {/* Avatar + badge (stacked avatars when grouped) */}
        <div className="relative shrink-0" style={{ width: groupCount > 1 ? 46 : 40, height: 40 }}>
          {groupCount > 1 && n.extraActors?.[0] && (
            <div
              className="absolute rounded-full overflow-hidden border-2"
              style={{ width: 28, height: 28, left: 12, top: 12, borderColor: 'var(--surface-0)', zIndex: 0 }}
            >
              {n.extraActors[0].avatar_url ? (
                <img src={n.extraActors[0].avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white text-[11px] font-bold" style={{ background: 'var(--grad-brand)' }}>
                  {(n.extraActors[0].full_name || n.extraActors[0].username || '?')[0]?.toUpperCase()}
                </div>
              )}
            </div>
          )}
          <div className="relative" style={{ zIndex: 1 }}>
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
        </div>

        {/* Message + timestamp */}
        <div className="flex-1 min-w-0 pt-0.5">
          <p
            className="text-sm leading-snug"
            style={{ color: 'var(--text-primary)' }}
          >
            {message}
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
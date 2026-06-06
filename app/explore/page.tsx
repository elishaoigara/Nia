
'use client'

import { useState, useTransition, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import CircleCard from '@/components/CircleCard'
import {
  Search, TrendingUp, Users, User,
  MapPin, Globe2, Compass, Loader2,
} from 'lucide-react'
import { AFRICAN_REGIONS, getFlag } from '@/lib/african-data'

type Tab = 'trending' | 'search'

export default function ExplorePage() {
  const supabase = createClient()

  const [tab,          setTab]          = useState<Tab>('trending')
  const [userId,       setUserId]       = useState<string | null>(null)
  const [myProfile,    setMyProfile]    = useState<any>(null)

  // trending state
  const [trending,        setTrending]        = useState<{ tag: string; count: number }[]>([])
  const [trendingCircles, setTrendingCircles] = useState<any[]>([])
  const [localCircles,    setLocalCircles]    = useState<any[]>([])
  const [africanUsers,    setAfricanUsers]    = useState<any[]>([])
  const [loadingTrending, setLoadingTrending] = useState(true)

  // search state
  const [query,       setQuery]       = useState('')
  const [users,       setUsers]       = useState<any[]>([])
  const [circles,     setCircles]     = useState<any[]>([])
  const [hasSearched, setHasSearched] = useState(false)
  const [isPending,   startTransition] = useTransition()

  // ── load user + trending data ──────────────────────────
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      setUserId(user.id)

      const { data: profile } = await supabase
        .from('profiles').select('country, city').eq('id', user.id).single()
      setMyProfile(profile)

      const since = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
      const { data: tags } = await supabase
        .from('hashtags').select('tag').gte('created_at', since)
      const counts = (tags ?? []).reduce((acc: Record<string, number>, h: any) => {
        acc[h.tag] = (acc[h.tag] ?? 0) + 1; return acc
      }, {})
      setTrending(
        Object.entries(counts).sort(([, a], [, b]) => b - a).slice(0, 10)
          .map(([tag, count]) => ({ tag, count }))
      )

      const { data: circles } = await supabase
        .from('circles').select('*, circle_members (user_id)')
        .order('created_at', { ascending: false }).limit(6)
      setTrendingCircles(circles ?? [])

      if (profile?.country) {
        const ids = circles?.map((c: any) => c.id) ?? []
        const q = supabase.from('circles').select('*, circle_members (user_id)')
          .eq('country', profile.country).limit(4)
        if (ids.length > 0) q.not('id', 'in', `(${ids.join(',')})`)
        const { data: local } = await q
        setLocalCircles(local ?? [])
      }

      const { data: people } = await supabase
        .from('profiles').select('id, username, avatar_url, country, city, bio')
        .neq('id', user.id).not('country', 'is', null).limit(8)
      setAfricanUsers(people ?? [])
      setLoadingTrending(false)
    })
  }, []) // eslint-disable-line

  // ── search handler ─────────────────────────────────────
  async function handleSearch(q: string) {
    setQuery(q)
    if (!q.trim()) { setUsers([]); setCircles([]); setHasSearched(false); return }
    startTransition(async () => {
      const term = `%${q.trim()}%`
      const [{ data: foundUsers }, { data: foundCircles }] = await Promise.all([
        supabase.from('profiles').select('id, username, full_name, avatar_url, university').ilike('username', term).limit(10),
        supabase.from('circles').select('id, name, slug, description, university, category, circle_members(user_id)').ilike('name', term).limit(10),
      ])
      setUsers(foundUsers ?? [])
      setCircles(foundCircles ?? [])
      setHasSearched(true)
    })
  }

  const focusSearch = useCallback((el: HTMLInputElement | null) => {
    if (el && tab === 'search') el.focus()
  }, [tab])

  return (
    <main className="w-full max-w-2xl px-4 py-6 space-y-6">

      {/* ── Tab switcher ──────────────────────────────── */}
      <div style={{
        display: 'flex',
        background: 'var(--surface-2)',
        borderRadius: 14,
        padding: 4,
        gap: 4,
      }}>
        {([
          { id: 'trending', label: 'Trending', icon: TrendingUp },
          { id: 'search',   label: 'Search',   icon: Search     },
        ] as const).map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            style={{
              flex: 1,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              padding: '9px 0',
              borderRadius: 10,
              border: 'none',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 700,
              transition: 'all 0.18s',
              background: tab === id ? 'var(--surface-0)' : 'transparent',
              color: tab === id ? 'var(--nia-violet)' : 'var(--text-tertiary)',
              boxShadow: tab === id ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
            }}
          >
            <Icon size={15} strokeWidth={tab === id ? 2.5 : 1.8} />
            {label}
          </button>
        ))}
      </div>

      {/* ════════════════════════════════════════════════
          TRENDING TAB
      ════════════════════════════════════════════════ */}
      {tab === 'trending' && (
        <div className="space-y-8">
          {loadingTrending ? (
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 48 }}>
              <Loader2 size={24} className="animate-spin" style={{ color: 'var(--text-tertiary)' }} />
            </div>
          ) : (
            <>
              {trending.length > 0 && (
                <section>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                    <TrendingUp size={16} style={{ color: 'var(--nia-violet)' }} />
                    <h2 style={{ fontWeight: 800, fontSize: 15 }}>Trending across Africa</h2>
                  </div>
                  <div className="card" style={{ padding: 16 }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {trending.map(({ tag, count }) => (
                        <Link
                          key={tag}
                          href={`/tags/${tag}`}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 6,
                            padding: '7px 14px', borderRadius: 10,
                            fontSize: 13, fontWeight: 700,
                            background: 'rgba(91, 33, 182, 0.07)',
                            color: 'var(--nia-violet)',
                            textDecoration: 'none',
                            transition: 'background 0.15s',
                          }}
                        >
                          #{tag}
                          <span style={{ fontSize: 11, fontWeight: 500, opacity: 0.55 }}>{count}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                </section>
              )}

              {trendingCircles.length > 0 && (
                <section>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                    <Users size={16} style={{ color: 'var(--nia-violet)' }} />
                    <h2 style={{ fontWeight: 800, fontSize: 15 }}>Trending Circles</h2>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
                    {trendingCircles.map(circle => (
                      <CircleCard key={circle.id} circle={circle} currentUserId={userId ?? ''} />
                    ))}
                  </div>
                </section>
              )}

              {localCircles.length > 0 && (
                <section>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                    <MapPin size={16} style={{ color: 'var(--nia-violet)' }} />
                    <h2 style={{ fontWeight: 800, fontSize: 15 }}>
                      In {getFlag(myProfile?.country ?? '')} {myProfile?.country}
                    </h2>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
                    {localCircles.map(circle => (
                      <CircleCard key={circle.id} circle={circle} currentUserId={userId ?? ''} />
                    ))}
                  </div>
                </section>
              )}

              {africanUsers.length > 0 && (
                <section>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                    <Globe2 size={16} style={{ color: 'var(--nia-violet)' }} />
                    <h2 style={{ fontWeight: 800, fontSize: 15 }}>People across Africa</h2>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                    {africanUsers.map((p: any) => (
                      <Link
                        key={p.id}
                        href={`/profile/${p.id}`}
                        className="card card-hover"
                        style={{ padding: 12, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, textDecoration: 'none', textAlign: 'center' }}
                      >
                        <div style={{
                          width: 44, height: 44, borderRadius: '50%',
                          overflow: 'hidden', flexShrink: 0,
                          background: 'var(--grad-brand)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#fff', fontWeight: 700, fontSize: 16,
                        }}>
                          {p.avatar_url
                            ? <img src={p.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
                            : p.username?.[0]?.toUpperCase()}
                        </div>
                        <div style={{ minWidth: 0, width: '100%' }}>
                          <p style={{ fontWeight: 700, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>@{p.username}</p>
                          <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>{getFlag(p.country)} {p.city ?? p.country}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              <section>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <Compass size={16} style={{ color: 'var(--nia-violet)' }} />
                  <h2 style={{ fontWeight: 800, fontSize: 15 }}>Explore by region</h2>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                  {AFRICAN_REGIONS.map(region => (
                    <Link
                      key={region.id}
                      href={`/explore?region=${region.id}`}
                      className="card card-hover"
                      style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, textDecoration: 'none', transition: 'all 0.2s' }}
                    >
                      <span style={{ fontSize: 22 }}>{region.emoji}</span>
                      <div>
                        <p style={{ fontWeight: 700, fontSize: 13 }}>{region.label}</p>
                        <p style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{region.countries.length} countries</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            </>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════
          SEARCH TAB
      ════════════════════════════════════════════════ */}
      {tab === 'search' && (
        <div className="space-y-6">
          <div style={{ position: 'relative' }}>
            <Search size={17} style={{
              position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
              color: 'var(--text-tertiary)', pointerEvents: 'none',
            }} />
            <input
              ref={focusSearch}
              value={query}
              onChange={e => handleSearch(e.target.value)}
              placeholder="Search people and circles…"
              className="input"
              style={{ paddingLeft: 42, paddingRight: 40 }}
            />
            {isPending && (
              <Loader2 size={15} style={{
                position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
                color: 'var(--text-tertiary)',
              }} className="animate-spin" />
            )}
          </div>

          {hasSearched && !isPending && (
            users.length === 0 && circles.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '48px 24px' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🤔</div>
                <p style={{ fontWeight: 700 }}>No results for "{query}"</p>
                <p style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 4 }}>Try a different search term</p>
              </div>
            ) : (
              <div className="space-y-6">
                {users.length > 0 && (
                  <section className="space-y-3">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <User size={14} style={{ color: 'var(--nia-violet)' }} />
                      <h2 style={{ fontWeight: 800, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-tertiary)' }}>
                        People ({users.length})
                      </h2>
                    </div>
                    {users.map(u => (
                      <Link key={u.id} href={`/profile/${u.id}`} className="card card-hover" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 16, textDecoration: 'none' }}>
                        <div style={{
                          width: 40, height: 40, borderRadius: '50%', overflow: 'hidden', flexShrink: 0,
                          background: 'var(--grad-brand)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          color: '#fff', fontWeight: 700, fontSize: 14,
                        }}>
                          {u.avatar_url ? <img src={u.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : u.username?.[0]?.toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontWeight: 700, fontSize: 14 }}>{u.full_name}</p>
                          <p style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>@{u.username}</p>
                        </div>
                        {u.university && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-tertiary)', flexShrink: 0 }}>
                            <MapPin size={11} />
                            <span>{u.university.split(' ').slice(0, 2).join(' ')}</span>
                          </div>
                        )}
                      </Link>
                    ))}
                  </section>
                )}

                {circles.length > 0 && (
                  <section className="space-y-3">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Users size={14} style={{ color: 'var(--nia-violet)' }} />
                      <h2 style={{ fontWeight: 800, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-tertiary)' }}>
                        Circles ({circles.length})
                      </h2>
                    </div>
                    {circles.map(c => (
                      <Link key={c.id} href={`/circles/${c.slug}`} className="card card-hover" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 16, textDecoration: 'none' }}>
                        <div style={{ width: 40, height: 40, borderRadius: 12, flexShrink: 0, background: 'rgba(91,33,182,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🌀</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontWeight: 700, fontSize: 14 }}>{c.name}</p>
                          {c.description && <p style={{ fontSize: 12, color: 'var(--text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.description}</p>}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, color: 'var(--text-tertiary)', flexShrink: 0 }}>
                          <Users size={11} />
                          <span>{c.circle_members?.length ?? 0}</span>
                        </div>
                      </Link>
                    ))}
                  </section>
                )}
              </div>
            )
          )}

          {!hasSearched && !isPending && (
            <div style={{ textAlign: 'center', paddingTop: 48 }}>
              <div style={{ fontSize: 44, marginBottom: 12 }}>✨</div>
              <p style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>Start typing to search</p>
            </div>
          )}
        </div>
      )}
    </main>
  )
}
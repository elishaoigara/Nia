
'use client'

import { useState, useTransition, useEffect, useCallback, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import CircleCard from '@/components/CircleCard'
import FollowButton from '@/components/FollowButton'
import {
  Search, TrendingUp, Users, User,
  MapPin, Globe2, Compass, Loader2,
} from 'lucide-react'
import { AFRICAN_REGIONS, getFlag } from '@/lib/african-data'
import type { Circle, HashtagRow, ProfileSummary } from '@/types/domain'

type Tab = 'trending' | 'search'
type RegionId = 'all' | (typeof AFRICAN_REGIONS)[number]['id']
type LocationProfile = Pick<ProfileSummary, 'country' | 'city'> & { interests?: string[] | null }
type ExplorePerson = Pick<ProfileSummary, 'id' | 'username' | 'full_name' | 'avatar_url' | 'country' | 'city' | 'bio'> & {
  interests?: string[] | null
  is_following?: boolean
  match_reasons?: string[]
}
type RecommendedCircle = Pick<Circle, 'id' | 'name' | 'slug' | 'description' | 'university' | 'category' | 'country' | 'is_private' | 'created_at'> & {
  member_count?: number
  relevance_score?: number
}
type SearchPerson = Pick<ProfileSummary, 'id' | 'username' | 'full_name' | 'avatar_url' | 'university'>

export default function ExplorePage() {
  const supabase = createClient()

  const [tab,          setTab]          = useState<Tab>('trending')
  const [selectedRegion, setSelectedRegion] = useState<RegionId>('all')
  const [userId,       setUserId]       = useState<string | null>(null)
  const [myProfile,    setMyProfile]    = useState<LocationProfile | null>(null)

  // trending state
  const [trending,        setTrending]        = useState<{ tag: string; count: number }[]>([])
  const [trendingCircles, setTrendingCircles] = useState<Circle[]>([])
  const [localCircles,    setLocalCircles]    = useState<Circle[]>([])
  const [suggestedCircles, setSuggestedCircles] = useState<RecommendedCircle[]>([])
  const [africanUsers,    setAfricanUsers]    = useState<ExplorePerson[]>([])
  const [loadingTrending, setLoadingTrending] = useState(true)

  // search state
  const [query,       setQuery]       = useState('')
  const [users,       setUsers]       = useState<SearchPerson[]>([])
  const [circles,     setCircles]     = useState<Circle[]>([])
  const [hasSearched, setHasSearched] = useState(false)
  const [isPending,   startTransition] = useTransition()
  const searchRequest = useRef(0)
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const region = new URLSearchParams(window.location.search).get('region')
    const timer = window.setTimeout(() => {
      if (region && AFRICAN_REGIONS.some(item => item.id === region)) {
        setSelectedRegion(region as RegionId)
      }
    }, 0)
    return () => window.clearTimeout(timer)
  }, [])

  // ── load compact discovery data ─────────────────────────
  useEffect(() => {
    let cancelled = false

    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user || cancelled) return
      setUserId(user.id)

      const { data: profile } = await supabase
        .from('profiles').select('country, city, interests').eq('id', user.id).single()
      if (cancelled) return
      const viewer = profile as LocationProfile | null
      setMyProfile(viewer)

      const since = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()
      const [
        tagsResponse,
        circlesResponse,
        localResponse,
        peopleResponse,
        followsResponse,
        recommendationsResponse,
      ] = await Promise.all([
        supabase.rpc('get_trending_hashtags', { p_since: since, p_limit: 10 }),
        supabase.from('circles')
          .select('id, name, slug, description, university, category, country, is_private, created_at, circle_members(count)')
          .order('created_at', { ascending: false }).limit(6),
        viewer?.country
          ? supabase.from('circles')
              .select('id, name, slug, description, university, category, country, is_private, created_at, circle_members(count)')
              .eq('country', viewer.country).order('created_at', { ascending: false }).limit(6)
          : Promise.resolve({ data: [], error: null }),
        supabase.from('profiles')
          .select('id, username, full_name, avatar_url, country, city, bio, interests')
          .neq('id', user.id).not('country', 'is', null).limit(24),
        supabase.from('follows').select('following_id').eq('follower_id', user.id),
        supabase.rpc('get_recommended_circles', { p_user_id: user.id, p_limit: 8 }),
      ])

      if (cancelled) return

      if (!tagsResponse.error) {
        setTrending(((tagsResponse.data ?? []) as { tag: string; post_count: number }[])
          .map(row => ({ tag: row.tag, count: Number(row.post_count) })))
      } else {
        // Backward-compatible fallback until the Explore migration is applied.
        const { data: tags } = await supabase.from('hashtags').select('tag').gte('created_at', since).limit(300)
        const counts = ((tags ?? []) as HashtagRow[]).reduce((acc: Record<string, number>, hashtag) => {
          acc[hashtag.tag] = (acc[hashtag.tag] ?? 0) + 1
          return acc
        }, {})
        setTrending(Object.entries(counts).sort(([, a], [, b]) => b - a).slice(0, 10).map(([tag, count]) => ({ tag, count })))
      }

      const normalizeCircle = (circle: Record<string, unknown>): Circle => {
        const memberRows = (circle.circle_members as { count?: number }[] | null) ?? []
        return {
          ...(circle as unknown as Circle),
          member_count: memberRows[0]?.count ?? 0,
          circle_members: undefined,
        }
      }
      const recentCircles = ((circlesResponse.data ?? []) as Record<string, unknown>[]).map(normalizeCircle)
      const countryCircles = ((localResponse.data ?? []) as Record<string, unknown>[]).map(normalizeCircle)
      setTrendingCircles(recentCircles)
      setLocalCircles(countryCircles.filter(circle => !recentCircles.some(item => item.id === circle.id)).slice(0, 4))

      const followingIds = new Set(((followsResponse.data ?? []) as { following_id: string }[]).map(row => row.following_id))
      const viewerInterests = new Set((viewer?.interests ?? []).map(interest => interest.toLowerCase()))
      const people = ((peopleResponse.data ?? []) as ExplorePerson[])
        .map(person => {
          const sharedInterests = (person.interests ?? []).filter(interest => viewerInterests.has(interest.toLowerCase()))
          const sameCountry = Boolean(viewer?.country && person.country === viewer.country)
          const matchReasons = [
            sameCountry ? `From ${person.country}` : null,
            sharedInterests.length > 0 ? `${sharedInterests.length} shared interest${sharedInterests.length === 1 ? '' : 's'}` : null,
          ].filter((reason): reason is string => Boolean(reason))
          return {
            ...person,
            is_following: followingIds.has(person.id),
            match_reasons: matchReasons,
            recommendation_score: (sameCountry ? 5 : 0) + sharedInterests.length * 3,
          }
        })
        .sort((a, b) => (b.recommendation_score ?? 0) - (a.recommendation_score ?? 0))
        .slice(0, 8)
      setAfricanUsers(people)

      if (!recommendationsResponse.error) {
        setSuggestedCircles((recommendationsResponse.data ?? []) as RecommendedCircle[])
      } else {
        const fallbackCircles = [...countryCircles, ...recentCircles]
          .filter((circle, index, all) => all.findIndex(item => item.id === circle.id) === index)
          .slice(0, 8)
        setSuggestedCircles(fallbackCircles as RecommendedCircle[])
      }
      setLoadingTrending(false)
    })

    return () => { cancelled = true }
  }, [supabase])

  // ── search handler ─────────────────────────────────────
  function handleSearch(q: string) {
    setQuery(q)
    if (searchDebounce.current) clearTimeout(searchDebounce.current)
    const requestId = ++searchRequest.current
    if (!q.trim()) { setUsers([]); setCircles([]); setHasSearched(false); return }

    searchDebounce.current = setTimeout(() => {
      startTransition(async () => {
        const term = `%${q.trim()}%`
        const [{ data: foundUsers }, { data: foundCircles }] = await Promise.all([
          supabase.from('profiles').select('id, username, full_name, avatar_url, university').ilike('username', term).limit(10),
          supabase.from('circles').select('id, name, slug, description, university, category, circle_members(count)').ilike('name', term).limit(10),
        ])
        if (requestId !== searchRequest.current) return
        setUsers((foundUsers ?? []) as SearchPerson[])
        setCircles((foundCircles ?? []) as unknown as Circle[])
        setHasSearched(true)
      })
    }, 240)
  }

  const focusSearch = useCallback((el: HTMLInputElement | null) => {
    if (el && tab === 'search') el.focus()
  }, [tab])

  const region = selectedRegion === 'all'
    ? null
    : AFRICAN_REGIONS.find(item => item.id === selectedRegion) ?? null
  const isInSelectedRegion = (country?: string | null) =>
    !region || Boolean(country && region.countries.includes(country))
  const visibleNewCircles = trendingCircles.filter(circle => isInSelectedRegion(circle.country))
  const visibleSuggestedCircles = suggestedCircles.filter(circle => isInSelectedRegion(circle.country))
  const visibleLocalCircles = localCircles.filter(circle => isInSelectedRegion(circle.country))
  const visiblePeople = africanUsers.filter(person => isInSelectedRegion(person.country))
  const hasRegionResults = visibleNewCircles.length + visibleSuggestedCircles.length + visibleLocalCircles.length + visiblePeople.length > 0

  function selectRegion(nextRegion: RegionId) {
    setSelectedRegion(nextRegion)
    const url = new URL(window.location.href)
    if (nextRegion === 'all') url.searchParams.delete('region')
    else url.searchParams.set('region', nextRegion)
    window.history.replaceState({}, '', `${url.pathname}${url.search}`)
  }

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
          { id: 'trending', label: 'Discover', icon: TrendingUp },
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
              {/* Region filter pills */}
              <div className="region-pills hidden-scrollbar" style={{ margin: '-6px -16px 12px', padding: '8px 16px' }}>
                {[
                  { id: 'all' as const, label: '🌍 All Africa' },
                  ...AFRICAN_REGIONS.map(item => ({ id: item.id, label: `${item.emoji} ${item.label.replace(' Africa', '')}` })),
                ].map(item => (
                  <button
                    key={item.id}
                    type="button"
                    className={`region-pill${selectedRegion === item.id ? ' active' : ''}`}
                    aria-pressed={selectedRegion === item.id}
                    onClick={() => selectRegion(item.id as RegionId)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {trending.length > 0 && (
                <section>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, paddingBottom: 2 }}>
                    <TrendingUp size={14} style={{ color: 'var(--text-tertiary)' }} />
                    <h2 style={{ fontWeight: 700, fontSize: 12, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Trending across Nia</h2>
                  </div>
                  <div className="tag-cloud" style={{ padding: '0 0 4px' }}>
                    {trending.map(({ tag, count }, i) => {
                      const size = i === 0 ? 'size-lg' : i < 4 ? 'size-md' : 'size-sm'
                      return (
                        <Link
                          key={tag}
                          href={`/tags/${tag}`}
                          className={`tag-cloud-pill ${size}`}
                        >
                          #{tag}
                          {count > 1 && <span className="tag-count">{count}</span>}
                        </Link>
                      )
                    })}
                  </div>
                </section>
              )}

              {visibleNewCircles.length > 0 && (
                <section>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                    <Users size={16} style={{ color: 'var(--nia-violet)' }} />
                    <h2 style={{ fontWeight: 800, fontSize: 15 }}>New Circles{region ? ` in ${region.label}` : ''}</h2>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
                    {visibleNewCircles.map(circle => (
                      <CircleCard key={circle.id} circle={circle} currentUserId={userId ?? ''} />
                    ))}
                  </div>
                </section>
              )}

              {visibleSuggestedCircles.length > 0 && (
                <section>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <Users size={16} style={{ color: 'var(--nia-violet)' }} />
                    <h2 style={{ fontWeight: 800, fontSize: 15 }}>Circles for you</h2>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 14 }}>
                    Based on your interests and where you are.
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
                    {visibleSuggestedCircles.map(circle => (
                      <CircleCard key={circle.id} circle={circle as Circle} currentUserId={userId ?? ''} />
                    ))}
                  </div>
                </section>
              )}

              {visibleLocalCircles.length > 0 && (
                <section>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                    <MapPin size={16} style={{ color: 'var(--nia-violet)' }} />
                    <h2 style={{ fontWeight: 800, fontSize: 15 }}>
                      In {getFlag(myProfile?.country ?? '')} {myProfile?.country}
                    </h2>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
                    {visibleLocalCircles.map(circle => (
                      <CircleCard key={circle.id} circle={circle} currentUserId={userId ?? ''} />
                    ))}
                  </div>
                </section>
              )}

              {visiblePeople.length > 0 && (
                <section>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <Globe2 size={16} style={{ color: 'var(--nia-violet)' }} />
                    <h2 style={{ fontWeight: 800, fontSize: 15 }}>People to meet</h2>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 14 }}>
                    Find voices from your country and across the continent.
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 10 }}>
                    {visiblePeople.map(p => (
                      <div key={p.id} className="card card-hover" style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <Link href={`/profile/${p.id}`} style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, textDecoration: 'none' }}>
                          <div style={{
                            width: 46, height: 46, borderRadius: '50%',
                            overflow: 'hidden', flexShrink: 0,
                            background: 'var(--grad-brand)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#fff', fontWeight: 800, fontSize: 16,
                          }}>
                            {p.avatar_url
                              ? <img src={p.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" loading="lazy" />
                              : p.username?.[0]?.toUpperCase()}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <p style={{ fontWeight: 800, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.full_name || `@${p.username}`}</p>
                            <p style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              @{p.username} · {getFlag(p.country ?? '')} {p.city ?? p.country}
                            </p>
                          </div>
                        </Link>
                        {p.match_reasons && p.match_reasons.length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                            {p.match_reasons.map(reason => (
                              <span key={reason} style={{ fontSize: 10, fontWeight: 700, color: 'var(--nia-violet)', background: 'rgba(91,33,182,0.08)', borderRadius: 999, padding: '4px 7px' }}>
                                {reason}
                              </span>
                            ))}
                          </div>
                        )}
                        {p.bio && (
                          <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.45, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {p.bio}
                          </p>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'auto' }}>
                          <FollowButton
                            currentUserId={userId ?? ''}
                            targetUserId={p.id}
                            initialIsFollowing={Boolean(p.is_following)}
                            onFollowChange={isFollowing => setAfricanUsers(current => current.map(person => person.id === p.id ? { ...person, is_following: isFollowing } : person))}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {region && !hasRegionResults && (
                <div className="card" style={{ textAlign: 'center', padding: '32px 20px' }}>
                  <span style={{ fontSize: 32 }}>{region.emoji}</span>
                  <p style={{ fontWeight: 800, marginTop: 8 }}>No matches in {region.label} yet</p>
                  <p style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 4 }}>Try all Africa, or help this region grow by inviting your community.</p>
                  <button type="button" className="btn-ghost" style={{ marginTop: 14 }} onClick={() => selectRegion('all')}>Show all Africa</button>
                </div>
              )}

              <section>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <Compass size={16} style={{ color: 'var(--nia-violet)' }} />
                  <h2 style={{ fontWeight: 800, fontSize: 15 }}>Explore by region</h2>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                  {AFRICAN_REGIONS.map(region => (
                    <button
                      key={region.id}
                      type="button"
                      onClick={() => selectRegion(region.id as RegionId)}
                      className="card card-hover"
                      style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', color: 'inherit', cursor: 'pointer', transition: 'all 0.2s' }}
                    >
                      <span style={{ fontSize: 22 }}>{region.emoji}</span>
                      <div>
                        <p style={{ fontWeight: 700, fontSize: 13 }}>{region.label}</p>
                        <p style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>{region.countries.length} countries</p>
                      </div>
                    </button>
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
                <p style={{ fontWeight: 700 }}>No results for “{query}”</p>
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
                          <span>{c.member_count ?? c.circle_members?.[0]?.count ?? c.circle_members?.length ?? 0}</span>
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

'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import CircleCard, { CATEGORY_COLORS, CATEGORY_EMOJI } from '@/components/CircleCard'
import CreateCircle from '@/components/CreateCircle'
import { Search, Users, Loader2 } from 'lucide-react'
import type { Circle } from '@/types/domain'

const CATEGORIES = ['tech', 'art', 'sports', 'music', 'science']

export default function CirclesPage() {
  const supabase = createClient()
  const router = useRouter()

  const [userId, setUserId] = useState<string | null>(null)
  const [circles, setCircles] = useState<Circle[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      if (cancelled) return
      setUserId(user.id)

      const { data } = await supabase
        .from('circles')
        .select('*, circle_members (user_id)')
        .order('created_at', { ascending: false })

      if (!cancelled) {
        setCircles((data ?? []) as unknown as Circle[])
        setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [router, supabase])

  const yourCircles = useMemo(
    () => circles.filter(circle => circle.circle_members?.some(member => member.user_id === userId)),
    [circles, userId]
  )

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase()
    return circles.filter(c => {
      const matchesTerm = !term
        || c.name?.toLowerCase().includes(term)
        || c.description?.toLowerCase().includes(term)
        || c.university?.toLowerCase().includes(term)
      const matchesCategory = !category || (c.category?.toLowerCase() ?? '') === category
      return matchesTerm && matchesCategory
    })
  }, [circles, query, category])

  return (
    <main className="w-full max-w-2xl px-4 py-6 space-y-6">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Users size={20} style={{ color: 'var(--nia-violet)' }} />
          <h1 className="font-extrabold text-xl">Circles</h1>
        </div>
        {userId && <CreateCircle userId={userId} />}
      </div>

      {/* Search */}
      <div style={{ position: 'relative' }}>
        <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search circles by name, campus, or topic…"
          style={{
            width: '100%', padding: '11px 14px 11px 38px', borderRadius: 14,
            border: '1px solid var(--border)', background: 'var(--surface-0)',
            color: 'var(--text-primary)', fontSize: 14, fontFamily: 'inherit',
          }}
        />
      </div>

      {/* Category filter */}
      <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2, WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
        <button
          onClick={() => setCategory(null)}
          className="tap-sm"
          style={{
            flexShrink: 0, padding: '7px 14px', borderRadius: 20, fontWeight: 700, fontSize: 12.5,
            fontFamily: 'inherit', cursor: 'pointer',
            border: '1px solid ' + (category === null ? 'var(--nia-violet)' : 'var(--border)'),
            background: category === null ? 'var(--nia-violet)' : 'var(--surface-0)',
            color: category === null ? '#fff' : 'var(--text-secondary)',
          }}
        >
          All
        </button>
        {CATEGORIES.map(cat => {
          const active = category === cat
          const color = CATEGORY_COLORS[cat] ?? CATEGORY_COLORS.default
          const emoji = CATEGORY_EMOJI[cat] ?? CATEGORY_EMOJI.default
          return (
            <button
              key={cat}
              onClick={() => setCategory(active ? null : cat)}
              className="tap-sm"
              style={{
                flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5,
                padding: '7px 14px', borderRadius: 20, fontWeight: 700, fontSize: 12.5,
                fontFamily: 'inherit', cursor: 'pointer',
                border: '1px solid ' + (active ? color : 'var(--border)'),
                background: active ? color : 'var(--surface-0)',
                color: active ? '#fff' : 'var(--text-secondary)',
                textTransform: 'capitalize',
              }}
            >
              <span>{emoji}</span> {cat}
            </button>
          )
        })}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
          <Loader2 size={24} className="animate-spin" style={{ color: 'var(--text-tertiary)' }} />
        </div>
      ) : (
        <>
          {/* Your circles */}
          {!query && !category && yourCircles.length > 0 && (
            <section className="space-y-3">
              <h2 style={{ fontWeight: 800, fontSize: 15 }}>Your Circles</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
                {yourCircles.map(circle => (
                  <CircleCard key={circle.id} circle={circle} currentUserId={userId ?? ''} />
                ))}
              </div>
            </section>
          )}

          {/* All / filtered circles */}
          <section className="space-y-3">
            <h2 style={{ fontWeight: 800, fontSize: 15 }}>
              {query || category ? `Results (${filtered.length})` : 'All Circles'}
            </h2>
            {filtered.length === 0 ? (
              <div className="card text-center py-14 space-y-2">
                <div className="text-4xl">🔎</div>
                <p className="font-bold">No circles found</p>
                <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                  Try a different search, or start your own circle.
                </p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
                {filtered.map(circle => (
                  <CircleCard key={circle.id} circle={circle} currentUserId={userId ?? ''} />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </main>
  )
}
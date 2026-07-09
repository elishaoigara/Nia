'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Play, Heart } from 'lucide-react'

const CATEGORY_EMOJI: Record<string, string> = {
  tech: '💻', art: '🎨', sports: '⚽', music: '🎵', science: '🔬', default: '✨',
}
const CATEGORY_COLORS: Record<string, string> = {
  tech: 'var(--nia-sky)', art: 'var(--nia-pink)', sports: 'var(--nia-mint)',
  music: 'var(--nia-amber)', science: 'var(--nia-violet)', default: 'var(--nia-coral)',
}

export interface HomeCircle {
  id: string
  name: string
  slug: string
  category: string | null
}

export interface HomeFlick {
  id: string
  media_url: string
  thumbnail_url?: string | null
  profiles: { username: string; avatar_url: string | null } | null
  likes?: { user_id: string }[]
}

// Shows "Your Circles" and "Trending" as a single segmented rail rather than
// two stacked strips, so people see one horizontal row — not three rails of
// teasers (Stories, Circles, Trending) — before they hit an actual post.
export default function HomeRail({ circles, flicks }: { circles: HomeCircle[]; flicks: HomeFlick[] }) {
  const hasCircles = circles.length > 0
  const hasFlicks = flicks.length > 0
  const [tab, setTab] = useState<'circles' | 'trending'>(hasFlicks ? 'trending' : 'circles')

  if (!hasCircles && !hasFlicks) return null

  const showCircles = hasCircles && (tab === 'circles' || !hasFlicks)
  const showFlicks = hasFlicks && (tab === 'trending' || !hasCircles)

  return (
    <div style={{ padding: '14px 14px 4px' }}>
      {hasCircles && hasFlicks ? (
        <div style={{ display: 'inline-flex', background: 'var(--surface-2)', borderRadius: 12, padding: 3, marginBottom: 12, gap: 2 }}>
          {(['circles', 'trending'] as const).map(key => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className="tap-sm"
              style={{
                padding: '6px 14px', borderRadius: 9, border: 'none', cursor: 'pointer',
                fontSize: 12.5, fontWeight: 700, fontFamily: 'inherit',
                background: tab === key ? 'var(--surface-0)' : 'transparent',
                color: tab === key ? 'var(--text-primary)' : 'var(--text-tertiary)',
                boxShadow: tab === key ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'background 0.15s, color 0.15s',
              }}
            >
              {key === 'circles' ? 'Your Circles' : '🔥 Trending'}
            </button>
          ))}
        </div>
      ) : (
        <p style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-tertiary)', margin: '0 0 10px' }}>
          {showFlicks ? '🔥 Trending Flicks' : 'Your Circles'}
        </p>
      )}

      {showCircles && (
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
          {circles.map(c => {
            const cat = c.category?.toLowerCase() ?? 'default'
            const emoji = CATEGORY_EMOJI[cat] ?? CATEGORY_EMOJI.default
            const color = CATEGORY_COLORS[cat] ?? CATEGORY_COLORS.default
            return (
              <Link
                key={c.id}
                href={`/circles/${c.slug}`}
                className="tap-sm"
                style={{
                  display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
                  background: 'var(--surface-1)', border: '1px solid var(--border)',
                  borderRadius: 20, padding: '6px 12px 6px 6px', textDecoration: 'none',
                }}
              >
                <span style={{
                  width: 24, height: 24, borderRadius: '50%', background: color,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, flexShrink: 0,
                }}>
                  {emoji}
                </span>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                  {c.name}
                </span>
              </Link>
            )
          })}
          <Link
            href="/circles"
            className="tap-sm"
            style={{
              display: 'flex', alignItems: 'center', flexShrink: 0, fontSize: 12.5, fontWeight: 700,
              color: 'var(--nia-violet)', padding: '6px 12px', whiteSpace: 'nowrap', textDecoration: 'none',
            }}
          >
            See all →
          </Link>
        </div>
      )}

      {showFlicks && (
        <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4, WebkitOverflowScrolling: 'touch' } as React.CSSProperties}>
          {flicks.map(f => {
            const likeCount = f.likes?.length ?? 0
            return (
              <Link
                key={f.id}
                href={`/flicks?v=${f.id}`}
                className="tap-sm"
                style={{
                  position: 'relative', flexShrink: 0, width: 108, height: 152, borderRadius: 14,
                  overflow: 'hidden', textDecoration: 'none', display: 'block',
                  background: f.thumbnail_url ? 'var(--surface-2)' : 'var(--grad-brand)',
                }}
              >
                {/* Teaser rail only — never mounts a real <video>, just a poster
                    image if one exists, so scrolling past this never pulls video
                    bytes over the network. Tapping hands off to /flicks itself. */}
                {f.thumbnail_url && (
                  <img
                    src={f.thumbnail_url}
                    alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                )}
                <div style={{
                  position: 'absolute', inset: 0,
                  background: 'linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0) 45%)',
                }} />
                <div style={{
                  position: 'absolute', top: 8, right: 8, width: 22, height: 22, borderRadius: '50%',
                  background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Play size={11} color="#fff" fill="#fff" />
                </div>
                <div style={{ position: 'absolute', bottom: 8, left: 8, right: 8 }}>
                  <p style={{
                    color: '#fff', fontSize: 11, fontWeight: 700, margin: 0,
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    @{f.profiles?.username ?? 'nia'}
                  </p>
                  {likeCount > 0 && (
                    <p style={{
                      color: 'rgba(255,255,255,0.85)', fontSize: 10, margin: '2px 0 0',
                      display: 'flex', alignItems: 'center', gap: 3,
                    }}>
                      <Heart size={9} fill="#fff" color="#fff" /> {likeCount}
                    </p>
                  )}
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
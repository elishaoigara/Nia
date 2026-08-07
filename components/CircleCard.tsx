'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Users, Lock, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { Circle, CircleMember } from '@/types/domain'

export const CATEGORY_COLORS: Record<string, string> = {
  tech:    'var(--nia-sky)',
  art:     'var(--nia-pink)',
  sports:  'var(--nia-mint)',
  music:   'var(--nia-amber)',
  science: 'var(--nia-violet)',
  default: 'var(--nia-coral)',
}

export const CATEGORY_EMOJI: Record<string, string> = {
  tech: '💻', art: '🎨', sports: '⚽', music: '🎵', science: '🔬', default: '✨'
}

interface CircleCardProps {
  circle: Circle
  currentUserId: string
}

export default function CircleCard({ circle, currentUserId }: CircleCardProps) {
  const supabase = createClient()
  const router = useRouter()
  const isMember = circle.circle_members?.some((member: CircleMember) => member.user_id === currentUserId)
  const [joined, setJoined] = useState(isMember)
  const [memberCount, setMemberCount] = useState(circle.circle_members?.length ?? 0)
  const [requested, setRequested] = useState(false)
  const [loading, setLoading] = useState(false)

  const cat = circle.category?.toLowerCase() ?? 'default'
  const color = CATEGORY_COLORS[cat] ?? CATEGORY_COLORS.default
  const emoji = CATEGORY_EMOJI[cat] ?? CATEGORY_EMOJI.default

  async function toggleJoin(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()

    setLoading(true)
    if (joined) {
      await supabase.from('circle_members').delete().match({ circle_id: circle.id, user_id: currentUserId })
      setMemberCount((c: number) => Math.max(0, c - 1))
      setJoined(false)
    } else if (circle.is_private) {
      // Private circles don't get instant membership from the list view —
      // this opens (or re-opens, after a decline) a pending join request.
      // The circle's own page shows the fuller "Requested / cancel" state;
      // here we just optimistically flip the button so it doesn't look
      // like nothing happened.
      if (!requested) {
        await supabase.from('circle_join_requests')
          .upsert({ circle_id: circle.id, user_id: currentUserId, status: 'pending' }, { onConflict: 'circle_id,user_id' })
        setRequested(true)
      }
    } else {
      await supabase.from('circle_members').insert({ circle_id: circle.id, user_id: currentUserId })
      setMemberCount((c: number) => c + 1)
      setJoined(true)
    }
    setLoading(false)
    router.refresh()
  }

  return (
    <Link href={`/circles/${circle.slug}`} className="block group h-full">
      {/* Implemented hover:border-(--border) */}
      <div className="card card-hover p-5 h-full flex flex-col gap-4 border border-transparent hover:border-(--border) transition-all duration-200" style={{ background: 'var(--surface-0)' }}>
        
        {/* Top: emoji + name */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shrink-0 transition-transform group-hover:scale-105"
              style={{ background: `color-mix(in srgb, ${color} 15%, transparent)` }}
            >
              <span style={{ opacity: 1 }}>{emoji}</span>
            </div>
            
            <div className="min-w-0">
              {/* Implemented group-hover:text-(--nia-violet) */}
              <h3 className="font-bold text-base leading-tight group-hover:text-(--nia-violet) transition-colors truncate">
                {circle.name}
              </h3>
              
              <div className="flex items-center gap-2 mt-1">
                {circle.university && (
                  <p className="text-xs truncate font-medium" style={{ color: 'var(--text-tertiary)' }}>
                    {circle.university.split(' ').slice(0, 3).join(' ')}
                  </p>
                )}
                <span className="inline-block w-1 h-1 rounded-full shrink-0" style={{ background: 'var(--border)' }} />
                <span className="text-[10px] uppercase font-bold tracking-wider" style={{ color: color }}>
                  {cat}
                </span>
              </div>
            </div>
          </div>

          {circle.is_private && (
            <div className="p-1.5 rounded-lg shrink-0" style={{ background: 'var(--surface-1)' }}>
              <Lock size={13} style={{ color: 'var(--text-tertiary)' }} />
            </div>
          )}
        </div>

        {/* Description */}
        {circle.description && (
          <p className="text-sm leading-relaxed line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
            {circle.description}
          </p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between mt-auto pt-2 border-t border-dashed" style={{ borderColor: 'var(--border)' }}>
          <div className="flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
            <div className="p-1 rounded-md" style={{ background: 'var(--surface-1)' }}>
              <Users size={13} style={{ color: 'var(--text-tertiary)' }} />
            </div>
            <div className="text-xs font-medium">
              <span className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>{memberCount}</span> members
            </div>
          </div>

          {/* Implemented min-w-19 */}
          <button
            onClick={toggleJoin}
            disabled={loading || requested}
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center min-w-19"
            style={joined || requested
              ? { background: 'var(--surface-2)', color: 'var(--text-secondary)' }
              : { backgroundColor: color, color: '#fff' }
            }
          >
            {loading ? (
              <Loader2 size={13} className="animate-spin" />
            ) : joined ? (
              'Leave'
            ) : requested ? (
              'Requested'
            ) : circle.is_private ? (
              'Request'
            ) : (
              'Join'
            )}
          </button>
        </div>
      </div>
    </Link>
  )
}
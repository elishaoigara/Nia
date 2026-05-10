'use client'
import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Users, Lock } from 'lucide-react'
import { useRouter } from 'next/navigation'

const CATEGORY_COLORS: Record<string, string> = {
  tech:    'var(--nia-sky)',
  art:     'var(--nia-pink)',
  sports:  'var(--nia-mint)',
  music:   'var(--nia-amber)',
  science: 'var(--nia-violet)',
  default: 'var(--nia-coral)',
}

const CATEGORY_EMOJI: Record<string, string> = {
  tech: '💻', art: '🎨', sports: '⚽', music: '🎵', science: '🔬', default: '✨'
}

export default function CircleCard({ circle, currentUserId }: any) {
  const supabase = createClient()
  const router = useRouter()
  const isMember = circle.circle_members?.some((m: any) => m.user_id === currentUserId)
  const [joined, setJoined] = useState(isMember)
  const [memberCount, setMemberCount] = useState(circle.circle_members?.length ?? 0)
  const [loading, setLoading] = useState(false)

  const cat = circle.category?.toLowerCase() ?? 'default'
  const color = CATEGORY_COLORS[cat] ?? CATEGORY_COLORS.default
  const emoji = CATEGORY_EMOJI[cat] ?? CATEGORY_EMOJI.default

  async function toggleJoin(e: React.MouseEvent) {
    e.preventDefault()
    setLoading(true)
    if (joined) {
      await supabase.from('circle_members').delete().match({ circle_id: circle.id, user_id: currentUserId })
      setMemberCount((c: number) => c - 1)
    } else {
      await supabase.from('circle_members').insert({ circle_id: circle.id, user_id: currentUserId })
      setMemberCount((c: number) => c + 1)
    }
    setJoined(!joined)
    setLoading(false)
    router.refresh()
  }

  return (
    <Link href={`/circles/${circle.slug}`} className="block group">
      <div className="card card-hover p-4 h-full flex flex-col gap-3">
        {/* Top: emoji + name */}
        <div className="flex items-start gap-3">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
            style={{ background: `${color}22` }}
          >
            {emoji}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-base leading-tight group-hover:underline truncate">
              {circle.name}
            </h3>
            {circle.university && (
              <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-tertiary)' }}>
                {circle.university.split(' ').slice(0, 3).join(' ')}
              </p>
            )}
          </div>
          {circle.is_private && <Lock size={14} style={{ color: 'var(--text-tertiary)' }} />}
        </div>

        {/* Description */}
        {circle.description && (
          <p className="text-sm leading-relaxed line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
            {circle.description}
          </p>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between mt-auto pt-1">
          <div className="flex items-center gap-1.5" style={{ color: 'var(--text-tertiary)' }}>
            <Users size={14} />
            <span className="text-sm font-semibold">{memberCount}</span>
            <span className="text-xs">members</span>
          </div>

          <button
            onClick={toggleJoin}
            disabled={loading}
            className="px-4 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-90 disabled:opacity-50"
            style={joined
              ? { background: 'var(--surface-3)', color: 'var(--text-secondary)' }
              : { background: color + '22', color }
            }
          >
            {loading ? '…' : joined ? 'Joined ✓' : '+ Join'}
          </button>
        </div>
      </div>
    </Link>
  )
}

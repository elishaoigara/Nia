'use client'

import { useState, useRef, useEffect } from 'react'
import { Image, AtSign, Hash, MapPin, Smile, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface CreatePostProps {
  userId: string
  circleId?: string
}

export default function CreatePost({ userId, circleId }: CreatePostProps) {
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [profile, setProfile] = useState<any>(null)
  const textRef = useRef<HTMLTextAreaElement>(null)
  const router = useRouter()
  const supabase = createClient()

  const MAX_CHARS = 500

  // Corrected implementation: Side effects belong inside an explicit useEffect hook
  useEffect(() => {
    supabase.from('profiles').select('username, avatar_url').eq('id', userId).single()
      .then(({ data }) => setProfile(data))
  }, [userId, supabase])

  const autoResize = () => {
    const t = textRef.current
    if (t) {
      t.style.height = 'auto'
      t.style.height = `${t.scrollHeight}px`
    }
  }

  const handlePost = async () => {
    if (!content.trim() || loading || content.length > MAX_CHARS) return
    setLoading(true)
    const { error } = await supabase.from('posts').insert({
      user_id: userId,
      content: content.trim(),
      ...(circleId ? { circle_id: circleId } : {}),
    })
    if (!error) {
      setContent('')
      if (textRef.current) textRef.current.style.height = 'auto'
      router.refresh()
    }
    setLoading(false)
  }

  const charsLeft = MAX_CHARS - content.length
  const isOverLimit = charsLeft < 0
  const isNearLimit = charsLeft <= 50

  return (
    <div className="w-full rounded-2xl p-4 border transition-all duration-200 focus-within:border-(--nia-violet)" style={{ background: 'var(--surface-0)', borderColor: 'var(--border)' }}>
      
      {/* Top Main Input Grid Layout Container Row */}
      <div className="flex items-start gap-3">
        {/* User Profile Identity Icon Wrapper */}
        <div 
          className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center font-bold text-sm text-white shrink-0 select-none"
          style={{ background: 'var(--grad-brand)' }}
        >
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} className="w-full h-full object-cover" alt={profile?.username || "Your avatar"} />
          ) : (
            profile?.username?.[0]?.toUpperCase() ?? '?'
          )}
        </div>

        {/* Dynamic Multi-line Input Field Frame Area */}
        <div className="flex-1 min-w-0">
          {/* Updated from min-h-[40px] to canonical scale min-h-10 */}
          <textarea
            ref={textRef}
            className="w-full min-h-10 bg-transparent border-0 p-0 pt-2 text-[15px] leading-relaxed resize-none focus:ring-0 focus:outline-hidden placeholder-slate-500"
            style={{ color: 'var(--text-primary)' }}
            placeholder="What's on your mind?"
            value={content}
            onChange={e => { setContent(e.target.value); autoResize() }}
            rows={1}
            onKeyDown={e => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                handlePost()
              }
            }}
          />
        </div>
      </div>

      {/* Structural Divider Element Line Layout */}
      <div className="my-3 border-t border-dashed" style={{ borderColor: 'var(--border)' }} />

      {/* Attachment Actions and CTA Button Control Footer Row */}
      <div className="flex items-center justify-between gap-4">
        {/* Attachment Options Node List */}
        <div className="flex items-center gap-1">
          {[
            { icon: Image, label: 'Add image' },
            { icon: AtSign, label: 'Mention' },
            { icon: Hash, label: 'Hashtag' },
            { icon: MapPin, label: 'Location' },
            { icon: Smile, label: 'Emoji' }
          ].map((item, index) => (
            <button 
              key={index}
              className="p-2 rounded-xl transition-colors text-slate-400 hover:text-(--nia-violet) hover:bg-(--surface-1) active:scale-95" 
              aria-label={item.label}
            >
              <item.icon size={18} strokeWidth={2} />
            </button>
          ))}
        </div>

        {/* Right Metric Processing Node Wrapper Alignments */}
        <div className="flex items-center gap-3">
          {/* Character Limitation Counting Tag Metric */}
          {content.length > 0 && (
            <span 
              className={`text-xs font-bold font-mono transition-colors duration-150 ${
                isOverLimit ? 'text-rose-500' : isNearLimit ? 'text-amber-500' : ''
              }`}
              style={{ color: (!isOverLimit && !isNearLimit) ? 'var(--text-tertiary)' : undefined }}
            >
              {charsLeft}
            </span>
          )}

          {/* Action Execution Submission Component Trigger Control */}
          <button
            onClick={handlePost}
            disabled={!content.trim() || loading || isOverLimit}
            className="px-4 py-1.5 rounded-xl text-xs font-bold text-white transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none min-w-16 flex items-center justify-center shadow-xs"
            style={{ background: 'var(--grad-brand)' }}
          >
            {loading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              'Post'
            )}
          </button>
        </div>
      </div>

    </div>
  )
}
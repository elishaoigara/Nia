'use client'

import { useState, useRef } from 'react'
import { Image, AtSign, Hash, MapPin, Smile } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface CreatePostProps {
  userId: string
  circleId?: string
}

export default function CreatePost({ userId, circleId }: CreatePostProps) {
  const [content, setContent] = useState('')
  const [loading, setLoading]  = useState(false)
  const [profile, setProfile]  = useState<any>(null)
  const textRef = useRef<HTMLTextAreaElement>(null)
  const router  = useRouter()
  const supabase = createClient()

  // Fetch own profile once
  useState(() => {
    supabase.from('profiles').select('username, avatar_url').eq('id', userId).single()
      .then(({ data }) => setProfile(data))
  })

  const autoResize = () => {
    const t = textRef.current
    if (t) { t.style.height = 'auto'; t.style.height = t.scrollHeight + 'px' }
  }

  const handlePost = async () => {
    if (!content.trim() || loading) return
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

  return (
    <div>
      {/* Compose row */}
      <div className="compose-row">
        {/* Avatar */}
        <div className="compose-left">
          <div style={{
            width: 40, height: 40, borderRadius: '50%', overflow: 'hidden',
            background: 'var(--grad-brand)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontWeight: 700, fontSize: 15,
            flexShrink: 0,
          }}>
            {profile?.avatar_url
              ? <img src={profile.avatar_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
              : (profile?.username?.[0]?.toUpperCase() ?? '?')
            }
          </div>
        </div>

        {/* Input + post button */}
        <div className="compose-right">
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <textarea
              ref={textRef}
              className="compose-input"
              placeholder="What's on your mind?"
              value={content}
              onChange={e => { setContent(e.target.value); autoResize() }}
              rows={1}
              onKeyDown={e => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handlePost()
              }}
            />
            <button
              className="btn-post"
              onClick={handlePost}
              disabled={!content.trim() || loading}
              style={{ flexShrink: 0, marginTop: 2 }}
            >
              {loading ? '…' : 'Post'}
            </button>
          </div>
        </div>
      </div>

      {/* Attachment bar */}
      <div className="compose-footer">
        <div className="compose-attach-btns">
          <button className="compose-attach-btn" aria-label="Add image"><Image size={20} /></button>
          <button className="compose-attach-btn" aria-label="Mention"><AtSign size={20} /></button>
          <button className="compose-attach-btn" aria-label="Hashtag"><Hash size={20} /></button>
          <button className="compose-attach-btn" aria-label="Location"><MapPin size={20} /></button>
          <button className="compose-attach-btn" aria-label="Emoji"><Smile size={20} /></button>
        </div>
        {content.length > 0 && (
          <span style={{ fontSize: 12, color: content.length > 400 ? '#e0245e' : 'var(--text-tertiary)' }}>
            {500 - content.length}
          </span>
        )}
      </div>
    </div>
  )
}

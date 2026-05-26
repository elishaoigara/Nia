'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Send, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface ReplyBarProps {
  postId:        string
  currentUserId: string
}

export default function ReplyBar({ postId, currentUserId }: ReplyBarProps) {
  const supabase = createClient()
  const router   = useRouter()

  const [text,    setText]    = useState('')
  const [loading, setLoading] = useState(false)
  const [profile, setProfile] = useState<any>(null)

  useEffect(() => {
    supabase.from('profiles').select('username, avatar_url').eq('id', currentUserId).single()
      .then(({ data }) => setProfile(data))
  }, [currentUserId]) // eslint-disable-line

  async function submit() {
    if (!text.trim() || loading) return
    setLoading(true)
    const { error } = await supabase.from('comments').insert({
      post_id: postId,
      user_id: currentUserId,
      content: text.trim(),
    })
    if (!error) {
      setText('')
      router.refresh()
    }
    setLoading(false)
  }

  const initials = profile?.username?.[0]?.toUpperCase() ?? '?'

  return (
    <div
      className="reply-bar"
      style={{
        position: 'fixed',
        bottom: 'var(--nav-bottom)',
        left: 0, right: 0,
        maxWidth: 620,
        margin: '0 auto',
      }}
    >
      {/* Mini avatar */}
      <div style={{
        width: 30, height: 30, borderRadius: '50%',
        background: 'var(--grad-brand)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontWeight: 700, fontSize: 12,
        overflow: 'hidden', flexShrink: 0,
      }}>
        {profile?.avatar_url
          ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : initials
        }
      </div>

      <input
        className="reply-input"
        placeholder="Reply…"
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() } }}
        disabled={loading}
      />

      <button
        onClick={submit}
        disabled={!text.trim() || loading}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: text.trim() ? 'var(--nia-violet)' : 'var(--text-tertiary)',
          display: 'flex',
          alignItems: 'center',
          padding: 4,
          transition: 'color 0.15s',
        }}
        aria-label="Send reply"
      >
        {loading
          ? <Loader2 size={18} className="animate-spin" />
          : <Send size={18} strokeWidth={2} />
        }
      </button>
    </div>
  )
}
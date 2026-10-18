'use client'

import { mediaUrl } from '@/lib/media-url'
import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Send, Loader2, ImagePlus, Video, X, Play } from 'lucide-react'
import { useRouter } from 'next/navigation'
import type { GifApiResult } from '@/types/domain'

interface ReplyBarProps {
  postId:        string
  currentUserId: string
  postOwnerId?:  string
  currentUserProfile?: { avatar_url?: string | null; username?: string }
}

const MAX_TEXT     = 500
const MAX_IMAGES   = 4
const MAX_VIDEO_MB = 50

const TENOR_KEY = process.env.NEXT_PUBLIC_TENOR_API_KEY ?? ''

interface MediaItem {
  file?:   File
  preview: string
  type:    'image' | 'video' | 'gif'
  gifUrl?: string
}

interface GifResult {
  url:     string
  preview: string
}

const FALLBACK_GIFS: GifResult[] = [
  { url: 'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif', preview: 'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy_s.gif' },
  { url: 'https://media.giphy.com/media/3o7TKSjRrfIPjeiVyM/giphy.gif', preview: 'https://media.giphy.com/media/3o7TKSjRrfIPjeiVyM/giphy_s.gif' },
  { url: 'https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif',  preview: 'https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy_s.gif' },
  { url: 'https://media.giphy.com/media/l46CyJmS9KUbokzsI/giphy.gif',  preview: 'https://media.giphy.com/media/l46CyJmS9KUbokzsI/giphy_s.gif' },
]

export default function ReplyBar({ postId, currentUserId, postOwnerId, currentUserProfile }: ReplyBarProps) {
  const supabase = createClient()
  const router   = useRouter()

  const [text,      setText]      = useState('')
  const [loading,   setLoading]   = useState(false)
  const [media,     setMedia]     = useState<MediaItem[]>([])
  const [error,     setError]     = useState('')
  const [showGifs,  setShowGifs]  = useState(false)
  const [gifQuery,  setGifQuery]  = useState('')
  const [gifResults,setGifResults]= useState<GifResult[]>([])
  const [gifLoading,setGifLoading]= useState(false)

  const imageRef    = useRef<HTMLInputElement>(null)
  const videoRef    = useRef<HTMLInputElement>(null)
  const textRef     = useRef<HTMLTextAreaElement>(null)
  const gifPanelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!showGifs) return
    function handle(e: MouseEvent) {
      if (gifPanelRef.current && !gifPanelRef.current.contains(e.target as Node)) {
        setShowGifs(false)
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [showGifs])

  const searchGifs = useCallback(async (q: string) => {
    setGifLoading(true)
    try {
      const url = q
        ? `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(q)}&key=${TENOR_KEY}&limit=12&media_filter=gif,tinygif`
        : `https://tenor.googleapis.com/v2/featured?key=${TENOR_KEY}&limit=12&media_filter=gif,tinygif`
      const res = await fetch(url)
      if (!res.ok) { setGifResults(FALLBACK_GIFS); return }
      const json = await res.json() as { results?: GifApiResult[] }
      const results: GifResult[] = (json.results ?? []).map(result => ({
        url: result.media_formats?.gif?.url ?? result.media_formats?.tinygif?.url ?? '',
        preview: result.media_formats?.tinygif?.url ?? result.media_formats?.gif?.url ?? '',
      })).filter(result => result.url)
      setGifResults(results.length ? results : FALLBACK_GIFS)
    } catch {
      setGifResults(FALLBACK_GIFS)
    } finally {
      setGifLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!showGifs) return
    const timer = window.setTimeout(() => void searchGifs(gifQuery), 200)
    return () => window.clearTimeout(timer)
  }, [showGifs, gifQuery, searchGifs])

  function pickGif(gif: GifResult) {
    setMedia(prev => [
      ...prev.filter(m => m.type !== 'gif'),
      { preview: gif.preview, type: 'gif', gifUrl: gif.url },
    ])
    setShowGifs(false)
  }

  const charsLeft = MAX_TEXT - text.length
  const isOver    = charsLeft < 0
  const canSend   = !isOver && !loading && (text.trim().length > 0 || media.length > 0)

  function autoGrow() {
    const el = textRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }

  function addImages(files: FileList | null) {
    if (!files) return
    setError('')
    const canAdd = MAX_IMAGES - media.filter(m => m.type === 'image').length
    const items  = Array.from(files).slice(0, canAdd)
    setMedia(prev => [...prev, ...items.map(file => ({
      file, preview: URL.createObjectURL(file), type: 'image' as const,
    }))])
    if (imageRef.current) imageRef.current.value = ''
  }

  function addVideo(files: FileList | null) {
    if (!files || !files[0]) return
    setError('')
    const file = files[0]
    if (file.size > MAX_VIDEO_MB * 1024 * 1024) { setError(`Video must be under ${MAX_VIDEO_MB}MB`); return }
    setMedia(prev => [...prev.filter(m => m.type !== 'video'), {
      file, preview: URL.createObjectURL(file), type: 'video' as const,
    }])
    if (videoRef.current) videoRef.current.value = ''
  }

  function removeMedia(idx: number) {
    setMedia(prev => {
      const item = prev[idx]
      if (item.preview && item.file) URL.revokeObjectURL(item.preview)
      return prev.filter((_, i) => i !== idx)
    })
  }

  async function submit() {
    if (!canSend) return
    setLoading(true); setError('')
    try {
      let media_url:   string | null = null
      let media_type:  string | null = null
      let extra_media: { url: string; type: string }[] = []

      if (media.length > 0) {
        const uploaded: { url: string; type: string }[] = []
        for (const item of media) {
          if (item.type === 'gif' && item.gifUrl) {
            uploaded.push({ url: item.gifUrl, type: 'gif' })
          } else if (item.file) {
            const ext  = item.file.name.split('.').pop() ?? (item.type === 'video' ? 'mp4' : 'jpg')
            const path = `${currentUserId}/reply_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
            const { error: upErr } = await supabase.storage
              .from('post-media').upload(path, item.file, { contentType: item.file.type })
            if (upErr) { setError('Upload failed: ' + upErr.message); setLoading(false); return }
            uploaded.push({
              url:  supabase.storage.from('post-media').getPublicUrl(path).data.publicUrl,
              type: item.type,
            })
          }
        }
        if (uploaded.length > 0) {
          media_url   = uploaded[0].url
          media_type  = uploaded[0].type
          extra_media = uploaded.slice(1)
        }
      }

      const { error: insertErr } = await supabase.from('comments').insert({
        post_id:     postId,
        user_id:     currentUserId,
        content:     text.trim() || null,
        media_url,
        media_type,
        extra_media: extra_media.length ? extra_media : null,
      })
      if (insertErr) { setError(insertErr.message); setLoading(false); return }

      // Notify post owner — skip self-comment
      if (postOwnerId && postOwnerId !== currentUserId) {
        await supabase.from('notifications').insert({
          user_id:  postOwnerId,
          actor_id: currentUserId,
          type:     'comment',
          entity_id: postId,
          message:  `${currentUserProfile?.username ?? 'Someone'} commented on your post`,
          is_read:  false,
        })
      }

      media.forEach(m => { if (m.file && m.preview) URL.revokeObjectURL(m.preview) })
      setText('')
      setMedia([])
      if (textRef.current) textRef.current.style.height = 'auto'
      router.refresh()
    } catch (e) {
      console.error(e)
      setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const initials   = currentUserProfile?.username?.[0]?.toUpperCase() ?? '?'
  const imageCount = media.filter(m => m.type === 'image').length
  const hasVideo   = media.some(m => m.type === 'video')
  const hasGif     = media.some(m => m.type === 'gif')

  return (
    <div
      className="reply-bar reply-bar-fixed"
      style={{
        position: 'fixed',
        bottom: 'var(--nav-bottom)',
        zIndex: 40,
      }}
    >
      {/* GIF picker panel */}
      {showGifs && (
        <div
          ref={gifPanelRef}
          style={{
            position: 'absolute',
            bottom: '100%',
            left: 0, right: 0,
            marginBottom: 6,
            background: 'var(--surface-1)',
            border: '1px solid var(--border)',
            borderRadius: 16,
            padding: 12,
            boxShadow: '0 -8px 32px rgba(0,0,0,0.18)',
            zIndex: 50,
          }}
        >
          <input
            type="text"
            placeholder="Search GIFs…"
            value={gifQuery}
            onChange={e => setGifQuery(e.target.value)}
            style={{
              width: '100%', boxSizing: 'border-box',
              background: 'var(--surface-2)', border: 'none',
              borderRadius: 20, padding: '8px 14px',
              fontSize: 13, color: 'var(--text-primary)',
              outline: 'none', marginBottom: 10, fontFamily: 'inherit',
            }}
          />
          {gifLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 16 }}>
              <Loader2 size={20} className="animate-spin" style={{ color: 'var(--text-tertiary)' }} />
            </div>
          ) : (
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 4, maxHeight: 200, overflowY: 'auto',
            }}>
              {gifResults.map((g, i) => (
                <button
                  key={i} onClick={() => pickGif(g)}
                  style={{
                    border: 'none', padding: 0, cursor: 'pointer',
                    borderRadius: 8, overflow: 'hidden',
                    aspectRatio: '1', background: 'var(--surface-2)',
                  }}
                >
                  <img src={mediaUrl(g.preview)} alt="GIF"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ fontSize: 12, color: '#f43f5e', paddingLeft: 44, paddingBottom: 4 }}>{error}</div>
      )}

      {/* Media previews */}
      {media.length > 0 && (
        <div style={{ display: 'flex', gap: 6, paddingLeft: 44, paddingBottom: 6, overflowX: 'auto' }}>
          {media.map((m, i) => (
            <div key={i} style={{ position: 'relative', flexShrink: 0 }}>
              {m.type === 'video' ? (
                <div style={{
                  width: 64, height: 64, borderRadius: 10, background: '#000',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: '1px solid var(--border)',
                }}>
                  <Play size={20} fill="#fff" color="#fff" />
                </div>
              ) : (
                <img src={mediaUrl(m.preview)} alt="" style={{
                  width: 64, height: 64, borderRadius: 10,
                  objectFit: 'cover', border: '1px solid var(--border)',
                }} />
              )}
              <button
                onClick={() => removeMedia(i)}
                style={{
                  position: 'absolute', top: -4, right: -4,
                  width: 18, height: 18, borderRadius: '50%',
                  background: '#0f172a', border: '1.5px solid #fff',
                  cursor: 'pointer', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', padding: 0,
                }}
              >
                <X size={10} color="#fff" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input row */}
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>

        {/* Avatar */}
        <div style={{
          width: 34, height: 34, borderRadius: '50%',
          background: 'var(--grad-brand)', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontWeight: 700, fontSize: 12, overflow: 'hidden',
        }}>
          {currentUserProfile?.avatar_url
            ? <img src={mediaUrl(currentUserProfile.avatar_url)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : initials
          }
        </div>

        {/* Textarea */}
        <textarea
          ref={textRef}
          className="reply-input"
          placeholder="Reply…"
          value={text}
          rows={1}
          onChange={e => { setText(e.target.value); autoGrow() }}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() } }}
          disabled={loading}
        />

        {/* Hidden inputs */}
        <input ref={imageRef} type="file" accept="image/*" multiple hidden
          onChange={e => addImages(e.target.files)} />
        <input ref={videoRef} type="file" accept="video/*" hidden
          onChange={e => addVideo(e.target.files)} />

        {/* Image */}
        <button onClick={() => imageRef.current?.click()}
          disabled={loading || imageCount >= MAX_IMAGES || hasVideo || hasGif}
          style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 4, flexShrink: 0,
            color: 'var(--text-tertiary)',
            opacity: (imageCount >= MAX_IMAGES || hasVideo || hasGif) ? 0.4 : 1,
          }}
          aria-label="Add image"
        >
          <ImagePlus size={18} />
        </button>

        {/* Video */}
        <button onClick={() => videoRef.current?.click()}
          disabled={loading || hasVideo || imageCount > 0 || hasGif}
          style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 4, flexShrink: 0,
            color: 'var(--text-tertiary)',
            opacity: (hasVideo || imageCount > 0 || hasGif) ? 0.4 : 1,
          }}
          aria-label="Add video"
        >
          <Video size={18} />
        </button>

        {/* GIF */}
        <button onClick={() => setShowGifs(p => !p)}
          disabled={loading || hasGif || imageCount > 0 || hasVideo}
          style={{
            background: 'none', border: 'none', cursor: 'pointer', padding: 4, flexShrink: 0,
            color: showGifs ? 'var(--nia-violet)' : 'var(--text-tertiary)',
            fontSize: 11, fontWeight: 800,
            opacity: (hasGif || imageCount > 0 || hasVideo) ? 0.4 : 1,
          }}
          aria-label="Add GIF"
        >
          GIF
        </button>

        {/* Char counter */}
        {text.length > 400 && (
          <span style={{
            fontSize: 11, flexShrink: 0, fontWeight: 600,
            color: isOver ? '#f43f5e' : charsLeft < 50 ? '#f59e0b' : 'var(--text-tertiary)',
          }}>
            {charsLeft}
          </span>
        )}

        {/* Send */}
        <button
          onClick={submit}
          disabled={!canSend}
          aria-label="Send reply"
          style={{
            background: 'none', border: 'none', padding: 4, flexShrink: 0,
            cursor: canSend ? 'pointer' : 'default',
            color: canSend ? 'var(--nia-violet)' : 'var(--text-tertiary)',
            display: 'flex', alignItems: 'center',
            transition: 'color 0.15s',
          }}
        >
          {loading
            ? <Loader2 size={18} className="animate-spin" />
            : <Send size={18} strokeWidth={2} />
          }
        </button>
      </div>
    </div>
  )
}
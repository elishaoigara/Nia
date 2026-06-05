'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Send, Loader2, ImagePlus, Video, X, Play, Smile } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface ReplyBarProps {
  postId:        string
  currentUserId: string
}

const MAX_TEXT     = 500
const MAX_IMAGES   = 4
const MAX_VIDEO_MB = 50

// Tenor GIF search — same key as FlicksClient
const TENOR_KEY = process.env.NEXT_PUBLIC_TENOR_API_KEY ?? ''

interface MediaItem {
  file?:    File          // undefined for GIF URLs (no file upload needed)
  preview:  string
  type:     'image' | 'video' | 'gif'
  gifUrl?:  string        // original URL for GIFs picked from Tenor
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

export default function ReplyBar({ postId, currentUserId }: ReplyBarProps) {
  const supabase = createClient()
  const router   = useRouter()

  const [text,       setText]       = useState('')
  const [loading,    setLoading]    = useState(false)
  const [profile,    setProfile]    = useState<any>(null)
  const [media,      setMedia]      = useState<MediaItem[]>([])
  const [error,      setError]      = useState('')

  // GIF picker state
  const [showGifs,    setShowGifs]    = useState(false)
  const [gifQuery,    setGifQuery]    = useState('')
  const [gifResults,  setGifResults]  = useState<GifResult[]>([])
  const [gifLoading,  setGifLoading]  = useState(false)

  const imageRef  = useRef<HTMLInputElement>(null)
  const videoRef  = useRef<HTMLInputElement>(null)
  const textRef   = useRef<HTMLTextAreaElement>(null)
  const gifPanelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    supabase.from('profiles').select('username, avatar_url').eq('id', currentUserId).single()
      .then(({ data }) => setProfile(data))
  }, [currentUserId]) // eslint-disable-line

  // Load GIFs on open / query change
  useEffect(() => {
    if (!showGifs) return
    searchGifs(gifQuery)
  }, [showGifs, gifQuery]) // eslint-disable-line

  // Click-outside to close GIF picker
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

  async function searchGifs(q: string) {
    setGifLoading(true)
    try {
      const url = q
        ? `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(q)}&key=${TENOR_KEY}&limit=12&media_filter=gif,tinygif`
        : `https://tenor.googleapis.com/v2/featured?key=${TENOR_KEY}&limit=12&media_filter=gif,tinygif`
      const res = await fetch(url)
      if (!res.ok) { setGifResults(FALLBACK_GIFS); return }
      const json = await res.json()
      const results: GifResult[] = (json.results ?? []).map((r: any) => ({
        url:     r.media_formats?.gif?.url     ?? r.media_formats?.tinygif?.url ?? '',
        preview: r.media_formats?.tinygif?.url ?? r.media_formats?.gif?.url     ?? '',
      })).filter((r: GifResult) => r.url)
      setGifResults(results.length ? results : FALLBACK_GIFS)
    } catch {
      setGifResults(FALLBACK_GIFS)
    } finally {
      setGifLoading(false)
    }
  }

  function pickGif(gif: GifResult) {
    // Replace any existing GIF, keep other media
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
    const canAdd  = MAX_IMAGES - media.filter(m => m.type === 'image').length
    const items   = Array.from(files).slice(0, canAdd)
    const newItems: MediaItem[] = items.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      type: 'image',
    }))
    setMedia(prev => [...prev, ...newItems])
    // Reset input so same file can be re-selected
    if (imageRef.current) imageRef.current.value = ''
  }

  function addVideo(files: FileList | null) {
    if (!files || !files[0]) return
    setError('')
    const file = files[0]
    if (file.size > MAX_VIDEO_MB * 1024 * 1024) {
      setError(`Video must be under ${MAX_VIDEO_MB}MB`)
      return
    }
    setMedia(prev => [...prev.filter(m => m.type !== 'video'), {
      file,
      preview: URL.createObjectURL(file),
      type: 'video',
    }])
    // Reset input so same file can be re-selected
    if (videoRef.current) videoRef.current.value = ''
  }

  function removeMedia(idx: number) {
    setMedia(prev => {
      const item = prev[idx]
      if (item.preview && item.file) URL.revokeObjectURL(item.preview) // only revoke blob URLs
      return prev.filter((_, i) => i !== idx)
    })
  }

  async function submit() {
    if (!canSend) return
    setLoading(true)
    setError('')

    try {
      let media_url:   string | null = null
      let media_type:  string | null = null
      let extra_media: { url: string; type: string }[] = []

      if (media.length > 0) {
        const uploaded: { url: string; type: string }[] = []

        for (const item of media) {
          if (item.type === 'gif' && item.gifUrl) {
            // GIF from Tenor — use URL directly, no upload needed
            uploaded.push({ url: item.gifUrl, type: 'gif' })
          } else if (item.file) {
            const ext  = item.file.name.split('.').pop() ?? (item.type === 'video' ? 'mp4' : 'jpg')
            const path = `${currentUserId}/reply_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
            const { error: upErr } = await supabase.storage
              .from('post-media')
              .upload(path, item.file, { contentType: item.file.type })
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
        content:     text.trim() || '',
        media_url,
        media_type,
        extra_media: extra_media.length ? extra_media : null,
      })

      if (insertErr) { setError(insertErr.message); setLoading(false); return }

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

  const initials     = profile?.username?.[0]?.toUpperCase() ?? '?'
  const imageCount   = media.filter(m => m.type === 'image').length
  const hasVideo     = media.some(m => m.type === 'video')
  const hasGif       = media.some(m => m.type === 'gif')

  return (
    <div
      className="reply-bar"
      style={{
        position: 'fixed',
        bottom: 'var(--nav-bottom)',
        left: 0, right: 0,
        maxWidth: 620,
        margin: '0 auto',
        flexDirection: 'column',
        padding: '8px 12px',
        gap: 8,
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
            left: 12, right: 12,
            background: 'var(--surface-1)',
            border: '1px solid var(--border)',
            borderRadius: 16,
            padding: 12,
            boxShadow: '0 -8px 32px rgba(0,0,0,0.18)',
            zIndex: 50,
            marginBottom: 4,
          }}
        >
          <input
            type="text"
            placeholder="Search GIFs…"
            value={gifQuery}
            onChange={e => setGifQuery(e.target.value)}
            style={{
              width: '100%',
              background: 'var(--surface-2)',
              border: 'none',
              borderRadius: 20,
              padding: '8px 14px',
              fontSize: 13,
              color: 'var(--text-primary)',
              outline: 'none',
              marginBottom: 10,
              boxSizing: 'border-box',
              fontFamily: 'inherit',
            }}
          />
          {gifLoading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 16 }}>
              <Loader2 size={20} className="animate-spin" style={{ color: 'var(--text-tertiary)' }} />
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4, maxHeight: 200, overflowY: 'auto' }}>
              {gifResults.map((g, i) => (
                <button
                  key={i}
                  onClick={() => pickGif(g)}
                  style={{
                    border: 'none', padding: 0, cursor: 'pointer',
                    borderRadius: 8, overflow: 'hidden',
                    aspectRatio: '1', background: 'var(--surface-2)',
                  }}
                >
                  <img
                    src={g.preview}
                    alt="GIF"
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ fontSize: 12, color: '#f43f5e', paddingLeft: 42 }}>{error}</div>
      )}

      {/* Media previews */}
      {media.length > 0 && (
        <div style={{ display: 'flex', gap: 6, paddingLeft: 42, overflowX: 'auto' }}>
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
                <img src={m.preview} alt="" style={{
                  width: 64, height: 64, borderRadius: 10, objectFit: 'cover',
                  border: '1px solid var(--border)',
                }} />
              )}
              <button
                onClick={() => removeMedia(i)}
                style={{
                  position: 'absolute', top: -4, right: -4,
                  width: 18, height: 18, borderRadius: '50%',
                  background: '#0f172a', border: '1.5px solid #fff',
                  cursor: 'pointer', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', padding: 0,
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
          width: 32, height: 32, borderRadius: '50%',
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

        {/* Text area */}
        <textarea
          ref={textRef}
          className="reply-input"
          placeholder="Reply…"
          value={text}
          rows={1}
          onChange={e => { setText(e.target.value); autoGrow() }}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() } }}
          disabled={loading}
          style={{ resize: 'none', overflow: 'hidden', minHeight: 40, maxHeight: 120 }}
        />

        {/* Hidden file inputs */}
        <input ref={imageRef} type="file" accept="image/*" multiple hidden
          onChange={e => addImages(e.target.files)} />
        <input ref={videoRef} type="file" accept="video/*" hidden
          onChange={e => addVideo(e.target.files)} />

        {/* Image button */}
        <button
          onClick={() => imageRef.current?.click()}
          disabled={loading || imageCount >= MAX_IMAGES || hasVideo || hasGif}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-tertiary)', padding: 4, flexShrink: 0,
            opacity: (imageCount >= MAX_IMAGES || hasVideo || hasGif) ? 0.4 : 1,
          }}
          aria-label="Add image"
        >
          <ImagePlus size={18} />
        </button>

        {/* Video button */}
        <button
          onClick={() => videoRef.current?.click()}
          disabled={loading || hasVideo || imageCount > 0 || hasGif}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-tertiary)', padding: 4, flexShrink: 0,
            opacity: (hasVideo || imageCount > 0 || hasGif) ? 0.4 : 1,
          }}
          aria-label="Add video"
        >
          <Video size={18} />
        </button>

        {/* GIF button */}
        <button
          onClick={() => setShowGifs(p => !p)}
          disabled={loading || hasGif || imageCount > 0 || hasVideo}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: showGifs ? 'var(--nia-violet)' : 'var(--text-tertiary)',
            padding: 4, flexShrink: 0, fontSize: 11, fontWeight: 800,
            opacity: (hasGif || imageCount > 0 || hasVideo) ? 0.4 : 1,
          }}
          aria-label="Add GIF"
        >
          GIF
        </button>

        {/* Char count */}
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
          style={{
            background: 'none', border: 'none', cursor: canSend ? 'pointer' : 'default',
            color: canSend ? 'var(--nia-violet)' : 'var(--text-tertiary)',
            display: 'flex', alignItems: 'center', padding: 4, flexShrink: 0,
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
    </div>
  )
}
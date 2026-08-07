'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, Loader2 } from 'lucide-react'
import type { GifApiResult } from '@/types/domain'

const TENOR_KEY = process.env.NEXT_PUBLIC_TENOR_API_KEY ?? ''

const FALLBACK_GIFS = [
  { url: 'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif', preview: 'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy_s.gif' },
  { url: 'https://media.giphy.com/media/3o7TKSjRrfIPjeiVyM/giphy.gif', preview: 'https://media.giphy.com/media/3o7TKSjRrfIPjeiVyM/giphy_s.gif' },
  { url: 'https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif',  preview: 'https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy_s.gif' },
  { url: 'https://media.giphy.com/media/l46CyJmS9KUbokzsI/giphy.gif',  preview: 'https://media.giphy.com/media/l46CyJmS9KUbokzsI/giphy_s.gif' },
]

type GifResult = { url: string; preview: string }

export default function ChatGifPicker({
  onPick,
  onClose,
}: {
  onPick: (url: string) => void
  onClose: () => void
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<GifResult[]>([])
  const [loading, setLoading] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose()
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [onClose])

  const search = useCallback(async (q: string) => {
    setLoading(true)
    try {
      const url = q
        ? `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(q)}&key=${TENOR_KEY}&limit=15&media_filter=gif,tinygif`
        : `https://tenor.googleapis.com/v2/featured?key=${TENOR_KEY}&limit=15&media_filter=gif,tinygif`
      const res = await fetch(url)
      if (!res.ok) { setResults(FALLBACK_GIFS); return }
      const json = await res.json() as { results?: GifApiResult[] }
      const mapped: GifResult[] = (json.results ?? []).map(result => ({
        url: result.media_formats?.gif?.url ?? result.media_formats?.tinygif?.url ?? '',
        preview: result.media_formats?.tinygif?.url ?? result.media_formats?.gif?.url ?? '',
      })).filter(result => result.url)
      setResults(mapped.length ? mapped : FALLBACK_GIFS)
    } catch {
      setResults(FALLBACK_GIFS)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => void search(query), 200)
    return () => window.clearTimeout(timer)
  }, [query, search])

  return (
    <div
      ref={panelRef}
      style={{
        position: 'absolute', bottom: '100%', left: 0, right: 0, marginBottom: 8,
        background: 'var(--surface-1)', border: '1px solid var(--border)',
        borderRadius: 16, padding: 10, maxHeight: 280, display: 'flex',
        flexDirection: 'column', boxShadow: '0 -4px 20px rgba(0,0,0,0.12)',
      }}
    >
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface-2)',
        borderRadius: 10, padding: '6px 10px', marginBottom: 8, flexShrink: 0,
      }}>
        <Search size={14} color="var(--text-tertiary)" />
        <input
          autoFocus
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search GIFs…"
          style={{ flex: 1, background: 'none', border: 'none', outline: 'none', fontSize: 13, color: 'var(--text-primary)', fontFamily: 'inherit' }}
        />
      </div>
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
            <Loader2 size={18} className="animate-spin" style={{ color: 'var(--text-tertiary)' }} />
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
            {results.map((gif, i) => (
              <button
                key={i}
                onClick={() => onPick(gif.url)}
                className="tap-sm"
                style={{ border: 'none', borderRadius: 8, overflow: 'hidden', cursor: 'pointer', padding: 0, aspectRatio: '1', background: 'var(--surface-2)' }}
              >
                <img src={gif.preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
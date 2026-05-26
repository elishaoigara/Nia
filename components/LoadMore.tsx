'use client'

import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import PostCard from '@/components/PostCard'

interface LoadMoreProps {
  currentPage:   number
  currentTab:    string
  currentUserId: string
}

export default function LoadMore({ currentPage, currentTab, currentUserId }: LoadMoreProps) {
  const [posts,   setPosts]   = useState<any[]>([])
  const [page,    setPage]    = useState(currentPage)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    setPosts([])
    setPage(currentPage)
    setHasMore(true)
    setError(null)
  }, [currentTab, currentPage])

  async function loadMore() {
    if (loading) return
    setLoading(true); setError(null)
    const nextPage = page + 1
    try {
      const res  = await fetch(`/api/feed?tab=${currentTab}&page=${nextPage}`)
      if (!res.ok) throw new Error(`${res.status}`)
      const data = await res.json()
      const incoming = data.posts ?? []
      if (incoming.length > 0) {
        setPosts(prev => [...prev, ...incoming])
        setPage(nextPage)
      }
      setHasMore(data.hasMore ?? incoming.length > 0)
    } catch {
      setError('Failed to load more posts.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Appended posts */}
      {posts.map((post: any) => (
        <PostCard key={post.id} post={post} currentUserId={currentUserId} />
      ))}

      {error && (
        <div style={{ textAlign: 'center', padding: '16px', fontSize: 13, color: 'var(--text-secondary)' }}>
          <span style={{ color: '#f43f5e' }}>⚠ {error} </span>
          <button onClick={loadMore} style={{ color: 'var(--nia-violet)', fontWeight: 700, background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
            Retry
          </button>
        </div>
      )}

      {hasMore && !error && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '16px 0 32px' }}>
          <button
            onClick={loadMore}
            disabled={loading}
            className="tap-sm"
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 24px',
              borderRadius: 12,
              border: 'none',
              background: 'var(--surface-2)',
              color: 'var(--text-secondary)',
              fontSize: 14, fontWeight: 600,
              cursor: 'pointer',
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? <><Loader2 size={15} className="animate-spin" /> Loading…</> : 'Load more'}
          </button>
        </div>
      )}
    </>
  )
}
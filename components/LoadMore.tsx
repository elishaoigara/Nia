'use client'

import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import PostCard from '@/components/PostCard'

interface LoadMoreProps {
  currentPage: number
  currentTab: string
  currentUserId: string
}

export default function LoadMore({
  currentPage,
  currentTab,
  currentUserId,
}: LoadMoreProps) {
  const [posts, setPosts] = useState<any[]>([])
  const [page, setPage] = useState(currentPage)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Clear appended cache memory states whenever active sub-navigation timeline changes
  useEffect(() => {
    setPosts([])
    setPage(currentPage)
    setHasMore(true)
    setError(null)
  }, [currentTab, currentPage])

  async function handleLoadMore() {
    if (loading) return
    
    setLoading(true)
    setError(null)
    const nextPage = page + 1
    
    try {
      const res = await fetch(`/api/feed?tab=${currentTab}&page=${nextPage}`)
      
      if (!res.ok) {
        throw new Error(`Failed to fetch next segment: ${res.status}`)
      }
      
      const data = await res.json()
      const incomingPosts = data.posts ?? []
      
      if (incomingPosts.length > 0) {
        setPosts(prev => [...prev, ...incomingPosts])
        setPage(nextPage)
      }
      
      // Update fallback cursor flags based on server scale response payload
      setHasMore(data.hasMore ?? (incomingPosts.length > 0))
    } catch (err) {
      console.error('Pagination streaming fault:', err)
      setError('Failed to sync network updates. Check mobile connection settings.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* ── Appended Feed Data Flow Matrix ──────────────────── */}
      {posts.map((post: any) => (
        <div key={post.id} className="w-full">
          <PostCard post={post} currentUserId={currentUserId} />
        </div>
      ))}

      {/* ── Exception Handling Fallback State Block ───────────── */}
      {error && (
        <div className="text-center text-xs py-4 font-semibold flex items-center justify-center gap-2" style={{ color: 'var(--text-secondary)' }}>
          <span className="text-rose-500">⚠️ {error}</span>
          <button 
            onClick={handleLoadMore}
            className="underline font-bold transition-transform active:scale-90"
            style={{ color: 'var(--nia-violet)' }}
          >
            Retry
          </button>
        </div>
      )}

      {/* ── Call-To-Action Element Matrix ───────────────────── */}
      {hasMore && !error && (
        <div className="flex justify-center pt-3 pb-8">
          <button
            onClick={handleLoadMore}
            disabled={loading}
            className="tap-sm flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold select-none transition-all duration-150 active:scale-95 disabled:opacity-40 min-h-10"
            style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}
          >
            {loading ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                <span>Syncing…</span>
              </>
            ) : (
              <span>Load older posts</span>
            )}
          </button>
        </div>
      )}
    </>
  )
}
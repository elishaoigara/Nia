'use client'

import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import PostCard from '@/components/PostCard'

export default function LoadMore({
  currentPage,
  currentTab,
  currentUserId,
}: {
  currentPage: number
  currentTab: string
  currentUserId: string
}) {
  const [posts, setPosts] = useState<any[]>([])
  const [page, setPage] = useState(currentPage)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleLoadMore() {
    setLoading(true)
    setError(null)
    const nextPage = page + 1
    
    try {
      const res = await fetch(`/api/feed?tab=${currentTab}&page=${nextPage}`)
      
      if (!res.ok) {
        throw new Error(`Failed to load: ${res.status}`)
      }
      
      const data = await res.json()
      
      if (data.posts?.length) {
        setPosts(prev => [...prev, ...data.posts])
        setPage(nextPage)
      }
      setHasMore(data.hasMore ?? false)
    } catch (err) {
      console.error('Load more error:', err)
      setError('Failed to load more posts. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {posts.map((post: any) => (
        <div key={post.id}>
          <PostCard post={post} currentUserId={currentUserId} />
        </div>
      ))}

      {error && (
        <div className="text-center text-sm py-2" style={{ color: '#ef4444' }}>
          {error}
          <button 
            onClick={handleLoadMore}
            className="ml-2 underline"
            style={{ color: 'var(--nia-violet)' }}
          >
            Retry
          </button>
        </div>
      )}

      {hasMore && (
        <div className="flex justify-center pt-2 pb-6">
          <button
            onClick={handleLoadMore}
            disabled={loading}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 hover:scale-105 active:scale-95"
            style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}
          >
            {loading && <Loader2 size={15} className="animate-spin" />}
            {loading ? 'Loading…' : 'Load more posts'}
          </button>
        </div>
      )}
    </>
  )
}
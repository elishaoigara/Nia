'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Loader2 } from 'lucide-react'

export default function LoadMore({
  currentPage,
  currentTab,
}: {
  currentPage: number
  currentTab: string
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  function handleLoadMore() {
    setLoading(true)
    router.push(`/?tab=${currentTab}&page=${currentPage + 1}`)
  }

  return (
    <div className="flex justify-center pt-2 pb-6">
      <button
        onClick={handleLoadMore}
        disabled={loading}
        className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
        style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}
      >
        {loading ? <Loader2 size={15} className="animate-spin" /> : null}
        {loading ? 'Loading…' : 'Load more posts'}
      </button>
    </div>
  )
}
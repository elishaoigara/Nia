'use client'

import { useEffect } from 'react'

export default function ErrorPage({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  useEffect(() => {
    console.error('[ui] route error', error)
  }, [error])

  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="text-4xl" aria-hidden="true">⚠️</div>
      <h1 className="text-xl font-extrabold">Something went wrong</h1>
      <p style={{ color: 'var(--text-secondary)' }}>
        We couldn’t load this page. Check your connection and try again.
      </p>
      <button className="btn btn-primary" onClick={unstable_retry}>
        Try again
      </button>
    </main>
  )
}

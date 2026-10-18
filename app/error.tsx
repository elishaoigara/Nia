'use client'

import { useEffect } from 'react'
import Link from 'next/link'

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
      <h1 className="text-xl font-extrabold">We hit a bump</h1>
      <p style={{ color: 'var(--text-secondary)' }}>
        Nia could not load this part of the app. Please try again or return to your feed.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button className="btn btn-primary" onClick={unstable_retry}>
          Try again
        </button>
        <Link className="btn btn-ghost" href="/">
          Return home
        </Link>
      </div>
      {error.digest && (
        <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
          Reference: {error.digest}
        </p>
      )}
    </main>
  )
}

'use client'

export default function GlobalError({
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#F9F8F6', color: '#1A1916' }}>
        <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, textAlign: 'center' }}>
          <div>
            <h1>We couldn’t start Nia</h1>
            <p>Please refresh the page or try again shortly.</p>
            <button onClick={unstable_retry} style={{ padding: '10px 18px', borderRadius: 10, border: 0, background: '#5B21B6', color: '#fff', fontWeight: 700 }}>
              Try again
            </button>
          </div>
        </main>
      </body>
    </html>
  )
}

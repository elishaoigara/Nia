import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="text-5xl" aria-hidden="true">🌍</div>
      <h1 className="text-xl font-extrabold">Page not found</h1>
      <p style={{ color: 'var(--text-secondary)' }}>
        This page may have moved or is no longer available.
      </p>
      <Link className="btn-primary rounded-xl px-5 py-2.5 font-bold" href="/">
        Back to home
      </Link>
    </main>
  )
}

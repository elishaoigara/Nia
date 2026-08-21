import Link from 'next/link'

export default function SetupPage() {
  return (
    <main style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 24, background: 'var(--surface-0)' }}>
      <section className="card" style={{ width: '100%', maxWidth: 520, padding: '32px 28px', boxShadow: 'var(--shadow-card)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <img src="/logo/nia-icon.svg" alt="" width={42} height={42} style={{ borderRadius: 12 }} />
          <span style={{ fontWeight: 850, fontSize: 22 }}>Nia</span>
        </div>
        <p style={{ margin: '0 0 8px', color: 'var(--nia-violet)', fontWeight: 800, fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Pre-launch setup
        </p>
        <h1 style={{ margin: '0 0 12px', fontSize: 'clamp(26px, 6vw, 38px)', lineHeight: 1.08, letterSpacing: '-0.04em' }}>
          One more step before we connect people.
        </h1>
        <p style={{ margin: '0 0 24px', color: 'var(--text-secondary)', lineHeight: 1.65 }}>
          Nia is running, but the community database is not connected yet. Add the required Supabase variables to the deployment environment, then restart or redeploy the application.
        </p>
        <div className="surface-panel" style={{ padding: 16, display: 'grid', gap: 10, marginBottom: 24 }}>
          {['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'].map(name => (
            <code key={name} style={{ color: 'var(--text-primary)', fontSize: 13, overflowWrap: 'anywhere' }}>{name}</code>
          ))}
        </div>
        <p style={{ margin: '0 0 24px', color: 'var(--text-tertiary)', fontSize: 13, lineHeight: 1.6 }}>
          Keep service-role credentials server-side only. This screen is intended for staging and deployment diagnosis; it is not an alternative to configuring production secrets.
        </p>
        <Link href="https://supabase.com/dashboard" className="btn-primary" style={{ textDecoration: 'none', width: '100%' }}>
          Open Supabase dashboard
        </Link>
      </section>
    </main>
  )
}

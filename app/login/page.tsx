'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Loader2, ArrowRight } from 'lucide-react'

export default function LoginPage() {
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin() {
    setLoading(true); setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false) }
    else { window.location.href = '/' }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden" style={{ background: 'var(--surface-0)' }}>
      <div className="absolute top-0 left-0 w-64 h-64 rounded-full blur-[120px] opacity-15" style={{ background: 'var(--nia-violet)', transform: 'translate(-30%,-30%)' }} />
      <div className="absolute bottom-0 right-0 w-64 h-64 rounded-full blur-[120px] opacity-15" style={{ background: 'var(--nia-coral)', transform: 'translate(30%,30%)' }} />

      <div className="w-full max-w-sm space-y-8 relative z-10">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 rounded-3xl mx-auto flex items-center justify-center text-white font-black text-3xl" style={{ background: 'var(--grad-brand)', boxShadow: '0 8px 30px rgba(168,85,247,0.4)' }}>
            N
          </div>
          <div>
            <h1 className="font-extrabold text-3xl tracking-tight">Welcome back</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              Africa is waiting for you 🌍
            </p>
          </div>
        </div>

        <div className="card p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-bold">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com" className="input" autoFocus />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-bold">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className="input" onKeyDown={e => e.key === 'Enter' && handleLogin()} />
          </div>

          {error && <div className="px-3 py-2 rounded-xl text-sm font-semibold text-red-500" style={{ background: 'rgba(239,68,68,0.08)' }}>{error}</div>}

          <button onClick={handleLogin} disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
            {loading ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={18} />}
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </div>

        <p className="text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
          New to Nia?{' '}
          <Link href="/signup" className="font-bold" style={{ color: 'var(--nia-violet)' }}>Join the movement →</Link>
        </p>
      </div>
    </div>
  )
}

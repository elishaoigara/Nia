'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getAppUrl } from '@/lib/app-url'
import Link from 'next/link'
import { Loader2, ArrowRight, CheckCircle2 } from 'lucide-react'

export default function SignupPage() {
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSignup() {
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: `${getAppUrl()}/auth/callback`,
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSent(true)
    }
  }

  if (sent) return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--surface-0)' }}>
      <div className="card p-8 text-center space-y-4 max-w-sm w-full anim-pop">
        <div className="w-16 h-16 rounded-3xl mx-auto flex items-center justify-center" style={{ background: 'color-mix(in srgb, var(--nia-mint) 15%, transparent)' }}>
          <CheckCircle2 size={32} style={{ color: 'var(--nia-mint)' }} />
        </div>
        <h2 className="font-extrabold text-2xl">Check your inbox! 📬</h2>
        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
          We sent a confirmation link to <strong>{email}</strong>. 
          Click it to activate your Nia account.
        </p>
        <Link href="/login" className="btn-ghost block text-center text-sm">Back to login</Link>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden" style={{ background: 'var(--surface-0)' }}>
      <div className="absolute top-0 right-0 w-64 h-64 rounded-full blur-[120px] opacity-15" style={{ background: 'var(--nia-violet)', transform: 'translate(30%,-30%)' }} />
      <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full blur-[120px] opacity-15" style={{ background: 'var(--nia-violet)', transform: 'translate(-30%,30%)' }} />

      <div className="w-full max-w-sm space-y-8 relative z-10">
        <div className="text-center space-y-3">
          <img
            src="/logo/nia-icon.svg"
            alt=""
            width={64}
            height={64}
            style={{ margin: '0 auto', display: 'block', boxShadow: '0 8px 30px rgba(91,33,182,0.4)', borderRadius: 20 }}
          />
          <div>
            <h1 className="font-extrabold text-3xl tracking-tight">Join Nia 🌍</h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
              Africa connects here
            </p>
          </div>
        </div>

        <div className="card p-6 space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-bold">Email</label>
            <input 
              type="email" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              placeholder="you@email.com" 
              className="input" 
              autoFocus 
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-bold">Password</label>
            <input 
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              placeholder="at least 8 characters" 
              className="input" 
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-bold">Confirm password</label>
            <input 
              type="password" 
              value={confirmPassword} 
              onChange={e => setConfirmPassword(e.target.value)} 
              placeholder="repeat password" 
              className="input" 
              onKeyDown={e => e.key === 'Enter' && handleSignup()} 
            />
          </div>

          {error && (
            <div className="px-3 py-2 rounded-xl text-sm font-semibold" style={{ background: 'color-mix(in srgb, var(--nia-coral) 10%, transparent)', color: 'var(--nia-coral)' }}>
              {error}
            </div>
          )}

          <button 
            onClick={handleSignup} 
            disabled={loading || !email || !password || !confirmPassword} 
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={18} />}
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </div>

        <p className="text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
          Already on Nia?{' '}
          <Link href="/login" className="font-bold" style={{ color: 'var(--nia-violet)' }}>Sign in →</Link>
        </p>
      </div>
    </div>
  )
}
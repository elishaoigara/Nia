// app/login/page.tsx
'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Loader2, ArrowRight, Eye, EyeOff, Mail, Lock } from 'lucide-react'

export default function LoginPage() {
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  async function handleLogin() {
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      window.location.href = '/'
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden" style={{ background: 'var(--surface-0)' }}>
      {/* Animated background elements */}
      <div className="absolute top-0 left-0 w-64 h-64 rounded-full blur-[120px] opacity-15" style={{ background: 'var(--nia-violet)', transform: 'translate(-30%,-30%)' }} />
      <div className="absolute bottom-0 right-0 w-64 h-64 rounded-full blur-[120px] opacity-15" style={{ background: 'var(--nia-coral)', transform: 'translate(30%,30%)' }} />
      
      {/* Floating particles */}
      {[...Array(12)].map((_, i) => (
        <div 
          key={i}
          className="absolute rounded-full animate-pulse"
          style={{
            background: `rgba(168,85,247,${0.1 + Math.random() * 0.1})`,
            width: `${5 + Math.random() * 10}px`,
            height: `${5 + Math.random() * 10}px`,
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`,
            animationDuration: `${3 + Math.random() * 5}s`,
          }}
        />
      ))}

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
          {/* Email field */}
          <div className="space-y-1.5">
            <label className="text-sm font-bold flex items-center gap-2">
              <Mail size={14} style={{ color: 'var(--nia-violet)' }} />
              Email
            </label>
            <div className="relative">
              <input 
                type="email" 
                value={email} 
                onChange={e => setEmail(e.target.value)} 
                placeholder="you@email.com" 
                className="input pl-10" 
                autoFocus 
              />
              <Mail 
                size={16} 
                className="absolute left-3 top-1/2 transform -translate-y-1/2" 
                style={{ color: 'var(--text-tertiary)' }} 
              />
            </div>
          </div>
          
          {/* Password field */}
          <div className="space-y-1.5">
            <label className="text-sm font-bold flex items-center gap-2">
              <Lock size={14} style={{ color: 'var(--nia-violet)' }} />
              Password
            </label>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
                placeholder="••••••••" 
                className="input pl-10 pr-10" 
                onKeyDown={e => e.key === 'Enter' && handleLogin()} 
              />
              <Lock 
                size={16} 
                className="absolute left-3 top-1/2 transform -translate-y-1/2" 
                style={{ color: 'var(--text-tertiary)' }} 
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 transform -translate-y-1/2"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff size={16} style={{ color: 'var(--text-tertiary)' }} />
                ) : (
                  <Eye size={16} style={{ color: 'var(--text-tertiary)' }} />
                )}
              </button>
            </div>
          </div>

          {/* Forgot password link */}
          <div className="text-right">
            <Link 
              href="/forgot-password" 
              className="text-xs font-medium" 
              style={{ color: 'var(--nia-violet)' }}
            >
              Forgot password?
            </Link>
          </div>

          {/* Error message */}
          {error && (
            <div className="px-3 py-2 rounded-xl text-sm font-semibold text-red-500" style={{ background: 'rgba(239,68,68,0.08)' }}>
              {error}
            </div>
          )}

          {/* Login button */}
          <button 
            onClick={handleLogin} 
            disabled={loading} 
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={18} />}
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </div>

        {/* Sign up link */}
        <p className="text-center text-sm" style={{ color: 'var(--text-secondary)' }}>
          New to Nia?{' '}
          <Link href="/signup" className="font-bold" style={{ color: 'var(--nia-violet)' }}>Join the movement →</Link>
        </p>
        
        {/* Social login options */}
        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" style={{ borderColor: 'var(--border)' }} />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 text-xs" style={{ color: 'var(--text-tertiary)', background: 'var(--surface-0)' }}>
                Or continue with
              </span>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <button
              type="button"
              className="w-full inline-flex justify-center py-2.5 px-4 rounded-xl shadow-sm text-sm font-medium transition-all hover:opacity-90 active:scale-95"
              style={{ 
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)'
              }}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span className="ml-2">Google</span>
            </button>

            <button
              type="button"
              className="w-full inline-flex justify-center py-2.5 px-4 rounded-xl shadow-sm text-sm font-medium transition-all hover:opacity-90 active:scale-95"
              style={{ 
                background: 'var(--surface-2)',
                border: '1px solid var(--border)',
                color: 'var(--text-primary)'
              }}
            >
              <svg className="w-5 h-5" fill="#1877F2" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              <span className="ml-2">Facebook</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

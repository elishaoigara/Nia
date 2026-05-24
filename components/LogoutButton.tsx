'use client'

import { useState } from 'react'
import { LogOut, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface LogoutButtonProps {
  className?: string
  variant?: 'full' | 'icon'
}

export default function LogoutButton({ className = '', variant = 'full' }: LogoutButtonProps) {
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  async function handleLogout() {
    if (loading) return
    setLoading(true)
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  if (variant === 'icon') {
    return (
      <button
        onClick={handleLogout}
        disabled={loading}
        aria-label="Log out"
        title="Log out"
        className={`flex items-center justify-center rounded-full p-2 transition-all active:scale-95 bg-transparent hover:bg-(--surface-2) ${className}`}
        style={{ color: 'var(--text-secondary)' }}
      >
        {loading ? <Loader2 size={18} className="animate-spin" /> : <LogOut size={18} />}
      </button>
    )
  }

  return (
    <button
      onClick={handleLogout}
      disabled={loading}
      className={`flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-[15px] font-bold transition-all duration-150 tap-sm w-full ${className}`}
      style={{ color: 'var(--text-secondary)' }}
    >
      {loading ? <Loader2 size={20} className="animate-spin" /> : <LogOut size={20} strokeWidth={1.8} />}
      <span>Log Out</span>
    </button>
  )
}

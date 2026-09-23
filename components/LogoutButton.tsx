'use client'

import { clearLocalUserData } from '@/lib/drafts'
import { useState, type CSSProperties } from 'react'
import { LogOut, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface LogoutButtonProps {
  className?: string
  variant?: 'full' | 'icon'
  style?: CSSProperties
}

export default function LogoutButton({ className = '', variant = 'full', style }: LogoutButtonProps) {
  const [loading, setLoading] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  async function handleLogout() {
    if (loading) return
    setLoading(true)
    const { error } = await supabase.auth.signOut()
    if (error) { setLoading(false); window.alert('Log out failed. Please retry.'); return }
    clearLocalUserData()
    router.replace('/login')
    router.refresh()
  }

  if (variant === 'icon') {
    return (
      <button
        onClick={handleLogout}
        disabled={loading}
        aria-label="Log out"
        title="Log out"
        className={`flex items-center justify-center rounded-full p-2 transition-all active:scale-95 bg-transparent hover:bg-(--surface-2) ${className}`}
        style={{ color: 'var(--text-secondary)', ...style }}
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
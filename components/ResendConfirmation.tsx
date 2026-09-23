'use client'

import { useEffect, useId, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getAuthUrl } from '@/lib/app-url'
import { friendlyAuthError } from '@/lib/auth-errors'

export default function ResendConfirmation({ initialEmail = '' }: { initialEmail?: string }) {
  const id = useId()
  const [email, setEmail] = useState(initialEmail)
  const [busy, setBusy] = useState(false)
  const [remaining, setRemaining] = useState(0)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  useEffect(() => {
    if (!remaining) return
    const timer = window.setTimeout(() => setRemaining(seconds => seconds - 1), 1000)
    return () => window.clearTimeout(timer)
  }, [remaining])

  async function resend(event: React.FormEvent) {
    event.preventDefault()
    if (busy || remaining) return
    setBusy(true); setError(''); setMessage('')
    try {
      const { error } = await createClient().auth.resend({ type: 'signup', email: email.trim(), options: { emailRedirectTo: getAuthUrl('/auth/callback') } })
      if (error) throw error
      setMessage('If this address has an unconfirmed account, a new link is on its way. Check your spam folder too.')
      setRemaining(60)
    } catch (error) {
      setError(friendlyAuthError(error instanceof Error ? error.message : ''))
    } finally { setBusy(false) }
  }

  return <details className="text-sm mt-4"><summary className="cursor-pointer font-bold">Need a new confirmation email?</summary><form onSubmit={resend} className="space-y-3 mt-3 text-left"><label htmlFor={id}>Email address</label><input id={id} type="email" autoComplete="email" required className="input" value={email} onChange={event => setEmail(event.target.value)}/><button className="btn-ghost w-full" disabled={busy || remaining > 0}>{busy ? 'Sending…' : remaining ? `Try again in ${remaining}s` : 'Resend confirmation'}</button>{message && <p role="status">{message}</p>}{error && <p role="alert">{error}</p>}</form></details>
}

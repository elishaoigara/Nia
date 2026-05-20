'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { BadgeCheck, ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'

const BENEFITS = [
  '✅ Purple verified badge on your profile and all posts',
  '🔍 Priority placement in search results',
  '🌍 Featured in the Discover page',
  '📊 Creator analytics dashboard',
  '⭐ Exclusive verified-only circles',
  '🛡️ Anti-impersonation protection',
]

export default function VerifyPage() {
  const supabase = createClient()
  const router = useRouter()
  const [step, setStep] = useState<'info' | 'pay' | 'done'>('info')
  const [loading, setLoading] = useState(false)
  const [paymentRef, setPaymentRef] = useState('')
  const [phone, setPhone] = useState('')  // was missing entirely before
  const [error, setError] = useState('')

  async function handleMpesaVerify() {
    if (!phone.trim()) {
      setError('Please enter your M-Pesa phone number.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const res = await fetch('/api/mpesa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: phone.trim(),
          amount: 260,
          recipientUserId: user.id,   // fixed: was `userId`
        }),
      })
      const data = await res.json()

      // fixed: API returns camelCase `checkoutRequestId`, not `CheckoutRequestID`
      if (data.checkoutRequestId) {
        setPaymentRef(data.checkoutRequestId)
        setStep('pay')
      } else {
        setError(data.error ?? 'Payment initiation failed. Try again.')
      }
    } catch {
      setError('Something went wrong. Try again.')
    }
    setLoading(false)
  }

  async function confirmPayment() {
    setLoading(true)
    const res = await fetch('/api/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ payment_ref: paymentRef }),
    })
    if (res.ok) setStep('done')
    setLoading(false)
  }

  return (
    <main className="w-full max-w-md px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/profile/edit"
          className="w-10 h-10 flex items-center justify-center rounded-xl transition-all active:scale-90"
          style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}
        >
          <ArrowLeft size={18} />
        </Link>
        <h1 className="font-extrabold text-xl">Get Verified</h1>
      </div>

      {/* ── Step 1: info ───────────────────────────────────── */}
      {step === 'info' && (
        <>
          {/* Badge preview */}
          <div className="card p-6 text-center space-y-3">
            <div
              className="w-20 h-20 rounded-3xl mx-auto flex items-center justify-center text-white text-3xl font-black"
              style={{ background: 'var(--grad-brand)' }}
            >
              N
            </div>
            <div className="flex items-center justify-center gap-2">
              <p className="font-extrabold text-lg">@yourname</p>
              <BadgeCheck size={22} style={{ color: 'var(--nia-violet)' }} fill="rgba(168,85,247,0.15)" />
            </div>
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
              This is what your profile looks like verified
            </p>
          </div>

          {/* Benefits */}
          <div className="card p-5 space-y-3">
            <p className="font-bold text-sm">What you get:</p>
            {BENEFITS.map(b => (
              <p key={b} className="text-sm" style={{ color: 'var(--text-secondary)' }}>{b}</p>
            ))}
          </div>

          {/* Price + phone + pay button */}
          <div className="card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-extrabold text-2xl">
                  $2{' '}
                  <span className="text-base font-normal" style={{ color: 'var(--text-tertiary)' }}>
                    / month
                  </span>
                </p>
                <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                  ≈ KES 260 · NGN 3,200 · GHS 30
                </p>
              </div>
              <div className="text-4xl">✅</div>
            </div>

            {/* Phone input — was missing before */}
            <div className="space-y-1.5">
              <label className="text-sm font-bold">M-Pesa Phone Number</label>
              <input
                type="tel"
                inputMode="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="07XX XXX XXX"
                className="input"
              />
            </div>

            {error && (
              <p
                className="text-sm font-semibold px-3 py-2 rounded-xl"
                style={{ background: 'rgba(239,68,68,0.08)', color: '#ef4444' }}
              >
                {error}
              </p>
            )}

            <button
              onClick={handleMpesaVerify}
              disabled={loading || !phone.trim()}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : '📱'}
              {loading ? 'Processing…' : 'Pay with M-Pesa'}
            </button>

            <button onClick={() => setStep('pay')} className="btn-ghost w-full text-sm">
              I already paid — confirm manually
            </button>
          </div>
        </>
      )}

      {/* ── Step 2: waiting for phone confirmation ──────────── */}
      {step === 'pay' && (
        <div className="card p-6 space-y-4 text-center">
          <div className="text-5xl">📱</div>
          <h2 className="font-extrabold text-xl">Check your phone</h2>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            An M-Pesa prompt was sent to <strong>{phone || 'your phone'}</strong>.
            Enter your PIN to pay <strong>KES 260</strong>.
          </p>
          {paymentRef && (
            <p
              className="text-xs px-3 py-2 rounded-xl"
              style={{
                background: 'var(--surface-2)',
                color: 'var(--text-tertiary)',
                fontFamily: 'monospace',
              }}
            >
              Ref: {paymentRef}
            </p>
          )}
          <button
            onClick={confirmPayment}
            disabled={loading}
            className="btn-primary w-full flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <BadgeCheck size={16} />}
            {loading ? 'Confirming…' : "I've paid — activate my badge"}
          </button>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
            Badge activation takes up to 24 hours while we verify payment.
          </p>
        </div>
      )}

      {/* ── Step 3: done ────────────────────────────────────── */}
      {step === 'done' && (
        <div className="card p-8 space-y-4 text-center">
          <div className="text-6xl">🎉</div>
          <h2 className="font-extrabold text-2xl">Request submitted!</h2>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Your verification payment has been recorded. Your badge will be
            activated within 24 hours.
          </p>
          <Link href="/" className="btn-primary block w-full text-center">
            Back to feed
          </Link>
        </div>
      )}
    </main>
  )
}
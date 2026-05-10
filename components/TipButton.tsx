'use client'
import { useState } from 'react'
import { Banknote, X, Loader2 } from 'lucide-react'

interface TipButtonProps { recipientUserId: string; recipientUsername: string }

export default function TipButton({ recipientUserId, recipientUsername }: TipButtonProps) {
  const [open, setOpen] = useState(false)
  const [phone, setPhone] = useState('')
  const [amount, setAmount] = useState('50')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleTip() {
    setLoading(true); setError(null); setMessage(null)
    try {
      const res = await fetch('/api/mpesa', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ recipientUserId, amount: Number(amount), phone }) })
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Payment failed') } else { setMessage(data.message) }
    } catch { setError('Network error. Try again.') } finally { setLoading(false) }
  }

  return (
    <>
      <button
        onClick={(e) => { e.preventDefault(); setOpen(true) }}
        className="w-8 h-8 rounded-xl flex items-center justify-center transition-all active:scale-90"
        style={{ background: 'rgba(107,203,119,0.12)', color: 'var(--nia-mint)' }}
        title={`Tip @${recipientUsername}`}
      >
        <Banknote size={15} />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) { setOpen(false); setMessage(null); setError(null) } }}
        >
          <div
            className="w-full max-w-sm rounded-t-[28px] sm:rounded-[28px] p-6 space-y-5 anim-up"
            style={{ background: 'var(--surface-0)', boxShadow: 'var(--shadow-lg)' }}
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-lg">Send a tip 💸</h3>
                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>to @{recipientUsername}</p>
              </div>
              <button onClick={() => { setOpen(false); setMessage(null); setError(null) }} className="w-8 h-8 rounded-xl flex items-center justify-center transition-all active:scale-90" style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}>
                <X size={16} />
              </button>
            </div>

            {message ? (
              <div className="text-center py-4 anim-pop">
                <div className="text-5xl mb-3">🎉</div>
                <p className="font-bold text-lg" style={{ color: 'var(--nia-mint)' }}>Tip sent!</p>
                <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>Check your Safaricom phone.</p>
                <button onClick={() => { setOpen(false); setMessage(null) }} className="btn-primary mt-4 w-full">Done</button>
              </div>
            ) : (
              <>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>M-Pesa Number</label>
                  <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="07XX XXX XXX" className="input" />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Amount (KES)</label>
                  <div className="grid grid-cols-4 gap-2">
                    {['10', '50', '100', '200'].map(a => (
                      <button key={a} onClick={() => setAmount(a)} className="py-2.5 rounded-2xl text-sm font-bold transition-all active:scale-90" style={amount === a ? { background: 'var(--grad-brand)', color: '#fff' } : { background: 'var(--surface-2)', color: 'var(--text-secondary)' }}>
                        {a}
                      </button>
                    ))}
                  </div>
                  <input type="number" value={amount} onChange={e => setAmount(e.target.value)} min="1" placeholder="Custom" className="input" />
                </div>

                {error && <p className="text-sm font-semibold text-red-500 bg-red-50 dark:bg-red-950/30 px-3 py-2 rounded-xl">{error}</p>}

                <button onClick={handleTip} disabled={!phone.trim() || !amount || loading} className="btn-primary w-full flex items-center justify-center gap-2" style={{ background: 'linear-gradient(135deg,#6BCB77,#4ECDC4)' }}>
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <Banknote size={16} />}
                  {loading ? 'Sending…' : `Send KES ${amount} via M-Pesa`}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}

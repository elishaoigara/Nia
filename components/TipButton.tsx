'use client'

import { useState } from 'react'
import { Banknote, X, Loader2 } from 'lucide-react'

interface TipButtonProps {
  recipientUserId: string
  recipientUsername: string
}

export default function TipButton({ recipientUserId, recipientUsername }: TipButtonProps) {
  const [open, setOpen] = useState(false)
  const [phone, setPhone] = useState('')
  const [amount, setAmount] = useState('50')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleTip() {
    setLoading(true)
    setError(null)
    setMessage(null)

    try {
      const res = await fetch('/api/mpesa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipientUserId, amount: Number(amount), phone }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Payment failed')
      } else {
        setMessage(data.message)
      }
    } catch {
      setError('Network error. Try again.')
    } finally {
      setLoading(false)
    }
  }

  const QUICK_AMOUNTS = ['10', '50', '100', '200']

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 text-sm text-zinc-400 hover:text-green-500 transition-colors"
        title={`Tip @${recipientUsername}`}
      >
        <Banknote size={15} />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-sm rounded-t-3xl sm:rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg">Tip @{recipientUsername}</h3>
              <button onClick={() => { setOpen(false); setMessage(null); setError(null) }} className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                <X size={18} />
              </button>
            </div>

            {message ? (
              <div className="text-center py-4">
                <div className="text-4xl mb-2">🎉</div>
                <p className="font-medium text-green-600">{message}</p>
                <p className="text-sm text-zinc-400 mt-1">Check your Safaricom phone for the prompt.</p>
                <button onClick={() => { setOpen(false); setMessage(null) }} className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-medium">Done</button>
              </div>
            ) : (
              <>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-zinc-500">M-Pesa Phone Number</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="07XX XXX XXX"
                    className="w-full px-3 py-2.5 bg-zinc-50 dark:bg-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-medium text-zinc-500">Amount (KES)</label>
                  <div className="grid grid-cols-4 gap-2">
                    {QUICK_AMOUNTS.map(a => (
                      <button
                        key={a}
                        onClick={() => setAmount(a)}
                        className={`py-2 rounded-xl text-sm font-medium transition-colors ${
                          amount === a
                            ? 'bg-purple-600 text-white'
                            : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-purple-50'
                        }`}
                      >
                        {a}
                      </button>
                    ))}
                  </div>
                  <input
                    type="number"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    min="1"
                    placeholder="Custom amount"
                    className="w-full px-3 py-2.5 bg-zinc-50 dark:bg-zinc-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>

                {error && <p className="text-sm text-red-500">{error}</p>}

                <button
                  onClick={handleTip}
                  disabled={!phone.trim() || !amount || loading}
                  className="w-full py-3 bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <Banknote size={16} />}
                  {loading ? 'Sending…' : `Send KES ${amount}`}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}

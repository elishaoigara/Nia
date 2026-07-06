'use client'

import { useState } from 'react'
import { X, Loader2 } from 'lucide-react'

const REASONS = [
  'Spam or scam',
  'Harassment or bullying',
  'Nudity or sexual content',
  'Pretending to be someone else',
  'Underage user',
  'Something else',
]

export default function ReportSheet({
  onClose,
  onSubmit,
}: {
  onClose: () => void
  onSubmit: (reason: string) => Promise<void>
}) {
  const [selected, setSelected] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  async function submit() {
    if (!selected) return
    setSubmitting(true)
    await onSubmit(selected)
    setSubmitting(false)
    setDone(true)
    setTimeout(onClose, 1100)
  }

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, zIndex: 70, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 480, background: 'var(--surface-1)', borderRadius: '20px 20px 0 0', padding: '16px 18px calc(18px + env(safe-area-inset-bottom, 0px))' }}
      >
        {done ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <p style={{ fontWeight: 700, fontSize: 15 }}>Report sent</p>
            <p style={{ fontSize: 13, color: 'var(--text-tertiary)', marginTop: 4 }}>Thanks — our team will review this conversation.</p>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <p style={{ fontWeight: 800, fontSize: 16, margin: 0 }}>Report this conversation</p>
              <button onClick={onClose} className="tap-sm" style={{ width: 30, height: 30, borderRadius: 8, border: 'none', background: 'var(--surface-3)', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <X size={14} />
              </button>
            </div>
            {REASONS.map(reason => (
              <button
                key={reason}
                onClick={() => setSelected(reason)}
                className="tap-sm"
                style={{
                  width: '100%', textAlign: 'left', padding: '12px 12px', borderRadius: 12,
                  border: '1px solid ' + (selected === reason ? 'var(--nia-violet)' : 'var(--border)'),
                  background: selected === reason ? 'rgba(91,33,182,0.08)' : 'transparent',
                  marginBottom: 8, cursor: 'pointer', fontFamily: 'inherit',
                  fontSize: 14, fontWeight: 600, color: 'var(--text-primary)',
                }}
              >
                {reason}
              </button>
            ))}
            <button
              onClick={submit}
              disabled={!selected || submitting}
              className="tap-sm"
              style={{
                width: '100%', marginTop: 6, padding: '13px', borderRadius: 14, border: 'none',
                background: 'var(--nia-coral)', color: 'white', fontWeight: 700, fontSize: 14,
                cursor: 'pointer', opacity: !selected || submitting ? 0.5 : 1,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              {submitting && <Loader2 size={14} className="animate-spin" />}
              Submit report
            </button>
          </>
        )}
      </div>
    </div>
  )
}
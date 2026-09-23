'use client'

import { useEffect, useId, useState } from 'react'
import { Loader2, X } from 'lucide-react'

const REASONS = [
  'Spam or scam',
  'Harassment or bullying',
  'Hate speech or discrimination',
  'Nudity or sexual content',
  'False or misleading information',
  'Pretending to be someone else',
  'Something else',
]

interface ReportSheetProps {
  onClose: () => void
  onSubmit: (reason: string, details: string) => Promise<boolean | void>
  title?: string
  description?: string
  successMessage?: string
}

export default function ReportSheet({
  onClose,
  onSubmit,
  title = 'Report this content',
  description = 'Choose the reason that best describes the problem. Nia moderators will review your report.',
  successMessage = 'Thanks — our moderation team will review your report.',
}: ReportSheetProps) {
  const titleId = useId()
  const descriptionId = useId()
  const [selected, setSelected] = useState<string | null>(null)
  const [details, setDetails] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !submitting) onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose, submitting])

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!selected || submitting) return
    setSubmitting(true)
    setError('')
    try {
      const succeeded = await onSubmit(selected, details.trim())
      if (succeeded === false) {
        setError('Your report could not be sent. Please try again.')
        return
      }
      setDone(true)
    } catch {
      setError('Your report could not be sent. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      role="presentation"
      onMouseDown={event => { if (event.target === event.currentTarget && !submitting) onClose() }}
      style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(0,0,0,0.52)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        style={{ width: '100%', maxWidth: 500, maxHeight: '88vh', overflowY: 'auto', background: 'var(--surface-1)', borderRadius: '22px 22px 0 0', padding: '18px 18px calc(20px + env(safe-area-inset-bottom, 0px))', boxShadow: '0 -16px 48px rgba(0,0,0,0.24)' }}
      >
        {done ? (
          <div role="status" style={{ textAlign: 'center', padding: '28px 10px 20px' }}>
            <p style={{ fontWeight: 800, fontSize: 17, margin: 0 }}>Report sent</p>
            <p style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--text-tertiary)', margin: '6px auto 18px', maxWidth: 340 }}>{successMessage}</p>
            <button type="button" onClick={onClose} className="btn-primary" style={{ minWidth: 120 }}>Done</button>
          </div>
        ) : (
          <form onSubmit={submit}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 14 }}>
              <div>
                <h2 id={titleId} style={{ fontWeight: 800, fontSize: 18, margin: 0 }}>{title}</h2>
                <p id={descriptionId} style={{ fontSize: 13, lineHeight: 1.5, color: 'var(--text-tertiary)', margin: '5px 0 0' }}>{description}</p>
              </div>
              <button type="button" onClick={onClose} disabled={submitting} aria-label="Close report form" className="tap-sm" style={{ width: 32, height: 32, flexShrink: 0, borderRadius: 9, border: 'none', background: 'var(--surface-3)', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <X size={15} />
              </button>
            </div>

            <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
              <legend className="sr-only">Reason for report</legend>
              {REASONS.map(reason => (
                <label
                  key={reason}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '11px 12px', borderRadius: 12, border: `1px solid ${selected === reason ? 'var(--nia-violet)' : 'var(--border)'}`, background: selected === reason ? 'rgba(91,33,182,0.08)' : 'transparent', marginBottom: 7, cursor: 'pointer', fontSize: 13.5, fontWeight: 600, color: 'var(--text-primary)' }}
                >
                  <input type="radio" name="report-reason" value={reason} checked={selected === reason} onChange={() => setSelected(reason)} style={{ accentColor: 'var(--nia-violet)' }} />
                  {reason}
                </label>
              ))}
            </fieldset>

            <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)', marginTop: 12 }}>
              Add context <span style={{ fontWeight: 500, color: 'var(--text-tertiary)' }}>(optional)</span>
              <textarea
                value={details}
                onChange={event => setDetails(event.target.value.slice(0, 500))}
                rows={3}
                placeholder="Share details that could help moderators understand what happened."
                style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', marginTop: 6, border: '1px solid var(--border)', borderRadius: 12, padding: '10px 12px', background: 'var(--surface-2)', color: 'var(--text-primary)', font: 'inherit', fontSize: 13, lineHeight: 1.5, outline: 'none' }}
              />
            </label>
            <p style={{ textAlign: 'right', fontSize: 10.5, color: 'var(--text-tertiary)', margin: '3px 2px 0' }}>{details.length}/500</p>

            {error && <p role="alert" style={{ color: 'var(--nia-coral)', fontSize: 12.5, margin: '10px 0 0' }}>{error}</p>}

            <button type="submit" disabled={!selected || submitting} className="tap-sm" style={{ width: '100%', marginTop: 14, padding: 13, borderRadius: 14, border: 'none', background: 'var(--nia-coral)', color: 'white', fontWeight: 800, fontSize: 14, cursor: 'pointer', opacity: !selected || submitting ? 0.5 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              {submitting && <Loader2 size={14} className="animate-spin" />}
              Submit report
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

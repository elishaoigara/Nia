'use client'

import { useState } from 'react'
import { Flag, Loader2, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  circleId: string
  accentColor: string
}

const REASONS = [
  'Harassment or bullying',
  'Hate or discrimination',
  'Spam or scams',
  'Unsafe or misleading content',
  'Other concern',
]

export default function ReportCircleButton({ circleId, accentColor }: Props) {
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState(REASONS[0])
  const [details, setDetails] = useState('')
  const [status, setStatus] = useState<'idle' | 'saving' | 'done' | 'error'>('idle')

  async function submit() {
    setStatus('saving')
    const fullReason = details.trim() ? `${reason}: ${details.trim()}` : reason
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setStatus('error'); return }
    const { error } = await supabase.from('circle_reports').insert({
      circle_id: circleId,
      reporter_id: user.id,
      reason: fullReason,
    })
    setStatus(error ? 'error' : 'done')
  }

  return (
    <>
      <button type="button" className="btn-ghost flex items-center gap-1.5 text-xs" onClick={() => { setOpen(true); setStatus('idle') }} aria-label="Report this Circle">
        <Flag size={13} /> Report
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 p-3 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="report-circle-title">
          <div className="card w-full max-w-md space-y-4 p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="report-circle-title" className="text-lg font-extrabold">Report this Circle</h2>
                <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>Help keep Nia constructive and safe.</p>
              </div>
              <button type="button" className="btn-ghost !px-2 !py-2" onClick={() => setOpen(false)} aria-label="Close report dialog"><X size={16} /></button>
            </div>
            {status === 'done' ? (
              <div className="space-y-3">
                <p className="rounded-xl p-3 text-sm font-semibold" style={{ background: `${accentColor}14`, color: accentColor }}>Thanks. Your report has been sent for review.</p>
                <button type="button" className="btn-primary w-full" onClick={() => setOpen(false)}>Done</button>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <label htmlFor="circle-report-reason" className="text-sm font-bold">What is the concern?</label>
                  <select id="circle-report-reason" value={reason} onChange={event => setReason(event.target.value)} className="input w-full">
                    {REASONS.map(item => <option key={item}>{item}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label htmlFor="circle-report-details" className="text-sm font-bold">Additional context <span style={{ color: 'var(--text-tertiary)' }}>(optional)</span></label>
                  <textarea id="circle-report-details" value={details} onChange={event => setDetails(event.target.value.slice(0, 400))} rows={3} className="input w-full resize-none" placeholder="Tell us what happened..." />
                </div>
                {status === 'error' && <p className="text-sm font-semibold" style={{ color: 'var(--nia-coral)' }}>We could not submit this report. Please try again.</p>}
                <div className="flex justify-end gap-2">
                  <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>Cancel</button>
                  <button type="button" className="btn-primary flex items-center gap-2" onClick={submit} disabled={status === 'saving'}>
                    {status === 'saving' && <Loader2 size={14} className="animate-spin" />} Send report
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}

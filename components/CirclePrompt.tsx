'use client'

import { useEffect, useState } from 'react'
import { MessageCircle, Plus, Send, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  circleId: string
  userId: string
  isOwner: boolean
  accentColor: string
}

export default function CirclePrompt({ circleId, userId, isOwner, accentColor }: Props) {
  const supabase = createClient()
  const [prompt, setPrompt] = useState<{ id: string; prompt: string } | null>(null)
  const [draft, setDraft] = useState('')
  const [showComposer, setShowComposer] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function loadPrompt() {
      const { data } = await supabase
        .from('circle_prompts')
        .select('id, prompt')
        .eq('circle_id', circleId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (!cancelled) {
        setPrompt(data)
        setLoading(false)
      }
    }
    loadPrompt()
    return () => { cancelled = true }
  }, [circleId, supabase])

  async function publishPrompt() {
    const value = draft.trim()
    if (!value || value.length > 280) return
    setSaving(true)
    setError('')
    const { data, error: insertError } = await supabase
      .from('circle_prompts')
      .insert({ circle_id: circleId, created_by: userId, prompt: value })
      .select('id, prompt')
      .single()
    if (insertError) {
      setError('Prompts are not available until the latest Circle migration is applied.')
    } else {
      setPrompt(data)
      setDraft('')
      setShowComposer(false)
    }
    setSaving(false)
  }

  if (loading || (!prompt && !isOwner)) return null

  return (
    <section className="card" aria-labelledby="circle-prompt-heading" style={{ borderColor: `${accentColor}55`, background: `linear-gradient(135deg, ${accentColor}0d, var(--surface-1))` }}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full" style={{ background: `${accentColor}22`, color: accentColor }}>
            <MessageCircle size={17} />
          </div>
          <div>
            <p id="circle-prompt-heading" className="text-[11px] font-extrabold uppercase tracking-[0.08em]" style={{ color: accentColor }}>Conversation starter</p>
            {prompt ? <p className="mt-1 text-sm font-semibold leading-relaxed">{prompt.prompt}</p> : <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>Give this Circle a question worth answering.</p>}
          </div>
        </div>
        {isOwner && !showComposer && <button type="button" className="btn-ghost shrink-0 !px-2 !py-1.5" onClick={() => setShowComposer(true)} aria-label="Create a Circle conversation prompt"><Plus size={15} /></button>}
      </div>

      {isOwner && showComposer && (
        <div className="mt-4 space-y-2">
          <label htmlFor="circle-prompt-input" className="sr-only">Conversation prompt</label>
          <textarea id="circle-prompt-input" value={draft} onChange={event => setDraft(event.target.value.slice(0, 280))} rows={3} maxLength={280} className="input w-full resize-none" placeholder="What should this Circle talk about or work on together?" />
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{draft.length}/280</span>
            <div className="flex gap-2">
              <button type="button" className="btn-ghost" onClick={() => { setShowComposer(false); setDraft(''); setError('') }}>Cancel</button>
              <button type="button" className="btn-primary flex items-center gap-2" disabled={saving || !draft.trim()} onClick={publishPrompt}>
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Publish
              </button>
            </div>
          </div>
          {error && <p className="text-xs" style={{ color: 'var(--nia-coral)' }}>{error}</p>}
        </div>
      )}
    </section>
  )
}

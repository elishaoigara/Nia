'use client'

import { useEffect, useState } from 'react'
import { Loader2, Send } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface ResponseRow { id: string; response_type: string; content: string; created_at: string; profiles?: { username?: string | null; avatar_url?: string | null } | null }
interface Props { circleId: string; userId: string }

const TYPES = [
  { value: 'offer', label: 'I can help' },
  { value: 'question', label: 'I have a question' },
  { value: 'update', label: 'Progress update' },
  { value: 'support', label: 'Encouragement' },
] as const

export default function CircleResponses({ circleId, userId }: Props) {
  const supabase = createClient()
  const [responses, setResponses] = useState<ResponseRow[]>([])
  const [type, setType] = useState<(typeof TYPES)[number]['value']>('offer')
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data } = await supabase.from('circle_responses').select('id, response_type, content, created_at, profiles:user_id (username, avatar_url)').eq('circle_id', circleId).order('created_at', { ascending: false }).limit(20)
      if (!cancelled) { setResponses((data ?? []) as unknown as ResponseRow[]); setLoading(false) }
    }
    load()
    return () => { cancelled = true }
  }, [circleId, supabase])

  async function submit() {
    if (!content.trim()) return
    setSaving(true); setError('')
    const { data, error: insertError } = await supabase.from('circle_responses').insert({ circle_id: circleId, user_id: userId, response_type: type, content: content.trim() }).select('id, response_type, content, created_at, profiles:user_id (username, avatar_url)').single()
    if (insertError) setError('Responses are not available until the latest Circle migration is applied.')
    else if (data) { setResponses(current => [data as unknown as ResponseRow, ...current]); setContent('') }
    setSaving(false)
  }

  if (loading) return null
  return <section className="card space-y-4" aria-labelledby="circle-responses-heading"><div><p className="text-[11px] font-extrabold uppercase tracking-[0.08em]" style={{ color: 'var(--nia-violet)' }}>Member contributions</p><h2 id="circle-responses-heading" className="mt-1 text-lg font-extrabold">What can we add together?</h2><p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>Make participation useful by asking, offering, updating, or encouraging.</p></div><div className="space-y-3"><div className="flex flex-wrap gap-2" role="group" aria-label="Contribution type">{TYPES.map(item => <button key={item.value} type="button" className="btn-ghost text-xs" aria-pressed={type === item.value} onClick={() => setType(item.value)} style={type === item.value ? { background: 'rgba(91,33,182,0.1)', color: 'var(--nia-violet)', borderColor: 'rgba(91,33,182,0.25)' } : undefined}>{item.label}</button>)}</div><div className="flex gap-2"><label htmlFor="circle-response" className="sr-only">Your contribution</label><textarea id="circle-response" className="input min-h-12 flex-1 resize-none" rows={2} maxLength={500} value={content} onChange={event => setContent(event.target.value)} placeholder="Add something useful to this Circle..." /><button type="button" className="btn-primary self-end !px-3" aria-label="Post contribution" disabled={saving || !content.trim()} onClick={submit}>{saving ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}</button></div>{error && <p role="alert" className="text-xs font-semibold" style={{ color: 'var(--nia-coral)' }}>{error}</p>}</div>{responses.length > 0 && <div className="space-y-2">{responses.map(response => <article key={response.id} className="rounded-xl p-3" style={{ background: 'var(--surface-2)' }}><div className="flex items-center justify-between gap-2"><span className="text-xs font-extrabold" style={{ color: 'var(--nia-violet)' }}>{TYPES.find(item => item.value === response.response_type)?.label ?? response.response_type}</span><time className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{new Date(response.created_at).toLocaleDateString()}</time></div><p className="mt-1 text-sm leading-relaxed">{response.content}</p><p className="mt-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>@{response.profiles?.username ?? 'member'}</p></article>)}</div>}</section>
}

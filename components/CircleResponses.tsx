'use client'

import { useEffect, useMemo, useState } from 'react'
import { Check, Filter, Loader2, Send, Sparkles } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface ResponseRow {
  id: string
  response_type: string
  content: string
  created_at: string
  profiles?: { username?: string | null; avatar_url?: string | null } | null
}
interface Props { circleId: string; userId: string }

const TYPES = [
  { value: 'offer', label: 'I can help', placeholder: 'What can you help with?', color: 'violet' },
  { value: 'question', label: 'I have a question', placeholder: 'What would you like to ask?', color: 'coral' },
  { value: 'update', label: 'Progress update', placeholder: 'What moved forward?', color: 'sky' },
  { value: 'support', label: 'Encouragement', placeholder: 'Encourage someone in this Circle...', color: 'mint' },
] as const

type ResponseType = (typeof TYPES)[number]['value']

function typeMeta(type: string) {
  return TYPES.find(item => item.value === type) ?? TYPES[3]
}

export default function CircleResponses({ circleId, userId }: Props) {
  const supabase = createClient()
  const [responses, setResponses] = useState<ResponseRow[]>([])
  const [type, setType] = useState<ResponseType>('offer')
  const [filter, setFilter] = useState<'all' | ResponseType>('all')
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [live, setLive] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data, error: loadError } = await supabase.from('circle_responses').select('id, response_type, content, created_at, profiles:user_id (username, avatar_url)').eq('circle_id', circleId).order('created_at', { ascending: false }).limit(30)
      if (!cancelled) {
        setResponses((data ?? []) as unknown as ResponseRow[])
        if (loadError) setError('Responses could not be loaded right now.')
        setLoading(false)
      }
    }
    load()
    const channel = supabase.channel(`circle-responses-${circleId}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'circle_responses', filter: `circle_id=eq.${circleId}` }, payload => {
      const next = payload.new as ResponseRow
      setResponses(current => current.some(item => item.id === next.id) ? current : [next, ...current])
    }).subscribe(status => setLive(status === 'SUBSCRIBED'))
    return () => { cancelled = true; void supabase.removeChannel(channel) }
  }, [circleId, supabase])

  async function submit() {
    if (!content.trim()) return
    setSaving(true); setError('')
    const { data, error: insertError } = await supabase.from('circle_responses').insert({ circle_id: circleId, user_id: userId, response_type: type, content: content.trim() }).select('id, response_type, content, created_at, profiles:user_id (username, avatar_url)').single()
    if (insertError) setError('Responses are not available until the latest Circle migration is applied.')
    else if (data) { setResponses(current => [data as unknown as ResponseRow, ...current]); setContent('') }
    setSaving(false)
  }

  const visibleResponses = useMemo(() => filter === 'all' ? responses : responses.filter(response => response.response_type === filter), [filter, responses])
  if (loading) return null

  return (
    <section className="card circle-responses" aria-labelledby="circle-responses-heading">
      <div className="circle-responses-header">
        <div>
          <p className="home-eyebrow">Member contributions</p>
          <div className="circle-responses-title-row"><h2 id="circle-responses-heading">What can we add together?</h2>{live && <span className="home-live-label"><span /> Live</span>}</div>
          <p className="circle-responses-description">Choose a way to participate. Small contributions move a Circle forward.</p>
        </div>
        <Sparkles size={20} className="circle-responses-spark" aria-hidden="true" />
      </div>

      <div className="circle-response-actions" role="group" aria-label="Contribution action">
        {TYPES.map(item => <button key={item.value} type="button" className={`circle-response-action circle-response-action--${item.color}${type === item.value ? ' is-selected' : ''}`} aria-pressed={type === item.value} onClick={() => { setType(item.value); setFilter(item.value); }}>{item.label}</button>)}
      </div>
      <div className="circle-response-compose">
        <label htmlFor="circle-response" className="sr-only">Your contribution</label>
        <textarea id="circle-response" className="input circle-response-input" rows={2} maxLength={500} value={content} onChange={event => setContent(event.target.value)} placeholder={typeMeta(type).placeholder} />
        <button type="button" className="btn-primary circle-response-send" aria-label={`Post ${typeMeta(type).label}`} disabled={saving || !content.trim()} onClick={submit}>{saving ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}</button>
      </div>
      {error && <p role="alert" className="circle-response-error">{error}</p>}

      {responses.length > 0 && <div className="circle-response-filter-row"><Filter size={14} aria-hidden="true" /><span className="circle-response-filter-label">Show</span>{(['all', ...TYPES.map(item => item.value)] as const).map(value => <button key={value} type="button" className={`circle-response-filter${filter === value ? ' is-selected' : ''}`} onClick={() => setFilter(value)}>{value === 'all' ? 'All' : typeMeta(value).label}</button>)}</div>}
      {visibleResponses.length > 0 && <div className="circle-response-list">{visibleResponses.map(response => { const meta = typeMeta(response.response_type); return <article key={response.id} className="circle-response-card"><div className="circle-response-card-head"><span className={`circle-response-badge circle-response-badge--${meta.color}`}><Check size={12} /> {meta.label}</span><time>{new Date(response.created_at).toLocaleDateString()}</time></div><p className="circle-response-card-content">{response.content}</p><p className="circle-response-author">@{response.profiles?.username ?? 'member'}</p></article> })}</div>}
      {responses.length > 0 && visibleResponses.length === 0 && <p className="circle-response-no-match">No contributions in this view yet. Try another action.</p>}
    </section>
  )
}

'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Check, Loader2, ShieldCheck } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type Source = 'reports' | 'message_reports' | 'circle_reports'
type QueueItem = {
  id: string
  source: Source
  reason: string
  details?: string | null
  status: string
  priority?: string | null
  created_at: string
  entity_type?: string | null
  entity_id?: string | null
  reported_user_id?: string | null
  circle_id?: string | null
  message_id?: string | null
}

const SOURCE_LABEL: Record<Source, string> = {
  reports: 'Report',
  message_reports: 'Message report',
  circle_reports: 'Circle report',
}

export default function ModerationPage() {
  const supabase = createClient()
  const [items, setItems] = useState<QueueItem[]>([])
  const [isModerator, setIsModerator] = useState(false)
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'reviewed'>('all')

  const loadQueue = useCallback(async () => {
    setLoading(true)
    setError('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setLoading(false); return }

    const { data: role } = await supabase.from('moderator_roles').select('role').eq('user_id', user.id).maybeSingle()
    const moderator = !!role && ['moderator', 'admin'].includes(role.role)
    setIsModerator(moderator)
    if (!moderator) { setLoading(false); return }

    const [general, messages, circles] = await Promise.all([
      supabase.from('reports').select('id, reason, details, status, priority, created_at, entity_type, entity_id, reported_user_id').in('status', ['open', 'reviewed']).order('created_at', { ascending: false }).limit(100),
      supabase.from('message_reports').select('id, reason, details, status, created_at, reported_user_id, message_id').in('status', ['pending', 'reviewed']).order('created_at', { ascending: false }).limit(100),
      supabase.from('circle_reports').select('id, reason, status, created_at, circle_id').in('status', ['pending', 'reviewed']).order('created_at', { ascending: false }).limit(100),
    ])
    if (general.error || messages.error || circles.error) setError('Some reports could not be loaded. Check the migration and moderator role assignment.')
    const next: QueueItem[] = [
      ...(general.data ?? []).map(item => ({ ...item, source: 'reports' as const })),
      ...(messages.data ?? []).map(item => ({ ...item, source: 'message_reports' as const })),
      ...(circles.data ?? []).map(item => ({ ...item, source: 'circle_reports' as const })),
    ]
    setItems(next.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()))
    setLoading(false)
  }, [supabase])

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadQueue() }, 0)
    return () => window.clearTimeout(timer)
  }, [loadQueue])

  async function review(item: QueueItem, nextStatus: 'reviewed' | 'resolved') {
    setSavingId(item.id)
    setError('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSavingId(null); return }
    const { error: updateError } = await supabase.from(item.source).update({ status: nextStatus }).eq('id', item.id)
    if (updateError) {
      setError(updateError.message)
      setSavingId(null)
      return
    }
    const { error: auditError } = await supabase.from('moderation_actions').insert({
      moderator_id: user.id,
      action: nextStatus,
      reason: item.reason,
      metadata: { source: item.source, source_id: item.id, entity_type: item.entity_type ?? null, entity_id: item.entity_id ?? item.circle_id ?? item.message_id ?? null },
    })
    if (auditError) setError('Report updated, but the audit record could not be saved.')
    setItems(current => current.map(currentItem => currentItem.id === item.id && currentItem.source === item.source ? { ...currentItem, status: nextStatus } : currentItem).filter(currentItem => currentItem.status !== 'resolved'))
    setSavingId(null)
  }

  const openCount = useMemo(() => items.filter(item => ['open', 'pending'].includes(item.status)).length, [items])
  const visibleItems = useMemo(() => statusFilter === 'all' ? items : items.filter(item => statusFilter === 'open' ? ['open', 'pending'].includes(item.status) : item.status === 'reviewed'), [items, statusFilter])

  if (loading) return <main className="mx-auto flex min-h-[60vh] max-w-xl items-center justify-center"><Loader2 className="animate-spin" style={{ color: 'var(--nia-violet)' }} /></main>
  if (!isModerator) return <main className="mx-auto max-w-xl px-4 py-12"><div className="card space-y-3 text-center"><ShieldCheck className="mx-auto" size={32} style={{ color: 'var(--nia-violet)' }} /><h1 className="text-xl font-extrabold">Moderator access required</h1><p style={{ color: 'var(--text-secondary)' }}>This area is only available to trusted Nia moderators.</p></div></main>

  return (
    <main className="mx-auto w-full max-w-2xl space-y-5 px-4 py-6">
      <header className="flex items-start justify-between gap-4">
        <div><p className="text-xs font-extrabold uppercase tracking-[0.08em]" style={{ color: 'var(--nia-violet)' }}>Trust & safety</p><h1 className="mt-1 text-2xl font-extrabold">Moderation queue</h1><p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>Review reports consistently and leave an auditable trail.</p></div>
        <span className="rounded-full px-3 py-1 text-xs font-bold" style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}>{openCount} open</span>
      </header>
      {error && <p role="alert" className="rounded-xl p-3 text-sm font-semibold" style={{ background: 'rgba(255,107,107,0.1)', color: 'var(--nia-coral)' }}>{error}</p>}
      <div className="moderation-filter-row" role="group" aria-label="Filter moderation reports">{(['all', 'open', 'reviewed'] as const).map(filter => <button key={filter} type="button" className={`moderation-filter${statusFilter === filter ? ' is-selected' : ''}`} aria-pressed={statusFilter === filter} onClick={() => setStatusFilter(filter)}>{filter === 'all' ? `All (${items.length})` : filter === 'open' ? `Needs review (${openCount})` : `Reviewed (${items.filter(item => item.status === 'reviewed').length})`}</button>)}</div>
      {visibleItems.length === 0 ? <div className="card py-12 text-center"><Check className="mx-auto mb-3" style={{ color: 'var(--nia-mint)' }} /><p className="font-bold">{statusFilter === 'all' ? 'Queue is clear' : 'No reports in this view'}</p><p className="mt-1 text-sm" style={{ color: 'var(--text-tertiary)' }}>New reports will appear here for review.</p></div> : <div className="space-y-3">{visibleItems.map(item => <article key={`${item.source}:${item.id}`} className="card space-y-3"><div className="flex items-start justify-between gap-3"><div className="flex items-start gap-3"><div className="mt-0.5 rounded-full p-2" style={{ background: 'rgba(255,193,7,0.14)', color: 'var(--nia-amber)' }}><AlertTriangle size={16} /></div><div><div className="flex flex-wrap items-center gap-2"><span className="text-xs font-extrabold uppercase tracking-wide" style={{ color: 'var(--nia-violet)' }}>{SOURCE_LABEL[item.source]}</span>{item.priority && <span className="text-xs font-bold" style={{ color: 'var(--nia-coral)' }}>{item.priority} priority</span>}</div><p className="mt-1 font-bold">{item.reason}</p><p className="mt-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>{new Date(item.created_at).toLocaleString()} · {item.status}</p></div></div></div>{item.details && <p className="rounded-xl p-3 text-sm" style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}>{item.details}</p>}<div className="flex justify-end gap-2"><button type="button" className="btn-ghost" disabled={savingId === item.id} onClick={() => review(item, 'reviewed')}>Mark reviewed</button><button type="button" className="btn-primary flex items-center gap-2" disabled={savingId === item.id} onClick={() => review(item, 'resolved')}>{savingId === item.id && <Loader2 size={14} className="animate-spin" />} Resolve</button></div></article>)}</div>}
    </main>
  )
}

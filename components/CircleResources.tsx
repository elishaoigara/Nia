'use client'

import { useEffect, useState } from 'react'
import { ExternalLink, Link2, Loader2, Plus, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface Resource { id: string; title: string; url: string; resource_type: string; description: string | null }
interface Props { circleId: string; userId: string; isOwner: boolean }

const TYPES = ['link', 'document', 'opportunity', 'event', 'tool'] as const

export default function CircleResources({ circleId, userId, isOwner }: Props) {
  const supabase = createClient()
  const [resources, setResources] = useState<Resource[]>([])
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [description, setDescription] = useState('')
  const [type, setType] = useState<(typeof TYPES)[number]>('link')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function load() {
      const { data } = await supabase.from('circle_resources').select('id, title, url, resource_type, description').eq('circle_id', circleId).order('created_at', { ascending: false }).limit(20)
      if (!cancelled) { setResources(data ?? []); setLoading(false) }
    }
    load()
    return () => { cancelled = true }
  }, [circleId, supabase])

  async function addResource() {
    if (!title.trim() || !url.trim()) return
    setSaving(true); setError('')
    const { data, error: insertError } = await supabase.from('circle_resources').insert({ circle_id: circleId, created_by: userId, title: title.trim(), url: url.trim(), resource_type: type, description: description.trim() || null }).select('id, title, url, resource_type, description').single()
    if (insertError) setError('Resources are not available until the latest Circle migration is applied.')
    else if (data) { setResources(current => [data, ...current]); setTitle(''); setUrl(''); setDescription(''); setType('link'); setOpen(false) }
    setSaving(false)
  }

  async function removeResource(id: string) {
    const { error: deleteError } = await supabase.from('circle_resources').delete().eq('id', id)
    if (!deleteError) setResources(current => current.filter(item => item.id !== id))
  }

  if (loading || (!isOwner && resources.length === 0)) return null

  return (
    <section className="card space-y-4" aria-labelledby="circle-resources-heading">
      <div className="flex items-start justify-between gap-3">
        <div><p className="text-[11px] font-extrabold uppercase tracking-[0.08em]" style={{ color: 'var(--nia-violet)' }}>Shared shelf</p><h2 id="circle-resources-heading" className="mt-1 text-lg font-extrabold">Resources for the journey</h2><p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>Keep useful links, tools, opportunities, and events together.</p></div>
        {isOwner && <button type="button" className="btn-ghost flex items-center gap-1.5 text-xs" onClick={() => setOpen(value => !value)}>{open ? <X size={14} /> : <Plus size={14} />} {open ? 'Close' : 'Add resource'}</button>}
      </div>
      {open && <div className="space-y-3 rounded-xl p-3" style={{ background: 'var(--surface-2)' }}><div className="grid gap-3 sm:grid-cols-2"><div><label htmlFor="resource-title" className="text-xs font-bold">Title</label><input id="resource-title" className="input mt-1 w-full" value={title} onChange={event => setTitle(event.target.value.slice(0, 120))} placeholder="e.g. Free design course" /></div><div><label htmlFor="resource-type" className="text-xs font-bold">Type</label><select id="resource-type" className="input mt-1 w-full" value={type} onChange={event => setType(event.target.value as (typeof TYPES)[number])}>{TYPES.map(item => <option key={item} value={item}>{item[0].toUpperCase() + item.slice(1)}</option>)}</select></div></div><div><label htmlFor="resource-url" className="text-xs font-bold">URL</label><input id="resource-url" className="input mt-1 w-full" type="url" value={url} onChange={event => setUrl(event.target.value.slice(0, 1000))} placeholder="https://..." /></div><div><label htmlFor="resource-description" className="text-xs font-bold">Why it matters <span style={{ color: 'var(--text-tertiary)' }}>(optional)</span></label><textarea id="resource-description" className="input mt-1 w-full resize-none" rows={2} value={description} onChange={event => setDescription(event.target.value.slice(0, 280))} placeholder="A short note for Circle members" /></div>{error && <p role="alert" className="text-xs font-semibold" style={{ color: 'var(--nia-coral)' }}>{error}</p>}<div className="flex justify-end"><button type="button" className="btn-primary flex items-center gap-2" disabled={saving || !title.trim() || !url.trim()} onClick={addResource}>{saving && <Loader2 size={14} className="animate-spin" />} Save resource</button></div></div>}
      {resources.length > 0 && <div className="space-y-2">{resources.map(resource => <div key={resource.id} className="flex items-start justify-between gap-3 rounded-xl p-3" style={{ background: 'var(--surface-2)' }}><div className="flex min-w-0 items-start gap-3"><div className="mt-0.5 shrink-0" style={{ color: 'var(--nia-violet)' }}><Link2 size={16} /></div><div className="min-w-0"><a href={resource.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{resource.title}<ExternalLink size={12} /></a><p className="text-[11px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-tertiary)' }}>{resource.resource_type}</p>{resource.description && <p className="mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>{resource.description}</p>}</div></div>{isOwner && <button type="button" className="btn-ghost !px-2 !py-1.5 text-xs" onClick={() => removeResource(resource.id)} aria-label={`Remove ${resource.title}`}>Remove</button>}</div>)}</div>}
    </section>
  )
}

'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CREATOR_CATEGORIES, EMPTY_CREATOR, readCreatorLinks, validateCreatorDetails, type CreatorDetails } from '@/lib/creator'

const inputClass = 'w-full rounded-xl border border-(--border) bg-(--surface-2) p-3 text-sm'
export default function CreatorSettings({ userId, onSaved }: { userId: string; onSaved?: () => void }) {
  const [details, setDetails] = useState<CreatorDetails>(EMPTY_CREATOR)
  const [loading, setLoading] = useState(true)
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [attempt, setAttempt] = useState(0)
  const lock = useRef(false)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const { data, error } = await createClient().from('creator_profiles').select('*').eq('user_id', userId).maybeSingle()
        if (error) throw error
        if (!cancelled) {
          setDetails(data ? { enabled: data.enabled, category: data.category ?? '', introduction: data.introduction, open_to_collaborations: data.open_to_collaborations, links: readCreatorLinks(data.links) } : EMPTY_CREATOR)
          setLoaded(true); setError('')
        }
      } catch { if (!cancelled) setError('Creator settings could not load. Please try again.') }
      finally { if (!cancelled) setLoading(false) }
    }
    void load()
    return () => { cancelled = true }
  }, [userId, attempt])

  function change(next: Partial<CreatorDetails>) { setDetails(current => ({ ...current, ...next })); setNotice(''); setError('') }
  async function save(event: React.FormEvent) {
    event.preventDefault()
    if (lock.current || !loaded) return
    lock.current = true; setSaving(true); setError(''); setNotice('')
    try {
      const value = validateCreatorDetails(details)
      const { data, error } = await createClient().from('creator_profiles').upsert({ user_id: userId, ...value, category: value.category || null }, { onConflict: 'user_id' }).select('user_id').single()
      if (error || !data) throw new Error('Could not save creator settings. Your changes are still here; please retry.')
      onSaved?.(); setDetails(value); setNotice(value.enabled ? 'Creator Mode is on. Your profile is ready.' : 'Creator Mode is off. Your creator details and featured work are hidden from other people.')
    } catch (error) { setError(error instanceof Error ? error.message : 'Could not save creator settings. Please retry.') }
    finally { lock.current = false; setSaving(false) }
  }

  if (loading) return <p role="status">Loading creator settings…</p>
  if (!loaded) return <div role="alert"><p>{error}</p><button className="btn-ghost" onClick={() => setAttempt(v => v + 1)}>Retry</button></div>
  return <form onSubmit={save} className="space-y-5">
    <div><h2 className="text-lg font-bold">Make room for what you create</h2><p className="mt-1 text-sm text-(--text-secondary)">Your usual Nia profile, with a little more space for your work. Free and optional.</p></div>
    <fieldset disabled={saving} className="min-w-0 space-y-5">
      <label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-(--border) p-4">
        <span><span className="block font-semibold">Creator Mode</span><span className="text-sm text-(--text-secondary)">Show your work, links and collaboration availability.</span></span>
        <input type="checkbox" role="switch" checked={details.enabled} onChange={e => change({ enabled: e.target.checked })} className="h-5 w-5 shrink-0 accent-(--nia-violet)" />
      </label>
      {details.enabled && <>
        <label className="block space-y-2"><span className="text-sm font-semibold">Creator category <span className="font-normal">(optional)</span></span><select className={inputClass} value={details.category} onChange={e => change({ category: e.target.value })}><option value="">No category</option>{CREATOR_CATEGORIES.map(category => <option key={category}>{category}</option>)}</select></label>
        <label className="block space-y-2"><span className="text-sm font-semibold">What I create</span><textarea className={inputClass} rows={3} maxLength={160} value={details.introduction} onChange={e => change({ introduction: e.target.value })} placeholder="I make music, build things, or tell stories…" /><span className="block text-right text-xs text-(--text-tertiary)">{details.introduction.length}/160</span></label>
        <label className="flex items-start gap-3 text-sm"><input type="checkbox" className="mt-1 accent-(--nia-violet)" checked={details.open_to_collaborations} onChange={e => change({ open_to_collaborations: e.target.checked })} /><span><span className="block font-semibold">Open to collaborations</span><span className="text-(--text-secondary)">Let people know you’re open to making something together. Your message settings still apply.</span></span></label>
        <div className="space-y-3"><h3 className="text-sm font-semibold">Your links <span className="font-normal">({details.links.length}/3)</span></h3>
          {details.links.map((link, index) => <div key={index} className="space-y-2 rounded-xl border border-(--border) p-3">
            <label className="block text-sm">Link name<input className={inputClass} maxLength={40} value={link.label} placeholder="My music" onChange={e => change({ links: details.links.map((item, i) => i === index ? { ...item, label: e.target.value } : item) })} /></label>
            <label className="block text-sm">Website address<input className={inputClass} type="url" maxLength={500} value={link.url} placeholder="https://…" onChange={e => change({ links: details.links.map((item, i) => i === index ? { ...item, url: e.target.value } : item) })} /></label>
            <button type="button" className="btn-ghost text-sm" aria-label={`Remove link ${index + 1}`} onClick={() => change({ links: details.links.filter((_, i) => i !== index) })}>Remove link</button>
          </div>)}
          {details.links.length < 3 && <button type="button" className="btn-ghost text-sm" onClick={() => change({ links: [...details.links, { label: '', url: '' }] })}>+ Add a link</button>}
        </div>
      </>}
      <button type="submit" className="btn-primary w-full">{saving ? 'Saving…' : 'Save creator details'}</button>
    </fieldset>
    {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    {notice && <p role="status" className="text-sm">{notice}</p>}
    <Link href="/creator" className="inline-block text-sm font-semibold text-(--nia-violet)">Featured work & your insights →</Link>
    <p className="text-xs text-(--text-tertiary)">Creator Mode doesn’t change your privacy, verify your account, or boost your posts.</p>
  </form>
}

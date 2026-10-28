'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { readCreatorInsights, type CreatorInsights } from '@/lib/creator'
import CreatorSettings from './CreatorSettings'

type Work = { id: string; content: string | null; media_type: string | null; created_at: string }
const PAGE_SIZE = 20
const METRICS: { key: keyof CreatorInsights; label: string; description: string }[] = [
  { key: 'recorded_views', label: 'Recorded views', description: 'First recorded view per person, per post, in the last 30 days. Currently collected by the Flicks viewer; not total plays or profile visits.' },
  { key: 'likes_and_reactions', label: 'Likes & reactions', description: 'Likes and emoji reactions still present, added in the last 30 days. A person can contribute more than one.' },
  { key: 'comments', label: 'Comments', description: 'Comments added in the last 30 days that have not been removed.' },
  { key: 'saves', label: 'Saves', description: 'Bookmarks added in the last 30 days that are still saved. You see totals, never who saved a post.' },
  { key: 'followers', label: 'Your community', description: 'People currently following you.' },
  { key: 'recent_followers', label: 'Recent followers', description: 'Current followers who followed in the last 30 days. This is not net growth; unfollows are not stored.' },
]

export default function CreatorTools({ userId }: { userId: string }) {
  const [loading, setLoading] = useState(true)
  const [enabled, setEnabled] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [insights, setInsights] = useState<CreatorInsights | null>(null)
  const [insightsError, setInsightsError] = useState('')
  const [insightsBusy, setInsightsBusy] = useState(false)
  const [work, setWork] = useState<Work[]>([])
  const [featured, setFeatured] = useState<Work[]>([])
  const [selectionReady, setSelectionReady] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [moreBusy, setMoreBusy] = useState(false)
  const [saving, setSaving] = useState(false)
  const [attempt, setAttempt] = useState(0)
  const lock = useRef(false)
  const offset = useRef(0)

  const fetchWork = useCallback(async (start: number) => {
    const { data, error } = await createClient().from('posts').select('id, content, media_type, created_at').eq('user_id', userId).is('circle_id', null).is('removed_at', null).order('created_at', { ascending: false }).order('id', { ascending: false }).range(start, start + PAGE_SIZE - 1)
    if (error) throw error
    return data ?? []
  }, [userId])

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const client = createClient()
        const { data, error } = await client.from('creator_profiles').select('enabled').eq('user_id', userId).maybeSingle()
        if (error) throw error
        if (cancelled) return
        setEnabled(Boolean(data?.enabled)); setError('')
        if (!data?.enabled) return
        const [items, selected, stats] = await Promise.all([
          fetchWork(0),
          client.from('creator_featured_posts').select('slot, posts:post_id(id, content, media_type, created_at)').eq('user_id', userId).order('slot'),
          client.rpc('creator_insights'),
        ])
        if (cancelled) return
        if (selected.error) throw selected.error
        setWork(items); offset.current = items.length; setHasMore(items.length === PAGE_SIZE)
        setFeatured(((selected.data ?? []) as unknown as { posts: Work | null }[]).flatMap(row => row.posts ? [row.posts] : [])); setSelectionReady(true)
        if (stats.error) setInsightsError('Your insights could not load. Please retry.')
        else { try { setInsights(readCreatorInsights(stats.data)); setInsightsError('') } catch { setInsightsError('Your insights could not load. Please retry.') } }
      } catch { if (!cancelled) setError('Creator tools could not load. Please try again.') }
      finally { if (!cancelled) setLoading(false) }
    }
    void load()
    return () => { cancelled = true }
  }, [userId, fetchWork, attempt])

  async function retryInsights() {
    if (insightsBusy) return
    setInsightsBusy(true)
    try {
      const { data, error } = await createClient().rpc('creator_insights')
      if (error) throw error
      setInsights(readCreatorInsights(data)); setInsightsError('')
    } catch { setInsightsError('Your insights could not load. Please retry.') }
    finally { setInsightsBusy(false) }
  }

  async function more() {
    if (moreBusy) return
    setMoreBusy(true); setError('')
    try { const items = await fetchWork(offset.current); offset.current += items.length; setHasMore(items.length === PAGE_SIZE); setWork(current => [...current, ...items.filter(item => !current.some(old => old.id === item.id))]) }
    catch { setError('Could not load more posts. Please try again.') }
    finally { setMoreBusy(false) }
  }
  function toggle(item: Work) {
    setNotice('')
    setFeatured(current => current.some(post => post.id === item.id) ? current.filter(post => post.id !== item.id) : current.length < 3 ? [...current, item] : current)
  }
  function move(index: number) {
    setNotice('')
    setFeatured(current => { const next = [...current]; [next[index - 1], next[index]] = [next[index], next[index - 1]]; return next })
  }
  async function save() {
    if (lock.current || !selectionReady) return
    lock.current = true; setSaving(true); setError(''); setNotice('')
    try {
      const { error } = await createClient().rpc('set_creator_featured_work', { post_ids: featured.map(post => post.id) })
      if (error) throw error
      setNotice('Featured work saved. Your selected order is now on your profile.')
    } catch { setError('Could not save featured work. A post may no longer be available. Your selection is still here; please retry or remove that post.') }
    finally { lock.current = false; setSaving(false) }
  }

  return <main className="mx-auto max-w-2xl space-y-6 px-4 py-5 pb-24">
    <header className="space-y-2"><Link href={`/profile/${userId}`} className="text-sm text-(--text-secondary)">← Your profile</Link><h1 className="text-2xl font-bold">Creator tools</h1><p className="text-sm text-(--text-secondary)">A little space to show your work and understand your community. Only you can see these tools.</p></header>
    {loading && <p role="status">Loading your tools…</p>}
    {error && <div role="alert" className="rounded-xl border border-(--border) p-3 text-sm"><p>{error}</p>{!selectionReady && <button className="btn-ghost" onClick={() => setAttempt(v => v + 1)}>Retry</button>}</div>}
    {!loading && !enabled && !error && <section className="rounded-2xl border border-(--border) p-4"><CreatorSettings userId={userId} onSaved={() => setAttempt(v => v + 1)} /></section>}
    {!loading && enabled && <>
      <Link href="/profile/edit#creator" className="inline-block text-sm font-semibold text-(--nia-violet)">Edit your creator details →</Link>
      <section aria-labelledby="insights-title" className="space-y-3"><h2 id="insights-title" className="text-lg font-bold">Your insights</h2><p className="text-xs text-(--text-tertiary)">Last 30 days, except your current community total. For your profile posts and Flicks. Engagement counts exclude your own interactions, Circle posts and removed posts.</p>
        {insightsError && <div role="alert" className="text-sm">{insightsError} <button className="btn-ghost" disabled={insightsBusy} onClick={retryInsights}>{insightsBusy ? 'Loading…' : 'Retry'}</button></div>}
        {insights && <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">{METRICS.map(metric => <div key={metric.key} className="rounded-2xl border border-(--border) bg-(--surface-1) p-4"><dt className="text-xs text-(--text-secondary)">{metric.label}</dt><dd className="mt-1 text-2xl font-bold">{insights[metric.key].toLocaleString()}</dd></div>)}</dl>}
        <details className="text-xs text-(--text-secondary)"><summary className="cursor-pointer">What do these numbers mean?</summary><ul className="mt-3 space-y-2">{METRICS.map(metric => <li key={metric.key}><strong>{metric.label}:</strong> {metric.description}</li>)}</ul><p className="mt-2">These are recorded interactions, not estimates. Removed reactions, unsaves and unfollows are not retained as historical events.</p></details>
      </section>
      {selectionReady && <section aria-labelledby="featured-title" className="space-y-3"><div className="flex items-center justify-between gap-2"><h2 id="featured-title" className="text-lg font-bold">Featured work</h2><span className="text-sm">{featured.length}/3</span></div><p className="text-sm text-(--text-secondary)">Choose up to three posts or Flicks. Circle posts stay in their Circles; each post keeps its audience settings.</p>
        <fieldset disabled={saving} className="min-w-0 space-y-3">
          {featured.length > 0 && <ol aria-label="Featured order" className="space-y-2">{featured.map((post, index) => <li key={post.id} className="flex items-center gap-2 rounded-xl bg-(--surface-2) p-3 text-sm"><span className="shrink-0 font-bold">{index + 1}</span><span className="min-w-0 flex-1 truncate">{post.content || 'Media post'}</span>{index > 0 && <button type="button" className="btn-ghost" aria-label={`Move featured item ${index + 1} up`} onClick={() => move(index)}>↑</button>}<button type="button" className="btn-ghost" aria-label={`Remove featured item ${index + 1}`} onClick={() => toggle(post)}>Remove</button></li>)}</ol>}
          {!work.length && <p className="rounded-xl bg-(--surface-2) p-4 text-sm">Your work belongs here. <Link href="/#compose" className="font-semibold text-(--nia-violet)">Share your first post →</Link></p>}
          <div className="space-y-2">{work.map(post => { const selected = featured.some(item => item.id === post.id); return <label key={post.id} className="flex cursor-pointer items-start gap-3 rounded-xl border border-(--border) p-3"><input type="checkbox" checked={selected} disabled={!selected && featured.length >= 3} onChange={() => toggle(post)} className="mt-1 accent-(--nia-violet)" /><span className="min-w-0"><span className="text-xs text-(--text-tertiary)">{post.media_type === 'video' ? 'Flick / video' : 'Post'} · {new Date(post.created_at).toLocaleDateString()}</span><span className="mt-1 block line-clamp-2 text-sm wrap-break-word">{post.content || 'Media post'}</span></span></label> })}</div>
          {hasMore && <button type="button" disabled={moreBusy} className="btn-ghost text-sm" onClick={more}>{moreBusy ? 'Loading…' : 'Load more posts'}</button>}
          <button type="button" className="btn-primary w-full" onClick={save}>{saving ? 'Saving…' : 'Save featured work'}</button>
        </fieldset>
        {notice && <p role="status" className="text-sm">{notice}</p>}
      </section>}
    </>}
  </main>
}

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { mediaUrl } from '@/lib/media-url'
import { readCreatorLinks, type CreatorDetails } from '@/lib/creator'

type FeaturedPost = { id: string; content: string | null; media_type: string | null; thumbnail_url: string | null; media_url: string | null }
export default function CreatorProfile({ userId, isOwner }: { userId: string; isOwner: boolean }) {
  const [creator, setCreator] = useState<CreatorDetails | null>(null)
  const [posts, setPosts] = useState<FeaturedPost[]>([])
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const client = createClient()
        const { data, error } = await client.from('creator_profiles').select('*').eq('user_id', userId).maybeSingle()
        if (error) throw error
        if (cancelled) return
        if (!data?.enabled) { setCreator(null); setPosts([]); return }
        setCreator({ ...data, category: data.category ?? '', links: readCreatorLinks(data.links) })
        const { data: featured, error: featuredError } = await client.from('creator_featured_posts').select('slot, posts:post_id(id, content, media_type, thumbnail_url, media_url)').eq('user_id', userId).order('slot')
        if (featuredError) throw featuredError
        if (!cancelled) setPosts(((featured ?? []) as unknown as { posts: FeaturedPost | null }[]).flatMap(row => row.posts ? [row.posts] : []))
      } catch { if (!cancelled) setFailed(true) }
    }
    void load()
    return () => { cancelled = true }
  }, [userId])

  if (!creator && !isOwner) return null
  return <section aria-label="Creator profile" className="mx-4 my-4 rounded-2xl border border-(--border) bg-(--surface-1) p-4">
    {isOwner && <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><span className="text-sm font-semibold">{creator ? 'Your creator profile' : 'Share what you create'}</span><Link href="/creator" className="btn-ghost text-sm">Creator tools →</Link></div>}
    {!creator && isOwner && <p className="text-sm text-(--text-secondary)">{failed ? 'Creator details are temporarily unavailable. Open Creator tools to retry.' : 'Add featured work and useful links with optional Creator Mode.'}</p>}
    {creator && <>
      <div className="flex flex-wrap gap-2 text-xs font-semibold">
        {creator.category && <span className="rounded-full bg-(--surface-2) px-3 py-1">{creator.category}</span>}
        {creator.open_to_collaborations && <span className="rounded-full bg-(--surface-2) px-3 py-1 text-(--nia-violet)">Open to collaborations</span>}
      </div>
      {creator.introduction && <div className="mt-3"><h2 className="text-xs font-semibold text-(--text-tertiary)">What I create</h2><p className="mt-1 whitespace-pre-wrap wrap-break-word text-sm">{creator.introduction}</p></div>}
      {creator.links.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{creator.links.map((link, i) => <a key={i} href={link.url} target="_blank" rel="noopener noreferrer ugc" className="btn-ghost max-w-full truncate text-sm">{link.label} ↗</a>)}</div>}
      {!isOwner && creator.open_to_collaborations && <Link href={`/messages/${userId}`} className="mt-3 inline-block text-sm font-semibold text-(--nia-violet)">Message about collaborating →</Link>}
      {posts.length > 0 && <div className="mt-4"><h2 className="mb-2 text-sm font-semibold">Featured work</h2><div className="flex gap-3 overflow-x-auto pb-1">{posts.map(post => {
        const thumbnail = post.thumbnail_url || (post.media_type === 'image' ? post.media_url : null)
        return <Link key={post.id} href={`/posts/${post.id}`} className="w-44 shrink-0 overflow-hidden rounded-xl border border-(--border) bg-(--surface-0) sm:w-auto sm:flex-1">
          {thumbnail && <img src={mediaUrl(thumbnail)} alt="" loading="lazy" className="aspect-video w-full object-cover" />}
          <div className="p-3"><span className="text-xs text-(--text-tertiary)">{post.media_type === 'video' ? 'Flick / video' : 'Post'}</span><p className="mt-1 line-clamp-3 text-sm font-semibold wrap-break-word">{post.content || 'Take a look →'}</p></div>
        </Link>
      })}</div></div>}
    </>}
  </section>
}

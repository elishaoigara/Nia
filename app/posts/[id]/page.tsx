import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import PostCard from '@/components/PostCard'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: post } = await supabase
    .from('posts')
    .select(`
      *,
      profiles:user_id (id, username, avatar_url, university),
      circles:circle_id (id, name, slug),
      likes (user_id),
      comments (id)
    `)
    .eq('id', id)
    .single()

  if (!post) notFound()

  return (
    <main className="max-w-xl mx-auto px-4 py-6 space-y-4">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-sm font-semibold transition-all active:scale-95"
        style={{ color: 'var(--text-secondary)' }}
      >
        <ArrowLeft size={16} />
        Back to feed
      </Link>

      <PostCard post={post} currentUserId={user.id} />
    </main>
  )
}
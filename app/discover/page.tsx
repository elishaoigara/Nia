import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CircleCard from '@/components/CircleCard'
import Link from 'next/link'
import { TrendingUp, Users, Search, Compass } from 'lucide-react'

export default async function DiscoverPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: trendingCircles } = await supabase
    .from('circles').select('*, circle_members (user_id)').order('created_at', { ascending: false }).limit(6)

  const { data: userProfile } = await supabase.from('profiles').select('university').eq('id', user.id).single()

  const trendingIds = trendingCircles?.map(c => c.id) ?? []
  const suggestedQuery = supabase.from('circles').select('*, circle_members (user_id)').eq('university', userProfile?.university).limit(6)
  if (trendingIds.length > 0) suggestedQuery.not('id', 'in', `(${trendingIds.join(',')})`)
  const { data: suggestedCircles } = await suggestedQuery

  return (
    <main className="max-w-2xl mx-auto px-4 py-6 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'var(--grad-warm)' }}>
          <Compass size={20} className="text-white" />
        </div>
        <div>
          <h1 className="font-extrabold text-2xl">Discover</h1>
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Find your people on campus</p>
        </div>
      </div>

      {/* Quick search shortcut */}
      <Link href="/search" className="flex items-center gap-3 card px-4 py-3 transition-all active:scale-[0.98]">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'var(--surface-2)' }}>
          <Search size={16} style={{ color: 'var(--text-tertiary)' }} />
        </div>
        <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Search people and circles…</span>
      </Link>

      {/* Trending */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={20} style={{ color: 'var(--nia-coral)' }} />
          <h2 className="font-extrabold text-lg">Trending Circles 🔥</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {trendingCircles?.map(circle => <CircleCard key={circle.id} circle={circle} currentUserId={user.id} />)}
        </div>
      </section>

      {/* Suggested */}
      {suggestedCircles && suggestedCircles.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Users size={20} style={{ color: 'var(--nia-violet)' }} />
            <h2 className="font-extrabold text-lg">For {userProfile?.university?.split(' ')[0]} 🎓</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {suggestedCircles.map(circle => <CircleCard key={circle.id} circle={circle} currentUserId={user.id} />)}
          </div>
        </section>
      )}

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/circles" className="card p-5 text-center group transition-all active:scale-[0.97] card-hover">
          <div className="text-3xl mb-2">🌀</div>
          <div className="font-bold">All Circles</div>
          <div className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>Browse everything</div>
        </Link>
        <Link href="/search" className="card p-5 text-center group transition-all active:scale-[0.97] card-hover">
          <div className="text-3xl mb-2">🔍</div>
          <div className="font-bold">Search</div>
          <div className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>Find people & circles</div>
        </Link>
      </div>
    </main>
  )
}

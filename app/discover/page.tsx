import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CircleCard from '@/components/CircleCard'
import Link from 'next/link'
import { TrendingUp, Users, Search, Compass, Globe2, MapPin } from 'lucide-react'
import { AFRICAN_REGIONS, getFlag } from '@/lib/african-data'

export default async function DiscoverPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: myProfile } = await supabase.from('profiles').select('country, city').eq('id', user.id).single()

  // Trending circles (most members)
  const { data: trendingCircles } = await supabase
    .from('circles')
    .select('*, circle_members (user_id)')
    .order('created_at', { ascending: false })
    .limit(6)

  const trendingIds = trendingCircles?.map(c => c.id) ?? []

  // Local circles — same country
  let localCircles: any[] = []
  if (myProfile?.country) {
    const q = supabase
      .from('circles')
      .select('*, circle_members (user_id)')
      .eq('country', myProfile.country)
      .limit(4)
    if (trendingIds.length > 0) q.not('id', 'in', `(${trendingIds.join(',')})`)
    const { data } = await q
    localCircles = data ?? []
  }

  // People from across Africa (recent active users different from current user)
  const { data: africanUsers } = await supabase
    .from('profiles')
    .select('id, username, avatar_url, country, city, bio')
    .neq('id', user.id)
    .not('country', 'is', null)
    .limit(8)

  return (
    <main className="max-w-2xl mx-auto px-4 py-6 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-white" style={{ background: 'var(--grad-warm)' }}>
          <Compass size={20} />
        </div>
        <div>
          <h1 className="font-extrabold text-2xl">Discover</h1>
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Explore Africa's communities 🌍</p>
        </div>
      </div>

      {/* Search shortcut */}
      <Link href="/search" className="flex items-center gap-3 card px-4 py-3 transition-all active:scale-[0.98]">
        <Search size={16} style={{ color: 'var(--text-tertiary)' }} />
        <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Search people and circles…</span>
      </Link>

      {/* Trending Circles */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={18} style={{ color: 'var(--nia-coral)' }} />
          <h2 className="font-extrabold text-lg">Trending Circles 🔥</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {trendingCircles?.map(circle => <CircleCard key={circle.id} circle={circle} currentUserId={user.id} />)}
        </div>
      </section>

      {/* Local circles */}
      {localCircles.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <MapPin size={18} style={{ color: 'var(--nia-violet)' }} />
            <h2 className="font-extrabold text-lg">
              In {getFlag(myProfile?.country ?? '')} {myProfile?.country}
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {localCircles.map(circle => <CircleCard key={circle.id} circle={circle} currentUserId={user.id} />)}
          </div>
        </section>
      )}

      {/* People from across Africa */}
      {africanUsers && africanUsers.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Globe2 size={18} style={{ color: 'var(--nia-sky)' }} />
            <h2 className="font-extrabold text-lg">People across Africa 🌍</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {africanUsers.map((p: any) => (
              <Link key={p.id} href={`/profile/${p.id}`} className="card card-hover p-3 flex flex-col items-center text-center gap-2">
                <div className="avatar-ring">
                  <div className="w-12 h-12 rounded-full overflow-hidden flex items-center justify-center text-white font-bold" style={{ background: 'var(--grad-brand)' }}>
                    {p.avatar_url
                      ? <img src={p.avatar_url} className="w-full h-full object-cover" alt="" />
                      : p.username?.[0]?.toUpperCase()
                    }
                  </div>
                </div>
                <div className="min-w-0 w-full">
                  <p className="font-bold text-xs truncate">@{p.username}</p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                    {getFlag(p.country)} {p.city ?? p.country}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* African regions quick links */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <span className="text-lg">🗺️</span>
          <h2 className="font-extrabold text-lg">Explore by region</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {AFRICAN_REGIONS.map(region => (
            <Link
              key={region.id}
              href={`/search?region=${region.id}`}
              className="card card-hover p-4 flex items-center gap-3 transition-all active:scale-[0.97]"
            >
              <span className="text-2xl">{region.emoji}</span>
              <div>
                <p className="font-bold text-sm">{region.label}</p>
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{region.countries.length} countries</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Quick links */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/circles" className="card card-hover p-5 text-center transition-all active:scale-[0.97]">
          <div className="text-3xl mb-2">🌀</div>
          <div className="font-bold text-sm">All Circles</div>
          <div className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>Browse communities</div>
        </Link>
        <Link href="/marketplace" className="card card-hover p-5 text-center transition-all active:scale-[0.97]">
          <div className="text-3xl mb-2">🛍️</div>
          <div className="font-bold text-sm">Marketplace</div>
          <div className="text-xs mt-0.5" style={{ color: 'var(--text-tertiary)' }}>Buy & sell</div>
        </Link>
      </div>
    </main>
  )
}

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CircleCard from '@/components/CircleCard'
import Link from 'next/link'
import { TrendingUp, Users } from 'lucide-react'

export default async function DiscoverPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Trending circles (most members)
  const { data: trendingCircles } = await supabase
    .from('circles')
    .select(`
      *,
      circle_members (user_id)
    `)
    .order('created_at', { ascending: false })
    .limit(6)

  // Suggested circles (from same university)
  const { data: userProfile } = await supabase
    .from('profiles')
    .select('university')
    .eq('id', user.id)
    .single()

  const trendingIds = trendingCircles?.map((c) => c.id) ?? []

  const suggestedQuery = supabase
    .from('circles')
    .select(`
      *,
      circle_members (user_id)
    `)
    .eq('university', userProfile?.university)
    .limit(6)

  // Exclude circles already shown in trending
  if (trendingIds.length > 0) {
    suggestedQuery.not('id', 'in', `(${trendingIds.join(',')})`)
  }

  const { data: suggestedCircles } = await suggestedQuery

  return (
    <main className="max-w-2xl mx-auto px-4 py-6 space-y-10">
      <div>
        <h1 className="text-3xl font-bold mb-1">Discover</h1>
        <p className="text-zinc-400">Find new circles and communities</p>
      </div>

      {/* Trending Circles */}
      <section>
        <div className="flex items-center gap-3 mb-4">
          <TrendingUp className="text-orange-500" />
          <h2 className="text-xl font-semibold">Trending Circles</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {trendingCircles?.map((circle) => (
            <CircleCard
              key={circle.id}
              circle={circle}
              currentUserId={user.id}
            />
          ))}
        </div>
      </section>

      {/* Suggested for you */}
      {suggestedCircles && suggestedCircles.length > 0 && (
        <section>
          <div className="flex items-center gap-3 mb-4">
            <Users className="text-purple-500" />
            <h2 className="text-xl font-semibold">
              Suggested for {userProfile?.university?.split(' ')[0]}
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {suggestedCircles?.map((circle) => (
              <CircleCard
                key={circle.id}
                circle={circle}
                currentUserId={user.id}
              />
            ))}
          </div>
        </section>
      )}

      {/* Quick Links */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 p-6">
        <h3 className="font-semibold mb-4">More ways to explore</h3>
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/circles"
            className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition text-center"
          >
            <div className="font-medium">All Circles</div>
            <div className="text-sm text-zinc-500">Browse everything</div>
          </Link>
          
          <Link
            href="/search"
            className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition text-center"
          >
            <div className="font-medium">Search</div>
            <div className="text-sm text-zinc-500">Find people & circles</div>
          </Link>
        </div>
      </div>
    </main>
  )
}
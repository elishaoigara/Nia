import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CircleCard from '@/components/CircleCard'
import CreateCircle from '@/components/CreateCircle'

export default async function CirclesPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: circles } = await supabase
    .from('circles')
    .select(`
      *,
      circle_members (user_id)
    `)
    .order('created_at', { ascending: false })

  return (
    <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Circles</h1>
          <p className="text-sm text-zinc-400">Find your community</p>
        </div>
        <CreateCircle userId={user.id} />
      </div>

      {circles && circles.length === 0 && (
        <div className="text-center py-20 text-zinc-400">
          <p className="text-lg font-medium">No circles yet</p>
          <p className="text-sm mt-1">Create the first one for your campus</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {circles?.map(circle => (
          <CircleCard
            key={circle.id}
            circle={circle}
            currentUserId={user.id}
          />
        ))}
      </div>
    </main>
  )
}
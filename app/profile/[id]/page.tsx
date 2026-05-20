import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CircleCard from '@/components/CircleCard'
import CreateCircle from '@/components/CreateCircle'
import { Users } from 'lucide-react'

export default async function CirclesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: circles } = await supabase.from('circles').select('*, circle_members (user_id)').order('created_at', { ascending: false })

  return (
    <main className="w-full max-w-2xl px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center" style={{ background: 'var(--grad-cool)' }}>
            <Users size={20} className="text-white" />
          </div>
          <div>
            <h1 className="font-extrabold text-2xl">Circles</h1>
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>{circles?.length ?? 0} communities</p>
          </div>
        </div>
        <CreateCircle userId={user.id} />
      </div>

      {circles && circles.length === 0 && (
        <div className="card text-center py-20 space-y-3">
          <div className="text-5xl">🌀</div>
          <p className="font-bold text-lg">No circles yet</p>
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Be the first to create one for your campus!</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {circles?.map(circle => <CircleCard key={circle.id} circle={circle} currentUserId={user.id} />)}
      </div>
    </main>
  )
}

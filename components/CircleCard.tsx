'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Users, MapPin } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface CircleCardProps {
  circle: any
  currentUserId: string
}

export default function CircleCard({ circle, currentUserId }: CircleCardProps) {
  const supabase = createClient()
  const router = useRouter()

  const [isMember, setIsMember] = useState(
    circle.circle_members?.some((m: any) => m.user_id === currentUserId) || false
  )
  
  const [memberCount, setMemberCount] = useState<number>(
    circle.circle_members?.length || 0
  )
  
  const [loading, setLoading] = useState(false)

  const handleJoinLeave = async () => {
    if (!currentUserId) return
    setLoading(true)

    if (isMember) {
      // Leave circle
      const { error } = await supabase
        .from('circle_members')
        .delete()
        .eq('circle_id', circle.id)
        .eq('user_id', currentUserId)

      if (!error) {
        setIsMember(false)
        setMemberCount(prev => prev - 1)
      }
    } else {
      // Join circle
      const { error } = await supabase
        .from('circle_members')
        .insert({
          circle_id: circle.id,
          user_id: currentUserId,
          role: 'member'
        })

      if (!error) {
        setIsMember(true)
        setMemberCount(prev => prev + 1)
      }
    }

    setLoading(false)
    router.refresh()
  }

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 p-5 hover:border-purple-200 transition-all group">
      <div className="flex justify-between items-start">
        <Link href={`/circles/${circle.slug}`} className="flex-1">
          <h3 className="font-semibold text-lg group-hover:text-purple-600 transition-colors">
            {circle.name}
          </h3>
        </Link>

        {circle.category && (
          <span className="text-xs px-3 py-1 bg-purple-100 dark:bg-purple-950 text-purple-600 rounded-full font-medium capitalize">
            {circle.category}
          </span>
        )}
      </div>

      {circle.description && (
        <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-2 line-clamp-2">
          {circle.description}
        </p>
      )}

      <div className="flex items-center gap-4 mt-4 text-sm text-zinc-500">
        {circle.university && (
          <div className="flex items-center gap-1">
            <MapPin size={16} />
            <span>{circle.university}</span>
          </div>
        )}

        <div className="flex items-center gap-1">
          <Users size={16} />
          <span>{memberCount} members</span>
        </div>
      </div>

      <div className="mt-5 pt-4 border-t border-zinc-100 dark:border-zinc-800">
        <button
          onClick={handleJoinLeave}
          disabled={loading}
          className={`w-full py-2.5 rounded-xl text-sm font-medium transition-all ${
            isMember
              ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950 dark:hover:text-red-400'
              : 'bg-purple-600 hover:bg-purple-700 text-white'
          }`}
        >
          {loading ? 'Processing...' : isMember ? 'Leave Circle' : 'Join Circle'}
        </button>
      </div>
    </div>
  )
}
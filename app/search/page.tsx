'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Search, Users, User, MapPin, Loader2 } from 'lucide-react'

interface Profile {
  id: string
  username: string
  full_name: string
  avatar_url: string | null
  university: string | null
}

interface Circle {
  id: string
  name: string
  slug: string
  description: string | null
  university: string | null
  category: string | null
  circle_members: { user_id: string }[]
}

export default function SearchPage() {
  const supabase = createClient()
  const [query, setQuery] = useState('')
  const [users, setUsers] = useState<Profile[]>([])
  const [circles, setCircles] = useState<Circle[]>([])
  const [hasSearched, setHasSearched] = useState(false)
  const [isPending, startTransition] = useTransition()

  async function handleSearch(q: string) {
    setQuery(q)
    if (!q.trim()) {
      setUsers([])
      setCircles([])
      setHasSearched(false)
      return
    }

    startTransition(async () => {
      const term = `%${q.trim()}%`

      const [{ data: foundUsers }, { data: foundCircles }] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, username, full_name, avatar_url, university')
          .ilike('username', term)
          .limit(10),

        supabase
          .from('circles')
          .select('id, name, slug, description, university, category, circle_members(user_id)')
          .ilike('name', term)
          .limit(10),
      ])

      setUsers(foundUsers ?? [])
      setCircles(foundCircles ?? [])
      setHasSearched(true)
    })
  }

  const totalResults = users.length + circles.length

  return (
    <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-1">Search</h1>
        <p className="text-zinc-400">Find people and circles on Nia</p>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search
          size={18}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400"
        />
        <input
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search users or circles…"
          className="w-full pl-11 pr-4 py-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 transition-shadow"
          autoFocus
        />
        {isPending && (
          <Loader2
            size={16}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-400 animate-spin"
          />
        )}
      </div>

      {/* Results */}
      {hasSearched && !isPending && (
        <>
          {totalResults === 0 ? (
            <div className="text-center py-16 text-zinc-400">
              <Search size={40} className="mx-auto mb-3 opacity-30" />
              <p className="font-medium">No results for "{query}"</p>
              <p className="text-sm mt-1">Try a different search term</p>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Users */}
              {users.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <User size={16} className="text-purple-500" />
                    <h2 className="font-semibold text-sm uppercase tracking-wide text-zinc-500">
                      People
                    </h2>
                    <span className="text-xs text-zinc-400">({users.length})</span>
                  </div>

                  <div className="space-y-2">
                    {users.map((profile) => (
                      <Link
                        key={profile.id}
                        href={`/profile/${profile.id}`}
                        className="flex items-center gap-3 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 p-4 hover:border-purple-200 dark:hover:border-purple-800 transition-all group"
                      >
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0 overflow-hidden">
                          {profile.avatar_url ? (
                            <img
                              src={profile.avatar_url}
                              alt={profile.username}
                              className="w-10 h-10 object-cover"
                            />
                          ) : (
                            profile.username?.[0]?.toUpperCase() ?? '?'
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-sm group-hover:text-purple-600 transition-colors">
                            {profile.full_name}
                          </p>
                          <p className="text-xs text-zinc-400">@{profile.username}</p>
                        </div>
                        {profile.university && (
                          <div className="flex items-center gap-1 text-xs text-zinc-400 flex-shrink-0">
                            <MapPin size={12} />
                            <span className="hidden sm:block">{profile.university}</span>
                          </div>
                        )}
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              {/* Circles */}
              {circles.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 mb-3">
                    <Users size={16} className="text-orange-500" />
                    <h2 className="font-semibold text-sm uppercase tracking-wide text-zinc-500">
                      Circles
                    </h2>
                    <span className="text-xs text-zinc-400">({circles.length})</span>
                  </div>

                  <div className="space-y-2">
                    {circles.map((circle) => (
                      <Link
                        key={circle.id}
                        href={`/circles/${circle.slug}`}
                        className="flex items-center gap-3 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 p-4 hover:border-orange-200 dark:hover:border-orange-900 transition-all group"
                      >
                        <div className="w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-950 flex items-center justify-center flex-shrink-0">
                          <Users size={18} className="text-orange-500" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-sm group-hover:text-orange-500 transition-colors">
                            {circle.name}
                          </p>
                          {circle.description && (
                            <p className="text-xs text-zinc-400 truncate">{circle.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-zinc-400 flex-shrink-0">
                          <Users size={12} />
                          <span>{circle.circle_members?.length ?? 0}</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )}
        </>
      )}

      {/* Empty state — not yet searched */}
      {!hasSearched && !isPending && (
        <div className="text-center py-16 text-zinc-400">
          <Search size={40} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm">Start typing to search</p>
        </div>
      )}
    </main>
  )
}

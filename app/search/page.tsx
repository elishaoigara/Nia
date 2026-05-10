'use client'
import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Search, Users, User, MapPin, Loader2 } from 'lucide-react'

export default function SearchPage() {
  const supabase = createClient()
  const [query, setQuery] = useState('')
  const [users, setUsers] = useState<any[]>([])
  const [circles, setCircles] = useState<any[]>([])
  const [hasSearched, setHasSearched] = useState(false)
  const [isPending, startTransition] = useTransition()

  async function handleSearch(q: string) {
    setQuery(q)
    if (!q.trim()) { setUsers([]); setCircles([]); setHasSearched(false); return }
    startTransition(async () => {
      const term = `%${q.trim()}%`
      const [{ data: foundUsers }, { data: foundCircles }] = await Promise.all([
        supabase.from('profiles').select('id, username, full_name, avatar_url, university').ilike('username', term).limit(10),
        supabase.from('circles').select('id, name, slug, description, university, category, circle_members(user_id)').ilike('name', term).limit(10),
      ])
      setUsers(foundUsers ?? []); setCircles(foundCircles ?? []); setHasSearched(true)
    })
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <div>
        <h1 className="font-extrabold text-2xl mb-1">Search 🔍</h1>
        <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Find people and circles on Nia</p>
      </div>

      {/* Search input */}
      <div className="relative">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-tertiary)' }} />
        <input
          value={query}
          onChange={e => handleSearch(e.target.value)}
          placeholder="Search users or circles…"
          className="input pl-11 pr-10"
          autoFocus
        />
        {isPending && <Loader2 size={16} className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin" style={{ color: 'var(--text-tertiary)' }} />}
      </div>

      {hasSearched && !isPending && (
        <>
          {users.length === 0 && circles.length === 0 ? (
            <div className="card text-center py-16 space-y-2">
              <div className="text-4xl">🤔</div>
              <p className="font-bold">No results for "{query}"</p>
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Try a different search term</p>
            </div>
          ) : (
            <div className="space-y-6">
              {users.length > 0 && (
                <section className="space-y-3">
                  <div className="flex items-center gap-2">
                    <User size={16} style={{ color: 'var(--nia-violet)' }} />
                    <h2 className="font-extrabold text-sm uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>People ({users.length})</h2>
                  </div>
                  {users.map(u => (
                    <Link key={u.id} href={`/profile/${u.id}`} className="card card-hover flex items-center gap-3 p-4">
                      <div className="avatar-ring flex-shrink-0">
                        <div className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center text-white font-bold text-sm" style={{ background: 'var(--grad-brand)' }}>
                          {u.avatar_url ? <img src={u.avatar_url} className="w-full h-full object-cover" alt="" /> : u.username?.[0]?.toUpperCase()}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm">{u.full_name}</p>
                        <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>@{u.username}</p>
                      </div>
                      {u.university && (
                        <div className="flex items-center gap-1 text-xs flex-shrink-0" style={{ color: 'var(--text-tertiary)' }}>
                          <MapPin size={12} />
                          <span className="hidden sm:block">{u.university.split(' ').slice(0,2).join(' ')}</span>
                        </div>
                      )}
                    </Link>
                  ))}
                </section>
              )}

              {circles.length > 0 && (
                <section className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Users size={16} style={{ color: 'var(--nia-coral)' }} />
                    <h2 className="font-extrabold text-sm uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Circles ({circles.length})</h2>
                  </div>
                  {circles.map(c => (
                    <Link key={c.id} href={`/circles/${c.slug}`} className="card card-hover flex items-center gap-3 p-4">
                      <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl flex-shrink-0" style={{ background: 'rgba(255,107,107,0.1)' }}>🌀</div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm">{c.name}</p>
                        {c.description && <p className="text-xs truncate" style={{ color: 'var(--text-tertiary)' }}>{c.description}</p>}
                      </div>
                      <div className="flex items-center gap-1 text-xs flex-shrink-0" style={{ color: 'var(--text-tertiary)' }}>
                        <Users size={12} />
                        <span>{c.circle_members?.length ?? 0}</span>
                      </div>
                    </Link>
                  ))}
                </section>
              )}
            </div>
          )}
        </>
      )}

      {!hasSearched && !isPending && (
        <div className="text-center py-16 space-y-2">
          <div className="text-5xl">✨</div>
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Start typing to search</p>
        </div>
      )}
    </main>
  )
}

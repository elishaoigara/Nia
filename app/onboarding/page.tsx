'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

const KENYAN_UNIVERSITIES = [
  'University of Nairobi',
  'Kenyatta University',
  'JKUAT',
  'Strathmore University',
  'Moi University',
  'Maseno University',
  'Egerton University',
  'Daystar University',
  'USIU-Africa',
  'Mount Kenya University',
  'KCA University',
  'Multimedia University',
  'Other'
]

export default function OnboardingPage() {
  const supabase = createClient()
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [fullName, setFullName] = useState('')
  const [university, setUniversity] = useState('')
  const [bio, setBio] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleComplete() {
    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username.toLowerCase())
      .single()

    if (existing) {
      setError('Username already taken. Try another.')
      setLoading(false)
      return
    }

    const { error } = await supabase.from('profiles').insert({
      id: user.id,
      username: username.toLowerCase().replace(/\s+/g, ''),
      full_name: fullName,
      university,
      bio,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      router.push('/')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 dark:bg-zinc-950 px-4 py-12">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-bold">Set up your profile</h1>
          <p className="text-sm text-zinc-500">This is how your campus sees you</p>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 p-6 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Full name</label>
            <input
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="Amara Osei"
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Username</label>
            <div className="flex items-center border border-zinc-200 dark:border-zinc-700 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-purple-500">
              <span className="px-3 text-zinc-400 text-sm">@</span>
              <input
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="amara"
                className="flex-1 py-2 pr-3 bg-transparent text-sm focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">University</label>
            <select
              value={university}
              onChange={e => setUniversity(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Select your university</option>
              {KENYAN_UNIVERSITIES.map(u => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              Bio <span className="text-zinc-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={bio}
              onChange={e => setBio(e.target.value)}
              placeholder="CS student. Builder. Nairobi."
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            onClick={handleComplete}
            disabled={!username || !fullName || !university || loading}
            className="w-full py-2.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium transition-colors disabled:opacity-40"
          >
            {loading ? 'Setting up…' : 'Enter Nia →'}
          </button>
        </div>
      </div>
    </div>
  )
}
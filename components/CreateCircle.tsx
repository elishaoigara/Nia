'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, X } from 'lucide-react'
import { useRouter } from 'next/navigation'

const CATEGORIES = ['tech', 'arts', 'business', 'sports', 'general']

const KENYAN_UNIVERSITIES = [
  'University of Nairobi', 'Kenyatta University', 'JKUAT',
  'Strathmore University', 'Moi University', 'Maseno University',
  'Egerton University', 'Daystar University', 'USIU-Africa',
  'Mount Kenya University', 'KCA University', 'Multimedia University',
  'Other'
]

export default function CreateCircle({ userId }: { userId: string }) {
  const supabase = createClient()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [university, setUniversity] = useState('')
  const [category, setCategory] = useState('general')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleCreate() {
    if (!name.trim()) return
    setLoading(true)
    setError('')

    const slug = name.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      + '-' + Date.now()

    const { error } = await supabase.from('circles').insert({
      name: name.trim(),
      slug,
      description: description.trim() || null,
      university: university || null,
      category,
      created_by: userId,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    // Auto-join the circle
    const { data: circle } = await supabase
      .from('circles')
      .select('id')
      .eq('slug', slug)
      .single()

    if (circle) {
      await supabase.from('circle_members').insert({
        circle_id: circle.id,
        user_id: userId,
        role: 'admin'
      })
    }

    setName('')
    setDescription('')
    setUniversity('')
    setCategory('general')
    setOpen(false)
    setLoading(false)
    router.refresh()
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
      >
        <Plus size={15} />
        New circle
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 p-6 w-full max-w-md space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-lg">Create a circle</h2>
          <button onClick={() => setOpen(false)} className="text-zinc-400 hover:text-zinc-600">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-sm font-medium">Circle name</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="JKUAT Tech Club"
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="What is this circle about?"
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">University</label>
            <select
              value={university}
              onChange={e => setUniversity(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">All universities</option>
              {KENYAN_UNIVERSITIES.map(u => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Category</label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium capitalize transition-colors ${
                    category === cat
                      ? 'bg-purple-600 text-white'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button
          onClick={handleCreate}
          disabled={!name.trim() || loading}
          className="w-full py-2.5 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white text-sm font-medium transition-colors"
        >
          {loading ? 'Creating…' : 'Create circle'}
        </button>
      </div>
    </div>
  )
}
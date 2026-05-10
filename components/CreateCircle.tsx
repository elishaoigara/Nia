'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createPortal } from 'react-dom'

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
  const [mounted, setMounted] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [university, setUniversity] = useState('')
  const [category, setCategory] = useState('general')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { setMounted(true) }, [])

  async function handleCreate() {
    if (!name.trim()) return
    setLoading(true)
    setError('')

    const slug = name.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      + '-' + Date.now()

    const { data: circle, error: insertError } = await supabase
      .from('circles')
      .insert({
        name: name.trim(),
        slug,
        description: description.trim() || null,
        university: university || null,
        category,
        created_by: userId,
      })
      .select()
      .single()

    if (insertError) {
      setError(insertError.message)
      setLoading(false)
      return
    }

    await supabase.from('circle_members').insert({
      circle_id: circle.id,
      user_id: userId,
      role: 'admin'
    })

    setName('')
    setDescription('')
    setUniversity('')
    setCategory('general')
    setOpen(false)
    setLoading(false)
    router.refresh()
  }

  const modal = (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) setOpen(false) }}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        zIndex: 9999, display: 'flex', alignItems: 'center',
        justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.45)'
      }}
    >
      <div style={{ width: '320px' }} className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl p-5 space-y-3">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-sm">New Circle</h2>
          <button onClick={() => setOpen(false)} className="text-zinc-400 hover:text-zinc-600">
            <X size={16} />
          </button>
        </div>

        {/* Name */}
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Circle name"
          className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
        />

        {/* Description */}
        <textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="What is this circle about?"
          rows={2}
          className="w-full px-3 py-2 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-transparent text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
        />

        {/* University */}
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

        {/* Category */}
        <div className="flex flex-wrap gap-1.5">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`text-xs px-2.5 py-1 rounded-lg font-medium capitalize transition-colors ${
                category === cat
                  ? 'bg-purple-600 text-white'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:bg-zinc-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}

        {/* Submit */}
        <button
          onClick={handleCreate}
          disabled={!name.trim() || loading}
          className="w-full py-2 rounded-lg bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white text-sm font-medium transition-colors"
        >
          {loading ? 'Creating…' : 'Create circle'}
        </button>
      </div>
    </div>
  )

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
      >
        <Plus size={15} />
        New circle
      </button>

      {mounted && open && createPortal(modal, document.body)}
    </>
  )
}
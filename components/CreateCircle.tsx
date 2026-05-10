'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, X, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

const CATEGORIES = ['Tech','Art','Sports','Music','Science','Culture','Business','Health','Course','Other']

export default function CreateCircle({ userId }: { userId: string }) {
  const supabase = createClient()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [courseCode, setCourseCode] = useState('')
  const [allowAnonymous, setAllowAnonymous] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleCreate() {
    if (!name.trim()) return
    setLoading(true); setError('')
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now().toString(36)
    const { error: e } = await supabase.from('circles').insert({
      name: name.trim(), slug,
      description: description.trim() || null,
      category: category || null,
      course_code: courseCode.trim() || null,
      is_anonymous_allowed: allowAnonymous,
      created_by: userId,
    })
    if (e) { setError(e.message); setLoading(false); return }
    setOpen(false); setName(''); setDescription(''); setCategory(''); setCourseCode(''); setAllowAnonymous(false); setLoading(false)
    router.refresh()
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-primary flex items-center gap-2" style={{ borderRadius: '14px', padding: '10px 16px', fontSize: '14px' }}>
        <Plus size={16} strokeWidth={2.5} /> New Circle
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}>
          <div className="w-full max-w-sm rounded-t-[28px] sm:rounded-[28px] p-6 space-y-4 anim-up max-h-[90vh] overflow-y-auto" style={{ background: 'var(--surface-0)', boxShadow: 'var(--shadow-lg)' }}>
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-lg">Create a circle 🌀</h3>
              <button onClick={() => setOpen(false)} className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}><X size={16} /></button>
            </div>

            <input value={name} onChange={e => setName(e.target.value)} placeholder="Circle name" className="input" />
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="What's this circle about?" rows={2} className="input resize-none" />

            {/* Course code — shows when category is Course */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Category</label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map(c => (
                  <button key={c} onClick={() => setCategory(c === category ? '' : c)} className="px-3 py-1.5 rounded-xl text-sm font-semibold transition-all active:scale-90"
                    style={category === c ? { background: 'var(--grad-brand)', color: '#fff' } : { background: 'var(--surface-2)', color: 'var(--text-secondary)' }}>
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {category === 'Course' && (
              <div className="space-y-1">
                <label className="text-xs font-bold" style={{ color: 'var(--text-tertiary)' }}>Course code (optional)</label>
                <input value={courseCode} onChange={e => setCourseCode(e.target.value)} placeholder="e.g. CS101, BBA202" className="input" />
              </div>
            )}

            {/* Anonymous toggle */}
            <button
              onClick={() => setAllowAnonymous(!allowAnonymous)}
              className="flex items-center justify-between w-full px-4 py-3 rounded-2xl transition-all"
              style={{ background: allowAnonymous ? 'linear-gradient(135deg,rgba(168,85,247,0.1),rgba(78,205,196,0.1))' : 'var(--surface-2)' }}
            >
              <div className="text-left">
                <p className="text-sm font-bold">🎭 Allow anonymous posts</p>
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Members can post without showing their name</p>
              </div>
              <div className="w-10 h-6 rounded-full transition-all flex items-center px-1" style={{ background: allowAnonymous ? 'var(--nia-violet)' : 'var(--surface-3)' }}>
                <div className="w-4 h-4 rounded-full bg-white transition-all" style={{ transform: allowAnonymous ? 'translateX(16px)' : 'translateX(0)' }} />
              </div>
            </button>

            {error && <p className="text-sm text-red-500">{error}</p>}
            <button onClick={handleCreate} disabled={!name.trim() || loading} className="btn-primary w-full flex items-center justify-center gap-2">
              {loading ? <Loader2 size={16} className="animate-spin" /> : null}
              {loading ? 'Creating…' : 'Create Circle 🚀'}
            </button>
          </div>
        </div>
      )}
    </>
  )
}

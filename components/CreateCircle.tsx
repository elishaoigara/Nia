'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, X, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

const CATEGORIES = ['Tech','Art','Sports','Music','Science','Culture','Business','Health','Other']

export default function CreateCircle({ userId }: { userId: string }) {
  const supabase = createClient()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleCreate() {
    if (!name.trim()) return
    setLoading(true); setError('')
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '-' + Date.now().toString(36)
    const { error: e } = await supabase.from('circles').insert({ name: name.trim(), slug, description: description.trim() || null, category: category || null, created_by: userId })
    if (e) { setError(e.message); setLoading(false); return }
    setOpen(false); setName(''); setDescription(''); setCategory(''); setLoading(false)
    router.refresh()
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-primary flex items-center gap-2" style={{ borderRadius: '14px', padding: '10px 16px', fontSize: '14px' }}>
        <Plus size={16} strokeWidth={2.5} /> New Circle
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}>
          <div className="w-full max-w-sm rounded-t-[28px] sm:rounded-[28px] p-6 space-y-5 anim-up" style={{ background: 'var(--surface-0)', boxShadow: 'var(--shadow-lg)' }}>
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-lg">Create a circle 🌀</h3>
              <button onClick={() => setOpen(false)} className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}><X size={16} /></button>
            </div>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Circle name" className="input" />
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="What's this circle about?" rows={3} className="input resize-none" />
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map(c => (
                <button key={c} onClick={() => setCategory(c === category ? '' : c)} className="px-3 py-1.5 rounded-xl text-sm font-semibold transition-all active:scale-90" style={category === c ? { background: 'var(--grad-brand)', color: '#fff' } : { background: 'var(--surface-2)', color: 'var(--text-secondary)' }}>
                  {c}
                </button>
              ))}
            </div>
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

'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { ShoppingBag, Plus, X, Loader2, Tag, MapPin, MessageSquare, BookOpen, Ticket, Laptop, Shirt, Package } from 'lucide-react'
import { useRouter } from 'next/navigation'

const CATEGORIES = [
  { id: 'all', label: 'All', icon: '🛍️' },
  { id: 'textbooks', label: 'Textbooks', icon: '📚' },
  { id: 'electronics', label: 'Electronics', icon: '💻' },
  { id: 'clothing', label: 'Clothing', icon: '👕' },
  { id: 'tickets', label: 'Tickets', icon: '🎟️' },
  { id: 'services', label: 'Services', icon: '🛠️' },
  { id: 'other', label: 'Other', icon: '📦' },
]

const CATEGORY_EMOJI: Record<string, string> = {
  textbooks: '📚', electronics: '💻', clothing: '👕', tickets: '🎟️', services: '🛠️', other: '📦'
}

function timeAgo(date: string) {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

export default function MarketplaceClient({ listings, currentUserId }: { listings: any[]; currentUserId: string }) {
  const supabase = createClient()
  const router = useRouter()
  const [activeCategory, setActiveCategory] = useState('all')
  const [showCreate, setShowCreate] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [price, setPrice] = useState('')
  const [category, setCategory] = useState('other')
  const [condition, setCondition] = useState('good')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [posting, setPosting] = useState(false)
  const [error, setError] = useState('')

  const filtered = activeCategory === 'all' ? listings : listings.filter(l => l.category === activeCategory)

  async function createListing() {
    if (!title.trim() || !price) { setError('Title and price are required'); return }
    setPosting(true); setError('')
    let image_url = null
    if (imageFile) {
      const path = `marketplace/${currentUserId}/${Date.now()}.${imageFile.name.split('.').pop()}`
      const { error: e } = await supabase.storage.from('post-media').upload(path, imageFile)
      if (!e) {
        const { data } = supabase.storage.from('post-media').getPublicUrl(path)
        image_url = data.publicUrl
      }
    }
    const { error: e } = await supabase.from('marketplace_listings').insert({
      user_id: currentUserId, title: title.trim(), description: description.trim() || null,
      price: parseFloat(price), category, condition, image_url, status: 'active'
    })
    if (e) { setError(e.message); setPosting(false); return }
    setShowCreate(false); setTitle(''); setDescription(''); setPrice(''); setCategory('other')
    setCondition('good'); setImageFile(null); setImagePreview(null); setPosting(false)
    router.refresh()
  }

  return (
    <main className="max-w-2xl mx-auto px-4 py-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-xl" style={{ background: 'linear-gradient(135deg,rgba(255,217,61,0.2),rgba(255,142,83,0.2))' }}>🛍️</div>
          <div>
            <h1 className="font-extrabold text-2xl">Marketplace</h1>
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Buy & sell on campus</p>
          </div>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2 text-sm px-4 py-2.5" style={{ borderRadius: '14px' }}>
          <Plus size={16} /> Sell
        </button>
      </div>

      {/* Category filter */}
      <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold flex-shrink-0 transition-all active:scale-95"
            style={activeCategory === cat.id ? { background: 'var(--grad-brand)', color: '#fff' } : { background: 'var(--surface-2)', color: 'var(--text-secondary)' }}
          >
            <span>{cat.icon}</span> {cat.label}
          </button>
        ))}
      </div>

      {/* Listings grid */}
      {filtered.length === 0 ? (
        <div className="card text-center py-16 space-y-2">
          <div className="text-4xl">🛒</div>
          <p className="font-bold">Nothing listed yet</p>
          <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Be the first to sell something!</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {filtered.map(item => (
            <div key={item.id} className="card card-hover overflow-hidden">
              {/* Image */}
              <div className="w-full h-36 flex items-center justify-center text-4xl" style={{ background: item.image_url ? undefined : 'var(--surface-2)' }}>
                {item.image_url
                  ? <img src={item.image_url} className="w-full h-36 object-cover" alt={item.title} />
                  : CATEGORY_EMOJI[item.category] ?? '📦'
                }
              </div>

              <div className="p-3 space-y-1.5">
                <p className="font-bold text-sm leading-tight line-clamp-2">{item.title}</p>
                <p className="font-extrabold text-base" style={{ color: 'var(--nia-mint)' }}>KES {Number(item.price).toLocaleString()}</p>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold capitalize" style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}>
                    {item.condition}
                  </span>
                  <span className="text-[10px]" style={{ color: 'var(--text-tertiary)' }}>{timeAgo(item.created_at)}</span>
                </div>
                <div className="flex items-center gap-1.5 pt-1">
                  <div className="w-5 h-5 rounded-full overflow-hidden flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0" style={{ background: 'var(--grad-brand)' }}>
                    {item.profiles?.avatar_url ? <img src={item.profiles.avatar_url} className="w-full h-full object-cover" alt="" /> : item.profiles?.username?.[0]?.toUpperCase()}
                  </div>
                  <span className="text-[11px] font-semibold truncate" style={{ color: 'var(--text-secondary)' }}>@{item.profiles?.username}</span>
                </div>
                {item.user_id !== currentUserId && (
                  <Link
                    href={`/messages/${item.user_id}`}
                    className="flex items-center justify-center gap-1.5 w-full py-2 rounded-xl text-xs font-bold transition-all active:scale-95"
                    style={{ background: 'linear-gradient(135deg,rgba(107,203,119,0.15),rgba(78,205,196,0.15))', color: 'var(--nia-mint)' }}
                  >
                    <MessageSquare size={13} /> Message seller
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create listing modal */}
      {showCreate && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }} onClick={e => { if (e.target === e.currentTarget) setShowCreate(false) }}>
          <div className="w-full max-w-sm rounded-t-[28px] sm:rounded-[28px] p-6 space-y-4 anim-up max-h-[90vh] overflow-y-auto" style={{ background: 'var(--surface-0)' }}>
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-lg">List an item 🏷️</h3>
              <button onClick={() => setShowCreate(false)} className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}><X size={16} /></button>
            </div>

            {/* Image upload */}
            <div
              onClick={() => document.getElementById('listing-img')?.click()}
              className="w-full h-32 rounded-2xl flex items-center justify-center cursor-pointer transition-all"
              style={{ border: '2px dashed var(--border)', background: imagePreview ? undefined : 'var(--surface-2)', overflow: 'hidden' }}
            >
              {imagePreview ? <img src={imagePreview} className="w-full h-full object-cover" alt="" /> : <div className="text-center"><div className="text-3xl mb-1">📷</div><p className="text-xs font-semibold" style={{ color: 'var(--text-tertiary)' }}>Add photo (optional)</p></div>}
            </div>
            <input id="listing-img" type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) { setImageFile(f); setImagePreview(URL.createObjectURL(f)) } }} />

            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="What are you selling?" className="input" />
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Description (optional)" rows={2} className="input resize-none" />

            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-xs font-bold mb-1 block" style={{ color: 'var(--text-tertiary)' }}>Price (KES)</label>
                <input type="number" value={price} onChange={e => setPrice(e.target.value)} placeholder="500" className="input" />
              </div>
              <div className="flex-1">
                <label className="text-xs font-bold mb-1 block" style={{ color: 'var(--text-tertiary)' }}>Condition</label>
                <select value={condition} onChange={e => setCondition(e.target.value)} className="input">
                  <option value="new">New</option>
                  <option value="like_new">Like new</option>
                  <option value="good">Good</option>
                  <option value="fair">Fair</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {CATEGORIES.filter(c => c.id !== 'all').map(cat => (
                <button key={cat.id} onClick={() => setCategory(cat.id)} className="px-3 py-1.5 rounded-xl text-sm font-semibold transition-all" style={category === cat.id ? { background: 'var(--grad-brand)', color: '#fff' } : { background: 'var(--surface-2)', color: 'var(--text-secondary)' }}>
                  {cat.icon} {cat.label}
                </button>
              ))}
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <button onClick={createListing} disabled={posting || !title.trim() || !price} className="btn-primary w-full flex items-center justify-center gap-2">
              {posting ? <Loader2 size={16} className="animate-spin" /> : null}
              {posting ? 'Listing…' : 'List item 🚀'}
            </button>
          </div>
        </div>
      )}
    </main>
  )
}

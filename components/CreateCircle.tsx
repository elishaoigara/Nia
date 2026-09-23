'use client'

import { INTERESTS, normalizeInterest } from '@/lib/interests'
import { AFRICAN_COUNTRIES } from '@/lib/african-data'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Plus, X, Lock, Globe, Loader2 } from 'lucide-react'

const CATEGORIES = INTERESTS.map(label => ({ key: normalizeInterest(label), label, emoji: '', color: 'var(--nia-violet)' }))

const MAX_NAME = 40
const MAX_DESC = 160

function slugify(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-+|-+$)/g, '')
    .slice(0, 40)
}

export default function CreateCircle({ userId, compact = false }: { userId: string; compact?: boolean }) {
  const supabase = createClient()
  const router = useRouter()

  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [country, setCountry] = useState('')
  const [university, setUniversity] = useState('')
  const [category, setCategory] = useState<string | null>(null)
  const [isPrivate, setIsPrivate] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function reset() {
    setName(''); setDescription(''); setUniversity('')
    setCategory(null); setIsPrivate(false); setError(null)
  }

  async function handleCreate() {
    const trimmedName = name.trim()
    if (!trimmedName) { setError('Give your circle a name'); return }
    setSubmitting(true)
    setError(null)

    const baseSlug = slugify(trimmedName) || `circle-${Date.now()}`
    // Slugs need to be unique — if the base slug's taken, fall back to a
    // short random suffix rather than blocking the person on picking a
    // different name themselves.
    const { data: clash } = await supabase.from('circles').select('id').eq('slug', baseSlug).maybeSingle()
    const slug = clash ? `${baseSlug}-${Math.random().toString(36).slice(2, 6)}` : baseSlug

    const { data: circle, error: insertError } = await supabase
      .from('circles')
      .insert({
        name: trimmedName,
        slug,
        description: description.trim() || null,
        university: university.trim() || null,
        country: country || null,
        category,
        is_private: isPrivate,
      })
      .select()
      .single()

    if (insertError || !circle) {
      setError("Couldn't create the circle — try again")
      setSubmitting(false)
      return
    }

    // Creating a circle makes you its first member — otherwise you'd land on
    // your own circle's page unable to post in it.
    await supabase.from('circle_members').insert({ circle_id: circle.id, user_id: userId })

    setSubmitting(false)
    setOpen(false)
    reset()
    router.push(`/circles/${slug}`)
    router.refresh()
  }

  return (
    <>
      {compact ? (
        <button
          onClick={() => setOpen(true)}
          className="tap-sm new-circle-pulse"
          style={{
            display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0,
            background: 'var(--surface-1)', border: '1px dashed var(--border)',
            borderRadius: 20, padding: '6px 12px 6px 6px', cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          <span style={{
            width: 24, height: 24, borderRadius: '50%', background: 'var(--grad-brand)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Plus size={13} color="#fff" />
          </span>
          <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
            New Circle
          </span>
        </button>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="tap-sm"
          style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '10px 16px', borderRadius: 14,
            border: 'none', background: 'var(--grad-brand)', color: '#fff', fontWeight: 700, fontSize: 13.5,
            cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
          }}
        >
          <Plus size={16} /> New Circle
        </button>
      )}

      {open && (
        <div
          onClick={() => { if (!submitting) { setOpen(false); reset() } }}
          style={{ position: 'fixed', inset: 0, zIndex: 70, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 480, maxHeight: '88vh', overflowY: 'auto',
              background: 'var(--surface-1)', borderRadius: '20px 20px 0 0',
              padding: '18px 18px calc(20px + env(safe-area-inset-bottom, 0px))',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <p style={{ fontWeight: 800, fontSize: 17, margin: 0 }}>New Circle</p>
              <button
                onClick={() => { setOpen(false); reset() }}
                disabled={submitting}
                className="tap-sm"
                style={{ width: 30, height: 30, borderRadius: 8, border: 'none', background: 'var(--surface-3)', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <X size={14} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-tertiary)', display: 'block', marginBottom: 6 }}>
                  Name
                </label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value.slice(0, MAX_NAME))}
                  placeholder="e.g. Nairobi Hoopers"
                  autoFocus
                  style={{
                    width: '100%', padding: '11px 14px', borderRadius: 12, border: '1px solid var(--border)',
                    background: 'var(--surface-0)', color: 'var(--text-primary)', fontSize: 14.5, fontFamily: 'inherit',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-tertiary)', display: 'block', marginBottom: 6 }}>
                  Description <span style={{ fontWeight: 400 }}>(optional)</span>
                </label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value.slice(0, MAX_DESC))}
                  placeholder="What's this circle about?"
                  rows={2}
                  style={{
                    width: '100%', padding: '11px 14px', borderRadius: 12, border: '1px solid var(--border)',
                    background: 'var(--surface-0)', color: 'var(--text-primary)', fontSize: 14, fontFamily: 'inherit',
                    resize: 'none',
                  }}
                />
                <p style={{ fontSize: 10.5, color: 'var(--text-tertiary)', textAlign: 'right', margin: '3px 2px 0' }}>
                  {description.length}/{MAX_DESC}
                </p>
              </div>

              <label className="block">Country (optional)<select className="input" value={country} onChange={e=>setCountry(e.target.value)}><option value="">Across Africa</option>{AFRICAN_COUNTRIES.map(c=><option key={c}>{c}</option>)}</select></label>
              <div>
                <label style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-tertiary)', display: 'block', marginBottom: 6 }}>
                  Category <span style={{ fontWeight: 400 }}>(optional)</span>
                </label>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {CATEGORIES.map(c => {
                    const active = category === c.key
                    return (
                      <button
                        key={c.key}
                        onClick={() => setCategory(active ? null : c.key)}
                        className="tap-sm"
                        style={{
                          display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 20,
                          border: '1px solid ' + (active ? c.color : 'var(--border)'),
                          background: active ? c.color : 'var(--surface-0)',
                          color: active ? '#fff' : 'var(--text-secondary)',
                          fontSize: 12.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                        }}
                      >
                        <span>{c.emoji}</span> {c.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <label style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text-tertiary)', display: 'block', marginBottom: 6 }}>
                  Campus / community <span style={{ fontWeight: 400 }}>(optional)</span>
                </label>
                <input
                  value={university}
                  onChange={e => setUniversity(e.target.value.slice(0, 60))}
                  placeholder="e.g. University of Nairobi"
                  style={{
                    width: '100%', padding: '11px 14px', borderRadius: 12, border: '1px solid var(--border)',
                    background: 'var(--surface-0)', color: 'var(--text-primary)', fontSize: 14, fontFamily: 'inherit',
                  }}
                />
              </div>

              <button
                onClick={() => setIsPrivate(v => !v)}
                className="tap-sm"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%',
                  padding: '12px 14px', borderRadius: 12, border: '1px solid var(--border)',
                  background: 'var(--surface-0)', cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, fontWeight: 700, color: 'var(--text-primary)' }}>
                  {isPrivate ? <Lock size={15} /> : <Globe size={15} />}
                  {isPrivate ? 'Private — people must request to join' : 'Public — anyone can join'}
                </span>
                <span
                  style={{
                    width: 38, height: 22, borderRadius: 11, flexShrink: 0, position: 'relative',
                    background: isPrivate ? 'var(--nia-violet)' : 'var(--surface-3)', transition: 'background 0.15s',
                  }}
                >
                  <span
                    style={{
                      position: 'absolute', top: 2, left: isPrivate ? 18 : 2, width: 18, height: 18, borderRadius: '50%',
                      background: '#fff', transition: 'left 0.15s', boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
                    }}
                  />
                </span>
              </button>

              {error && <p style={{ fontSize: 12.5, color: 'var(--nia-coral)', margin: 0, fontWeight: 600 }}>{error}</p>}

              <button
                onClick={handleCreate}
                disabled={submitting || !name.trim()}
                className="tap-sm"
                style={{
                  width: '100%', padding: '13px', borderRadius: 14, border: 'none', marginTop: 4,
                  background: 'var(--grad-brand)', color: 'white', fontWeight: 700, fontSize: 14.5,
                  cursor: 'pointer', opacity: submitting || !name.trim() ? 0.5 : 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}
              >
                {submitting && <Loader2 size={15} className="animate-spin" />}
                Create circle
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
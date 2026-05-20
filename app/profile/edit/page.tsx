'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Upload, Loader2, Check } from 'lucide-react'
import { AFRICAN_COUNTRIES, COUNTRY_FLAGS } from '@/lib/african-data'

export default function EditProfilePage() {
  const supabase = createClient()
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  const [fullName, setFullName] = useState('')
  const [bio, setBio] = useState('')
  const [country, setCountry] = useState('')
  const [city, setCity] = useState('')
  const [countrySearch, setCountrySearch] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    (async () => {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (data) {
        setProfile(data)
        setFullName(data.full_name || '')
        setBio(data.bio || '')
        setCountry(data.country || '')
        setCity(data.city || '')
      }
      setLoading(false)
    })()
  }, [])

  const filteredCountries = AFRICAN_COUNTRIES.filter(c =>
    c.toLowerCase().includes(countrySearch.toLowerCase())
  )

  async function handleSave() {
    if (!fullName.trim()) { setError('Full name is required'); return }
    setSaving(true); setError('')
    let avatar_url = profile?.avatar_url
    if (avatarFile) {
      const filePath = `${profile.id}/avatar.${Date.now()}.${avatarFile.name.split('.').pop()}`
      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, avatarFile, { upsert: true })
      if (uploadError) { setError('Avatar upload failed.'); setSaving(false); return }
      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath)
      avatar_url = data.publicUrl
    }
    const { error: updateError } = await supabase.from('profiles').update({
      full_name: fullName.trim(),
      bio: bio.trim() || null,
      country: country || null,
      city: city.trim() || null,
      avatar_url,
    }).eq('id', profile.id)
    if (updateError) { setError(updateError.message) }
    else { setSaved(true); setTimeout(() => { router.push(`/profile/${profile.id}`); router.refresh() }, 800) }
    setSaving(false)
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 size={32} className="animate-spin" style={{ color: 'var(--nia-violet)' }} />
    </div>
  )

  return (
    <main className="w-full max-w-xl px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="w-10 h-10 flex items-center justify-center rounded-2xl transition-all active:scale-90" style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}>
          <ArrowLeft size={20} />
        </button>
        <h1 className="font-extrabold text-xl">Edit Profile</h1>
      </div>

      <div className="card p-6 space-y-5">
        {/* Avatar */}
        <div className="flex flex-col items-center gap-3">
          <div className="relative">
            <div className="avatar-ring" style={{ padding: '3px' }}>
              <div className="w-24 h-24 rounded-2xl overflow-hidden flex items-center justify-center text-white font-black text-3xl" style={{ background: 'var(--grad-brand)' }}>
                {avatarPreview || profile?.avatar_url
                  ? <img src={avatarPreview || profile?.avatar_url} className="w-full h-full object-cover" alt="" />
                  : profile?.username?.[0]?.toUpperCase() ?? '?'
                }
              </div>
            </div>
            <label className="absolute -bottom-1 -right-1 w-8 h-8 flex items-center justify-center rounded-full text-white cursor-pointer" style={{ background: 'var(--grad-brand)', boxShadow: '0 2px 8px rgba(168,85,247,0.4)' }}>
              <Upload size={14} />
              <input type="file" accept="image/*" className="hidden" onChange={e => {
                const f = e.target.files?.[0]
                if (f) { setAvatarFile(f); setAvatarPreview(URL.createObjectURL(f)) }
              }} />
            </label>
          </div>
          <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Tap to change (max 5MB)</p>
        </div>

        {/* Full name */}
        <div className="space-y-1.5">
          <label className="text-sm font-bold">Full Name</label>
          <input value={fullName} onChange={e => setFullName(e.target.value)} className="input" placeholder="Amara Osei" />
        </div>

        {/* Country */}
        <div className="space-y-1.5">
          <label className="text-sm font-bold">Country</label>
          <input
            value={countrySearch || (country ? `${COUNTRY_FLAGS[country] ?? '🌍'} ${country}` : '')}
            onChange={e => { setCountrySearch(e.target.value); if (!e.target.value) setCountry('') }}
            placeholder="Search country…"
            className="input"
          />
          {countrySearch && (
            <div className="space-y-1 max-h-48 overflow-y-auto border rounded-2xl p-2" style={{ borderColor: 'var(--border)', background: 'var(--surface-1)' }}>
              {filteredCountries.slice(0, 10).map(c => (
                <button key={c} onClick={() => { setCountry(c); setCountrySearch('') }} className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-semibold text-left transition-all hover:bg-(--surface-2)">
                  <span>{COUNTRY_FLAGS[c] ?? '🌍'}</span> {c}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* City */}
        <div className="space-y-1.5">
          <label className="text-sm font-bold">City <span className="font-normal" style={{ color: 'var(--text-tertiary)' }}>(optional)</span></label>
          <input value={city} onChange={e => setCity(e.target.value)} className="input" placeholder="Nairobi, Lagos, Accra…" />
        </div>

        {/* Bio */}
        <div className="space-y-1.5">
          <label className="text-sm font-bold">Bio <span className="font-normal" style={{ color: 'var(--text-tertiary)' }}>(optional)</span></label>
          <textarea value={bio} onChange={e => setBio(e.target.value)} rows={3} className="input resize-none" placeholder="Developer from Nairobi. Building Africa's future ✊" />
        </div>

        {error && <div className="px-3 py-2 rounded-xl text-sm font-semibold text-red-500" style={{ background: 'rgba(239,68,68,0.08)' }}>{error}</div>}

        <button
          onClick={handleSave}
          disabled={saving || !fullName.trim() || saved}
          className="btn-primary w-full flex items-center justify-center gap-2"
          style={saved ? { background: 'linear-gradient(135deg,#6BCB77,#4ECDC4)' } : {}}
        >
          {saving && <Loader2 size={18} className="animate-spin" />}
          {saved && <Check size={18} />}
          {saved ? 'Saved!' : saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>
    </main>
  )
}

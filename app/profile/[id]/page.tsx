'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Camera, Upload, Loader2, Check,
  X, Globe, MapPin, Link as LinkIcon,
  User, FileText, Sparkles, Languages,
} from 'lucide-react'
import { AFRICAN_COUNTRIES, COUNTRY_FLAGS, AFRICAN_LANGUAGES } from '@/lib/african-data'

const INTERESTS_OPTIONS = [
  'Technology', 'AI', 'Startups', 'Fintech', 'Music', 'Fashion',
  'Art', 'Photography', 'Film', 'Sports', 'Football', 'Politics',
  'Business', 'Health', 'Education', 'Agriculture', 'Climate',
  'Literature', 'Gaming', 'Travel', 'Food', 'Culture',
]

type Section = 'basic' | 'location' | 'identity' | 'interests'

const SECTIONS: { key: Section; label: string; icon: React.ReactNode }[] = [
  { key: 'basic',     label: 'Basic Info',  icon: <User size={15} /> },
  { key: 'location',  label: 'Location',    icon: <MapPin size={15} /> },
  { key: 'identity',  label: 'Identity',    icon: <Globe size={15} /> },
  { key: 'interests', label: 'Interests',   icon: <Sparkles size={15} /> },
]

// Shared input style
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '11px 14px', borderRadius: 12,
  border: '1.5px solid var(--border)',
  background: 'var(--surface-2)',
  color: 'var(--text-primary)', fontSize: 14,
  fontFamily: 'inherit', outline: 'none',
  boxSizing: 'border-box',
  transition: 'border-color 0.15s',
}

function Field({ label, sub, children }: { label: string; sub?: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div>
        <p style={{ fontWeight: 700, fontSize: 13, margin: 0 }}>{label}</p>
        {sub && <p style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: '2px 0 0' }}>{sub}</p>}
      </div>
      {children}
    </div>
  )
}

export default function EditProfilePage() {
  const supabase = createClient()
  const router   = useRouter()

  const [profile,        setProfile]        = useState<any>(null)
  const [loading,        setLoading]        = useState(true)
  const [saving,         setSaving]         = useState(false)
  const [saved,          setSaved]          = useState(false)
  const [error,          setError]          = useState('')
  const [activeSection,  setActiveSection]  = useState<Section>('basic')
  const [countrySearch,  setCountrySearch]  = useState('')
  const [showCountries,  setShowCountries]  = useState(false)

  // Form fields
  const [fullName,    setFullName]    = useState('')
  const [username,    setUsername]    = useState('')
  const [headline,    setHeadline]    = useState('')
  const [bio,         setBio]         = useState('')
  const [website,     setWebsite]     = useState('')
  const [country,     setCountry]     = useState('')
  const [city,        setCity]        = useState('')
  const [languages,   setLanguages]   = useState<string[]>([])
  const [interests,   setInterests]   = useState<string[]>([])

  // Media
  const [avatarFile,    setAvatarFile]    = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [bannerFile,    setBannerFile]    = useState<File | null>(null)
  const [bannerPreview, setBannerPreview] = useState<string | null>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [bannerUploading, setBannerUploading] = useState(false)

  const avatarInputRef = useRef<HTMLInputElement>(null)
  const bannerInputRef = useRef<HTMLInputElement>(null)
  const countryRef     = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (data) {
        setProfile(data)
        setFullName(data.full_name ?? '')
        setUsername(data.username ?? '')
        setHeadline(data.headline ?? '')
        setBio(data.bio ?? '')
        setWebsite(data.website ?? '')
        setCountry(data.country ?? '')
        setCity(data.city ?? '')
        setLanguages(Array.isArray(data.languages) ? data.languages : data.languages ? [data.languages] : [])
        setInterests(Array.isArray(data.interests) ? data.interests : data.interests ? [data.interests] : [])
      }
      setLoading(false)
    }
    load()
  }, []) // eslint-disable-line

  // Close country dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (countryRef.current && !countryRef.current.contains(e.target as Node)) {
        setShowCountries(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  async function uploadMedia(file: File, bucket: string, path: string): Promise<string | null> {
    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true })
    if (error) { setError(`Upload failed: ${error.message}`); return null }
    return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl
  }

  async function handleSave() {
    if (!fullName.trim()) { setError('Full name is required'); return }
    if (!username.trim()) { setError('Username is required'); return }
    setSaving(true); setError('')

    let avatar_url = profile?.avatar_url
    let banner_url = profile?.banner_url

    if (avatarFile) {
      setAvatarUploading(true)
      const path = `${profile.id}/avatar.${Date.now()}.${avatarFile.name.split('.').pop()}`
      const url = await uploadMedia(avatarFile, 'avatars', path)
      if (!url) { setSaving(false); setAvatarUploading(false); return }
      avatar_url = url
      setAvatarUploading(false)
    }

    if (bannerFile) {
      setBannerUploading(true)
      const path = `${profile.id}/banner.${Date.now()}.${bannerFile.name.split('.').pop()}`
      const url = await uploadMedia(bannerFile, 'avatars', path)
      if (!url) { setSaving(false); setBannerUploading(false); return }
      banner_url = url
      setBannerUploading(false)
    }

    const { error: updateError } = await supabase.from('profiles').update({
      full_name:  fullName.trim(),
      username:   username.trim().toLowerCase().replace(/[^a-z0-9_]/g, ''),
      headline:   headline.trim() || null,
      bio:        bio.trim() || null,
      website:    website.trim() || null,
      country:    country || null,
      city:       city.trim() || null,
      languages:  languages.length ? languages : null,
      interests:  interests.length ? interests : null,
      avatar_url,
      banner_url,
    }).eq('id', profile.id)

    if (updateError) {
      setError(updateError.message)
    } else {
      setSaved(true)
      setTimeout(() => { router.push(`/profile/${profile.id}`); router.refresh() }, 900)
    }
    setSaving(false)
  }

  function toggleLanguage(lang: string) {
    setLanguages(prev => prev.includes(lang) ? prev.filter(l => l !== lang) : [...prev, lang])
  }

  function toggleInterest(tag: string) {
    setInterests(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])
  }

  const filteredCountries = AFRICAN_COUNTRIES.filter(c =>
    c.toLowerCase().includes(countrySearch.toLowerCase())
  )

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <Loader2 size={26} className="animate-spin" style={{ color: 'var(--nia-violet)' }} />
    </div>
  )

  const avatarSrc   = avatarPreview ?? profile?.avatar_url
  const bannerSrc   = bannerPreview ?? profile?.banner_url
  const initials    = (fullName || username || '?').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', paddingBottom: 48 }}>

      {/* ── Header ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 16px',
        position: 'sticky', top: 'var(--nav-top)', zIndex: 20,
        background: 'var(--surface-0)',
        borderBottom: '1px solid var(--divider)',
      }}>
        <button onClick={() => router.back()} style={{
          width: 34, height: 34, borderRadius: '50%', border: 'none',
          background: 'var(--surface-2)', color: 'var(--text-primary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', flexShrink: 0,
        }}>
          <ArrowLeft size={17} strokeWidth={2.5} />
        </button>
        <div style={{ flex: 1 }}>
          <p style={{ fontWeight: 800, fontSize: 15, margin: 0 }}>Edit Profile</p>
          <p style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: 0 }}>@{profile?.username}</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || saved}
          style={{
            padding: '8px 20px', borderRadius: 20, border: 'none',
            background: saved ? 'linear-gradient(135deg,#22c55e,#16a34a)' : 'var(--grad-brand)',
            color: 'white', fontWeight: 700, fontSize: 13,
            cursor: saving || saved ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
            opacity: saving ? 0.7 : 1,
            transition: 'background 0.3s',
            fontFamily: 'inherit',
          }}
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : saved ? <Check size={14} /> : null}
          {saved ? 'Saved!' : saving ? 'Saving…' : 'Save'}
        </button>
      </div>

      {/* ── Banner + Avatar preview ── */}
      <div style={{ position: 'relative', marginBottom: 56 }}>
        {/* Banner */}
        <div style={{
          height: 160,
          background: bannerSrc
            ? `url(${bannerSrc}) center/cover no-repeat`
            : 'linear-gradient(135deg, #1a0f3a 0%, #2d1a6e 50%, #0f1428 100%)',
          position: 'relative',
          cursor: 'pointer',
        }} onClick={() => bannerInputRef.current?.click()}>
          {/* Overlay */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'rgba(0,0,0,0.35)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 8, color: 'white',
            opacity: bannerSrc ? 0 : 1,
            transition: 'opacity 0.2s',
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
          onMouseLeave={e => (e.currentTarget.style.opacity = bannerSrc ? '0' : '1')}
          >
            {bannerUploading
              ? <Loader2 size={20} className="animate-spin" />
              : <><Camera size={18} /> <span style={{ fontSize: 13, fontWeight: 600 }}>Change cover photo</span></>
            }
          </div>
          <input ref={bannerInputRef} type="file" accept="image/*" style={{ display: 'none' }}
            onChange={e => {
              const f = e.target.files?.[0]
              if (f) { setBannerFile(f); setBannerPreview(URL.createObjectURL(f)) }
              e.target.value = ''
            }}
          />
        </div>

        {/* Avatar */}
        <div style={{
          position: 'absolute', bottom: -44, left: 20,
          cursor: 'pointer',
        }} onClick={() => avatarInputRef.current?.click()}>
          <div style={{
            width: 88, height: 88, borderRadius: '50%',
            border: '4px solid var(--surface-0)',
            background: 'var(--grad-brand)',
            overflow: 'hidden',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontWeight: 800, fontSize: 28,
            position: 'relative',
          }}>
            {avatarSrc
              ? <img src={avatarSrc} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : initials
            }
            {/* Overlay */}
            <div style={{
              position: 'absolute', inset: 0, borderRadius: '50%',
              background: 'rgba(0,0,0,0.45)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {avatarUploading
                ? <Loader2 size={16} color="white" className="animate-spin" />
                : <Camera size={16} color="white" />
              }
            </div>
          </div>
          <input ref={avatarInputRef} type="file" accept="image/*" style={{ display: 'none' }}
            onChange={e => {
              const f = e.target.files?.[0]
              if (f) { setAvatarFile(f); setAvatarPreview(URL.createObjectURL(f)) }
              e.target.value = ''
            }}
          />
        </div>
      </div>

      {/* ── Section tabs ── */}
      <div style={{
        display: 'flex', gap: 0, padding: '0 16px 16px',
        overflowX: 'auto', scrollbarWidth: 'none',
      }}>
        {SECTIONS.map(s => (
          <button key={s.key} onClick={() => setActiveSection(s.key)} style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '8px 14px', borderRadius: 20, border: 'none',
            background: activeSection === s.key ? 'var(--grad-brand)' : 'var(--surface-2)',
            color: activeSection === s.key ? 'white' : 'var(--text-tertiary)',
            fontWeight: activeSection === s.key ? 700 : 500,
            fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap',
            marginRight: 6, flexShrink: 0,
            fontFamily: 'inherit',
            transition: 'background 0.15s, color 0.15s',
          }}>
            {s.icon} {s.label}
          </button>
        ))}
      </div>

      {/* ── Section content ── */}
      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* BASIC INFO */}
        {activeSection === 'basic' && (
          <>
            <Field label="Full Name" sub="Your real name, shown on your profile">
              <input
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                placeholder="Amara Osei"
                style={inputStyle}
                maxLength={60}
              />
              <p style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: 0, textAlign: 'right' }}>{fullName.length}/60</p>
            </Field>

            <Field label="Username" sub="Lowercase letters, numbers, underscores only">
              <div style={{ position: 'relative' }}>
                <span style={{
                  position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
                  color: 'var(--text-tertiary)', fontSize: 14, pointerEvents: 'none',
                }}>@</span>
                <input
                  value={username}
                  onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  placeholder="amara_osei"
                  style={{ ...inputStyle, paddingLeft: 28 }}
                  maxLength={30}
                />
              </div>
            </Field>

            <Field label="Headline" sub="Your role or tagline — shown under your name">
              <input
                value={headline}
                onChange={e => setHeadline(e.target.value)}
                placeholder="Developer · Founder · Builder"
                style={inputStyle}
                maxLength={80}
              />
              <p style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: 0, textAlign: 'right' }}>{headline.length}/80</p>
            </Field>

            <Field label="Bio" sub="Tell people about yourself">
              <textarea
                value={bio}
                onChange={e => setBio(e.target.value)}
                placeholder="Building technology for Africa. Founder of Nia. Interested in AI and startups."
                rows={4}
                maxLength={280}
                style={{ ...inputStyle, resize: 'none', lineHeight: 1.55 }}
              />
              <p style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: 0, textAlign: 'right' }}>{bio.length}/280</p>
            </Field>

            <Field label="Website">
              <div style={{ position: 'relative' }}>
                <LinkIcon size={14} style={{
                  position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                  color: 'var(--text-tertiary)', pointerEvents: 'none',
                }} />
                <input
                  value={website}
                  onChange={e => setWebsite(e.target.value)}
                  placeholder="https://yoursite.com"
                  style={{ ...inputStyle, paddingLeft: 34 }}
                  type="url"
                />
              </div>
            </Field>
          </>
        )}

        {/* LOCATION */}
        {activeSection === 'location' && (
          <>
            <Field label="Country" sub="Select your country">
              <div ref={countryRef} style={{ position: 'relative' }}>
                <input
                  value={countrySearch || (country ? `${COUNTRY_FLAGS[country] ?? '🌍'}  ${country}` : '')}
                  onChange={e => { setCountrySearch(e.target.value); setShowCountries(true); if (!e.target.value) setCountry('') }}
                  onFocus={() => setShowCountries(true)}
                  placeholder="Search your country…"
                  style={inputStyle}
                />
                {country && !countrySearch && (
                  <button onClick={() => { setCountry(''); setCountrySearch('') }} style={{
                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                    border: 'none', background: 'none', cursor: 'pointer', color: 'var(--text-tertiary)',
                    display: 'flex', alignItems: 'center', padding: 4,
                  }}>
                    <X size={14} />
                  </button>
                )}
                {showCountries && countrySearch && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 30,
                    background: 'var(--surface-1)',
                    border: '1.5px solid var(--border)',
                    borderRadius: 12, marginTop: 4,
                    maxHeight: 220, overflowY: 'auto',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                  }}>
                    {filteredCountries.slice(0, 12).map(c => (
                      <button key={c} onClick={() => { setCountry(c); setCountrySearch(''); setShowCountries(false) }} style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                        padding: '10px 14px', border: 'none', background: 'none',
                        cursor: 'pointer', fontSize: 14, fontWeight: 500,
                        color: 'var(--text-primary)', textAlign: 'left',
                        fontFamily: 'inherit',
                        transition: 'background 0.1s',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                      >
                        <span style={{ fontSize: 20 }}>{COUNTRY_FLAGS[c] ?? '🌍'}</span>
                        {c}
                      </button>
                    ))}
                    {filteredCountries.length === 0 && (
                      <p style={{ padding: '12px 14px', fontSize: 13, color: 'var(--text-tertiary)', margin: 0 }}>No countries found</p>
                    )}
                  </div>
                )}
              </div>
            </Field>

            <Field label="City" sub="Your city or town">
              <input
                value={city}
                onChange={e => setCity(e.target.value)}
                placeholder="Nairobi, Lagos, Accra…"
                style={inputStyle}
                maxLength={50}
              />
            </Field>

            {/* Preview */}
            {(country || city) && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '12px 14px', borderRadius: 12,
                background: 'rgba(91,33,182,0.06)',
                border: '1px solid rgba(91,33,182,0.12)',
              }}>
                <span style={{ fontSize: 24 }}>{country ? COUNTRY_FLAGS[country] ?? '🌍' : '📍'}</span>
                <div>
                  <p style={{ fontWeight: 700, fontSize: 13, margin: 0 }}>
                    {[city, country].filter(Boolean).join(', ')}
                  </p>
                  <p style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: 0 }}>This is how your location will appear</p>
                </div>
              </div>
            )}
          </>
        )}

        {/* IDENTITY */}
        {activeSection === 'identity' && (
          <>
            <Field label="Languages" sub="Select the languages you speak">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {AFRICAN_LANGUAGES.map(lang => {
                  const selected = languages.includes(lang.label)
                  return (
                    <button
                      key={lang.code}
                      onClick={() => toggleLanguage(lang.label)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '8px 14px', borderRadius: 20,
                        border: `1.5px solid ${selected ? 'var(--nia-violet)' : 'var(--border)'}`,
                        background: selected ? 'rgba(91,33,182,0.1)' : 'var(--surface-2)',
                        color: selected ? 'var(--nia-violet)' : 'var(--text-primary)',
                        fontWeight: selected ? 700 : 500,
                        fontSize: 13, cursor: 'pointer',
                        fontFamily: 'inherit',
                        transition: 'all 0.15s',
                      }}
                    >
                      <span>{lang.emoji}</span> {lang.label}
                      {selected && <Check size={12} style={{ marginLeft: 2 }} />}
                    </button>
                  )
                })}
              </div>
            </Field>

            {languages.length > 0 && (
              <div style={{
                display: 'flex', flexWrap: 'wrap', gap: 6,
                padding: '10px 12px', borderRadius: 12,
                background: 'rgba(91,33,182,0.04)',
                border: '1px solid rgba(91,33,182,0.1)',
              }}>
                {languages.map(l => (
                  <span key={l} style={{
                    fontSize: 12, fontWeight: 600, padding: '3px 10px',
                    borderRadius: 20, background: 'rgba(91,33,182,0.1)',
                    color: 'var(--nia-violet)',
                  }}>
                    {AFRICAN_LANGUAGES.find(a => a.label === l)?.emoji} {l}
                  </span>
                ))}
              </div>
            )}
          </>
        )}

        {/* INTERESTS */}
        {activeSection === 'interests' && (
          <>
            <Field label="Your Interests" sub="Pick topics you care about — helps people discover you">
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {INTERESTS_OPTIONS.map(tag => {
                  const selected = interests.includes(tag)
                  return (
                    <button
                      key={tag}
                      onClick={() => toggleInterest(tag)}
                      style={{
                        padding: '8px 14px', borderRadius: 20,
                        border: `1.5px solid ${selected ? 'var(--nia-violet)' : 'var(--border)'}`,
                        background: selected ? 'rgba(91,33,182,0.1)' : 'var(--surface-2)',
                        color: selected ? 'var(--nia-violet)' : 'var(--text-primary)',
                        fontWeight: selected ? 700 : 500,
                        fontSize: 13, cursor: 'pointer',
                        fontFamily: 'inherit',
                        transition: 'all 0.15s',
                        display: 'flex', alignItems: 'center', gap: 5,
                      }}
                    >
                      {selected && <Check size={11} />}
                      #{tag}
                    </button>
                  )
                })}
              </div>
            </Field>

            {/* Custom interest input */}
            <Field label="Custom Interest" sub="Add something not in the list">
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  id="custom-tag"
                  placeholder="e.g. Afrobeats"
                  style={{ ...inputStyle, flex: 1 }}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      const val = (e.target as HTMLInputElement).value.trim()
                      if (val && !interests.includes(val)) {
                        setInterests(prev => [...prev, val])
                        ;(e.target as HTMLInputElement).value = ''
                      }
                    }
                  }}
                />
                <button
                  onClick={() => {
                    const input = document.getElementById('custom-tag') as HTMLInputElement
                    const val = input?.value.trim()
                    if (val && !interests.includes(val)) {
                      setInterests(prev => [...prev, val])
                      input.value = ''
                    }
                  }}
                  style={{
                    padding: '0 16px', borderRadius: 12, border: 'none',
                    background: 'var(--grad-brand)', color: 'white',
                    fontWeight: 700, fontSize: 13, cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  Add
                </button>
              </div>
            </Field>

            {interests.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {interests.map(tag => (
                  <span key={tag} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    fontSize: 12, fontWeight: 600, padding: '4px 10px',
                    borderRadius: 20,
                    background: 'rgba(91,33,182,0.09)',
                    color: 'var(--nia-violet)',
                    border: '1px solid rgba(91,33,182,0.15)',
                  }}>
                    #{tag}
                    <button
                      onClick={() => setInterests(prev => prev.filter(t => t !== tag))}
                      style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center', color: 'var(--nia-violet)' }}
                    >
                      <X size={11} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </>
        )}

        {/* Error */}
        {error && (
          <div style={{
            padding: '10px 14px', borderRadius: 12, fontSize: 13,
            fontWeight: 600, color: '#dc2626',
            background: 'rgba(220,38,38,0.07)',
            border: '1px solid rgba(220,38,38,0.15)',
          }}>
            {error}
          </div>
        )}

        {/* Bottom save button */}
        <button
          onClick={handleSave}
          disabled={saving || saved}
          style={{
            width: '100%', padding: '14px', borderRadius: 14, border: 'none',
            background: saved ? 'linear-gradient(135deg,#22c55e,#16a34a)' : 'var(--grad-brand)',
            color: 'white', fontWeight: 800, fontSize: 15,
            cursor: saving || saved ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            opacity: saving ? 0.7 : 1,
            fontFamily: 'inherit',
            transition: 'background 0.3s, transform 0.1s',
            marginTop: 8,
          }}
        >
          {saving ? <Loader2 size={18} className="animate-spin" /> : saved ? <Check size={18} /> : <Upload size={16} />}
          {saved ? 'Profile saved!' : saving ? 'Saving changes…' : 'Save all changes'}
        </button>
      </div>
    </div>
  )
}
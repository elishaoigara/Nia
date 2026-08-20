'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Loader2, ArrowRight } from 'lucide-react'
import { AFRICAN_COUNTRIES, COUNTRY_FLAGS } from '@/lib/african-data'
import { isValidUsername, normalizeUsername, usernameValidationMessage } from '@/lib/validation'

const STEPS = ['Profile', 'Location', 'Bio']

export default function OnboardingPage() {
  const supabase = createClient()
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [username, setUsername] = useState('')
  const [fullName, setFullName] = useState('')
  const [country, setCountry] = useState('')
  const [city, setCity] = useState('')
  const [bio, setBio] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [countrySearch, setCountrySearch] = useState('')

  const filteredCountries = AFRICAN_COUNTRIES.filter(c =>
    c.toLowerCase().includes(countrySearch.toLowerCase())
  )

  async function handleComplete() {
    const normalizedUsername = normalizeUsername(username)
    const usernameError = usernameValidationMessage(normalizedUsername)
    if (usernameError) {
      setError(usernameError)
      setStep(0)
      return
    }

    setLoading(true); setError('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', normalizedUsername)
      .single()
    if (existing) { setError('Username taken. Try another.'); setLoading(false); return }

    const { error: insertError } = await supabase.from('profiles').insert({
      id: user.id,
      username: normalizedUsername,
      full_name: fullName.trim(),
      country,
      city: city.trim() || null,
      bio: bio.trim() || null,
      // keep university column null for non-campus users
    })

    if (insertError) { setError(insertError.message); setLoading(false) }
    else { router.push('/') }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden"
      style={{ background: 'var(--surface-0)' }}
    >
      {/* Progress bar */}
      <div className="onboarding-progress">
        <div className="onboarding-progress-fill" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
      </div>
      {/* Step counter */}
      <div style={{ position: 'fixed', top: 12, right: 16, fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)', zIndex: 101 }}>
        {step + 1} / {STEPS.length}
      </div>
      {/* Ambient blobs */}
      <div className="absolute top-0 left-0 w-64 h-64 rounded-full blur-[120px] opacity-10" style={{ background: 'var(--nia-amber)', transform: 'translate(-30%,-30%)' }} />
      <div className="absolute bottom-0 right-0 w-64 h-64 rounded-full blur-[120px] opacity-10" style={{ background: 'var(--nia-violet)', transform: 'translate(30%,30%)' }} />

      <div className="w-full max-w-sm space-y-6 relative z-10">
        {/* Logo */}
        <div className="text-center space-y-2">
          <div
            className="w-16 h-16 rounded-3xl mx-auto flex items-center justify-center text-white font-black text-3xl"
            style={{ background: 'var(--grad-brand)', boxShadow: '0 8px 30px rgba(168,85,247,0.35)' }}
          >
            N
          </div>
          <h1 className="font-extrabold text-2xl">Welcome to Nia 🌍</h1>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Connecting African youth — let’s set up your profile
          </p>
        </div>

        {/* Progress */}
        <div className="flex gap-2">
          {STEPS.map((s, i) => (
            <div key={s} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--surface-2)' }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: i <= step ? '100%' : '0%', background: 'var(--grad-brand)' }}
                />
              </div>
              <span className="text-[10px] font-semibold" style={{ color: i <= step ? 'var(--nia-violet)' : 'var(--text-tertiary)' }}>
                {s}
              </span>
            </div>
          ))}
        </div>

        <div className="card p-6 space-y-4">
          {/* Step 0 — Name + username */}
          {step === 0 && (
            <>
              <div className="space-y-1.5">
                <label className="text-sm font-bold">Full name</label>
                <input
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="Amara Osei"
                  className="input"
                  autoFocus
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-bold">Username</label>
                <div className="flex input p-0 overflow-hidden">
                  <span className="px-3 py-3 text-sm font-semibold flex-shrink-0" style={{ color: 'var(--text-tertiary)', background: 'var(--surface-2)', borderRight: '1.5px solid var(--border)' }}>@</span>
                  <input
                    value={username}
                    onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    placeholder="amara"
                    className="flex-1 px-3 py-3 bg-transparent focus:outline-none text-sm"
                    onKeyDown={e => e.key === 'Enter' && fullName.trim() && isValidUsername(username) && setStep(1)}
                  />
                </div>
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  2–30 characters: lowercase letters, numbers, and underscores.
                </p>
                {username.trim() && usernameValidationMessage(username) && (
                  <p className="text-xs font-semibold text-red-500">{usernameValidationMessage(username)}</p>
                )}
              </div>
              <button
                onClick={() => setStep(1)}
                disabled={!fullName.trim() || !isValidUsername(username)}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                Continue <ArrowRight size={16} />
              </button>
            </>
          )}

          {/* Step 1 — Country + city */}
          {step === 1 && (
            <>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>Pick your flag 🌍</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 12 }}>This connects you with your community on Nia.</p>
                <input
                  value={countrySearch}
                  onChange={e => setCountrySearch(e.target.value)}
                  placeholder="Search country…"
                  className="input mb-3 text-sm"
                />
                <div className="flag-grid" style={{ maxHeight: 260, overflowY: 'auto' }}>
                  {filteredCountries.map(c => (
                    <button
                      key={c}
                      onClick={() => { setCountry(c); setCountrySearch('') }}
                      className={`flag-btn${country === c ? ' selected' : ''}`}
                      title={c}
                    >
                      <span style={{ fontSize: 24 }}>{COUNTRY_FLAGS[c] ?? '🌍'}</span>
                      <span className="flag-name">{c.length > 8 ? c.split(' ')[0] : c}</span>
                    </button>
                  ))}
                </div>
                {country && (
                  <div style={{ marginTop: 10, padding: '8px 14px', borderRadius: 10, background: 'rgba(91,33,182,0.08)', color: 'var(--nia-violet)', fontWeight: 700, fontSize: 14 }}>
                    {COUNTRY_FLAGS[country] ?? '🌍'} {country} selected
                  </div>
                )}
              </div>

              {country && (
                <div className="space-y-1.5">
                  <label className="text-sm font-bold">City <span className="font-normal" style={{ color: 'var(--text-tertiary)' }}>(optional)</span></label>
                  <input
                    value={city}
                    onChange={e => setCity(e.target.value)}
                    placeholder={`City in ${country}`}
                    className="input"
                  />
                </div>
              )}

              <div className="flex gap-2">
                <button onClick={() => setStep(0)} className="btn-ghost flex-1">Back</button>
                <button
                  onClick={() => setStep(2)}
                  disabled={!country}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  Continue <ArrowRight size={16} />
                </button>
              </div>
            </>
          )}

          {/* Step 2 — Bio */}
          {step === 2 && (
            <>
              <div className="space-y-1.5">
                <label className="text-sm font-bold">
                  Bio <span className="font-normal" style={{ color: 'var(--text-tertiary)' }}>(optional)</span>
                </label>
                <textarea
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  placeholder="Developer from Nairobi. Building Africa's future ✊🌍"
                  rows={3}
                  className="input resize-none"
                  autoFocus
                />
              </div>
              {error && (
                <div className="px-3 py-2 rounded-xl text-sm font-semibold text-red-500" style={{ background: 'rgba(239,68,68,0.08)' }}>
                  {error}
                </div>
              )}
              <div className="flex gap-2">
                <button onClick={() => setStep(1)} className="btn-ghost flex-1">Back</button>
                <button
                  onClick={handleComplete}
                  disabled={loading || !fullName.trim() || !isValidUsername(username) || !country}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : '🚀'}
                  {loading ? 'Setting up…' : "Let's go!"}
                </button>
              </div>
            </>
          )}
        </div>

        {step === 0 && (
          <p className="text-center text-xs" style={{ color: 'var(--text-tertiary)' }}>
            Already have an account?{' '}
            <a href="/login" className="font-bold" style={{ color: 'var(--nia-violet)' }}>Sign in</a>
          </p>
        )}
      </div>
    </div>
  )
}

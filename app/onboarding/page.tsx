'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Loader2, ArrowRight, Check } from 'lucide-react'
import { AFRICAN_COUNTRIES, COUNTRY_FLAGS } from '@/lib/african-data'

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
    setLoading(true); setError('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username.toLowerCase().trim())
      .single()
    if (existing) { setError('Username taken. Try another.'); setLoading(false); return }

    const { error: insertError } = await supabase.from('profiles').insert({
      id: user.id,
      username: username.toLowerCase().replace(/\s+/g, '').trim(),
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
            Connecting African youth — let's set up your profile
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
                    onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.]/g, ''))}
                    placeholder="amara"
                    className="flex-1 px-3 py-3 bg-transparent focus:outline-none text-sm"
                    onKeyDown={e => e.key === 'Enter' && fullName.trim() && username.trim() && setStep(1)}
                  />
                </div>
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Only letters, numbers, _ and .</p>
              </div>
              <button
                onClick={() => setStep(1)}
                disabled={!fullName.trim() || !username.trim()}
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
                <label className="text-sm font-bold mb-2 block">Where are you from? 🌍</label>
                <input
                  value={countrySearch}
                  onChange={e => setCountrySearch(e.target.value)}
                  placeholder="Search country…"
                  className="input mb-2 text-sm"
                />
                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {filteredCountries.map(c => (
                    <button
                      key={c}
                      onClick={() => { setCountry(c); setCountrySearch('') }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold text-left transition-all"
                      style={country === c
                        ? { background: 'linear-gradient(135deg,rgba(255,107,107,0.12),rgba(168,85,247,0.12))', color: 'var(--nia-violet)', border: '1.5px solid var(--nia-violet)' }
                        : { background: 'var(--surface-2)', color: 'var(--text-primary)', border: '1.5px solid transparent' }
                      }
                    >
                      <span className="text-lg">{COUNTRY_FLAGS[c] ?? '🌍'}</span>
                      {c}
                      {country === c && <Check size={14} className="ml-auto" />}
                    </button>
                  ))}
                </div>
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
                  disabled={loading || !fullName || !username || !country}
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

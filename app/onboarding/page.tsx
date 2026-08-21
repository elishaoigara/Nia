'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Loader2, ArrowRight, Check, Users, MapPin } from 'lucide-react'
import { AFRICAN_COUNTRIES, COUNTRY_FLAGS } from '@/lib/african-data'
import { isValidUsername, normalizeUsername, usernameValidationMessage } from '@/lib/validation'

const STEPS = ['Profile', 'Location', 'Interests & bio', 'Circles']

const INTERESTS = [
  'Music', 'Fashion', 'Tech', 'Business', 'Sports', 'Campus life',
  'Culture', 'Gaming', 'Creative work', 'Food', 'Travel', 'Community',
] as const

const GOALS = [
  'Learn from people', 'Build a project', 'Find opportunities',
  'Meet collaborators', 'Share ideas', 'Support my community',
] as const

type RecommendedCircle = {
  id: string
  name: string
  slug: string
  description: string | null
  category: string | null
  country: string | null
  member_count: number
}

export default function OnboardingPage() {
  const supabase = createClient()
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [username, setUsername] = useState('')
  const [fullName, setFullName] = useState('')
  const [country, setCountry] = useState('')
  const [city, setCity] = useState('')
  const [bio, setBio] = useState('')
  const [selectedInterests, setSelectedInterests] = useState<string[]>([])
  const [selectedGoals, setSelectedGoals] = useState<string[]>([])
  const [recommendedCircles, setRecommendedCircles] = useState<RecommendedCircle[]>([])
  const [selectedCircleIds, setSelectedCircleIds] = useState<string[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [circlesLoading, setCirclesLoading] = useState(false)
  const [countrySearch, setCountrySearch] = useState('')

  const filteredCountries = AFRICAN_COUNTRIES.filter(c =>
    c.toLowerCase().includes(countrySearch.toLowerCase())
  )

  async function handleProfileComplete() {
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
      .maybeSingle()
    if (existing) { setError('Username taken. Try another.'); setLoading(false); setStep(0); return }

    const { error: insertError } = await supabase.from('profiles').insert({
      id: user.id,
      username: normalizedUsername,
      full_name: fullName.trim(),
      country,
      city: city.trim() || null,
      bio: bio.trim() || null,
      interests: selectedInterests,
      goals: selectedGoals,
    })

    if (insertError) {
      setError(insertError.message)
      setLoading(false)
      return
    }

    setCirclesLoading(true)
    const { data: circles, error: circlesError } = await supabase.rpc('get_recommended_circles', {
      p_user_id: user.id,
      p_limit: 6,
    })

    if (circlesError) {
      // The app can still finish onboarding before the recommendation migration is applied.
      setRecommendedCircles([])
    } else {
      setRecommendedCircles((circles ?? []) as RecommendedCircle[])
    }
    setCirclesLoading(false)
    setLoading(false)
    setStep(3)
  }

  async function finishOnboarding() {
    setLoading(true); setError('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    if (selectedCircleIds.length > 0) {
      const { error: joinError } = await supabase.from('circle_members').insert(
        selectedCircleIds.map(circle_id => ({ circle_id, user_id: user.id })),
      )
      if (joinError) {
        setError('Your profile is ready, but we could not join every Circle. You can join them from Explore.')
      }
    }

    router.push('/')
  }

  return (
    <div
      data-testid="onboarding-page"
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

          {/* Step 2 — Interests + bio */}
          {step === 2 && (
            <>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>Make Nia yours</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 12 }}>
                  Start with what you want to do here. Your choices shape people and Circles we recommend.
                </p>
                <p className="text-sm font-bold" style={{ margin: '0 0 8px' }}>What brings you here?</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                  {GOALS.map(goal => {
                    const selected = selectedGoals.includes(goal)
                    return (
                      <button
                        key={goal}
                        type="button"
                        onClick={() => setSelectedGoals(current => selected ? current.filter(item => item !== goal) : [...current, goal])}
                        aria-pressed={selected}
                        style={{
                          border: `1px solid ${selected ? 'var(--nia-violet)' : 'var(--border)'}`,
                          background: selected ? 'rgba(91,33,182,0.12)' : 'var(--surface-1)',
                          color: selected ? 'var(--nia-violet)' : 'var(--text-secondary)',
                          borderRadius: 999,
                          padding: '8px 12px',
                          fontSize: 13,
                          fontWeight: selected ? 700 : 600,
                          cursor: 'pointer',
                        }}
                      >
                        {goal}
                      </button>
                    )
                  })}
                </div>
                <p className="text-xs" style={{ color: selectedGoals.length > 0 ? 'var(--nia-violet)' : 'var(--text-tertiary)', margin: '0 0 14px' }}>
                  {selectedGoals.length} selected · choose at least 1
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {INTERESTS.map(interest => {
                    const selected = selectedInterests.includes(interest)
                    return (
                      <button
                        key={interest}
                        type="button"
                        onClick={() => setSelectedInterests(current => selected
                          ? current.filter(item => item !== interest)
                          : [...current, interest]
                        )}
                        aria-pressed={selected}
                        style={{
                          border: `1px solid ${selected ? 'var(--nia-violet)' : 'var(--border)'}`,
                          background: selected ? 'rgba(91,33,182,0.12)' : 'var(--surface-1)',
                          color: selected ? 'var(--nia-violet)' : 'var(--text-secondary)',
                          borderRadius: 999,
                          padding: '8px 12px',
                          fontSize: 13,
                          fontWeight: selected ? 700 : 600,
                          cursor: 'pointer',
                        }}
                      >
                        {interest}
                      </button>
                    )
                  })}
                </div>
                <p className="text-xs" style={{ color: selectedInterests.length >= 3 ? 'var(--nia-violet)' : 'var(--text-tertiary)', marginTop: 10 }}>
                  {selectedInterests.length} selected · choose at least 3
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-bold">
                  Bio <span className="font-normal" style={{ color: 'var(--text-tertiary)' }}>(optional)</span>
                </label>
                <textarea
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  placeholder="Tell your new community what you care about…"
                  rows={3}
                  maxLength={500}
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
                  onClick={handleProfileComplete}
                  disabled={loading || !fullName.trim() || !isValidUsername(username) || !country || selectedInterests.length < 3 || selectedGoals.length < 1}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  {loading ? 'Setting up…' : "Let's go!"}
                </button>
              </div>
            </>
          )}

          {/* Step 3 — Recommended Circles */}
          {step === 3 && (
            <div data-testid="onboarding-circles-step">
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 4 }}>Find your people</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 12 }}>
                  Join a few Circles now and make your first feed feel alive. You can change this later.
                </p>
              </div>

              {circlesLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '32px 0' }}>
                  <Loader2 size={24} className="animate-spin" style={{ color: 'var(--nia-violet)' }} />
                </div>
              ) : recommendedCircles.length > 0 ? (
                <div style={{ display: 'grid', gap: 10 }}>
                  {recommendedCircles.map(circle => {
                    const selected = selectedCircleIds.includes(circle.id)
                    return (
                      <button
                        key={circle.id}
                        data-testid={`circle-option-${circle.id}`}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => setSelectedCircleIds(current => selected
                          ? current.filter(id => id !== circle.id)
                          : [...current, circle.id]
                        )}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left',
                          border: `1px solid ${selected ? 'var(--nia-violet)' : 'var(--border)'}`,
                          background: selected ? 'rgba(91,33,182,0.08)' : 'var(--surface-1)',
                          borderRadius: 14, padding: 12, cursor: 'pointer', color: 'var(--text-primary)',
                        }}
                      >
                        <span style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--grad-brand)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Users size={18} />
                        </span>
                        <span style={{ minWidth: 0, flex: 1 }}>
                          <span style={{ display: 'block', fontWeight: 800, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{circle.name}</span>
                          <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--text-tertiary)', fontSize: 11, marginTop: 3 }}>
                            {circle.country && <><MapPin size={11} /> {circle.country}</>}
                            <span><Users size={11} style={{ verticalAlign: 'middle' }} /> {circle.member_count} members</span>
                          </span>
                        </span>
                        <span style={{ width: 24, height: 24, borderRadius: '50%', border: `1.5px solid ${selected ? 'var(--nia-violet)' : 'var(--border)'}`, background: selected ? 'var(--nia-violet)' : 'transparent', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {selected && <Check size={14} strokeWidth={3} />}
                        </span>
                      </button>
                    )
                  })}
                </div>
              ) : (
                <div className="card" style={{ padding: 20, textAlign: 'center' }}>
                  <Users size={24} style={{ color: 'var(--nia-violet)', margin: '0 auto 8px' }} />
                  <p style={{ fontWeight: 700, fontSize: 14 }}>Your community is still growing</p>
                  <p style={{ color: 'var(--text-tertiary)', fontSize: 12, marginTop: 4 }}>You can discover Circles from Explore after you join.</p>
                </div>
              )}

              {error && (
                <div className="px-3 py-2 rounded-xl text-sm font-semibold text-red-500" style={{ background: 'rgba(239,68,68,0.08)' }}>
                  {error}
                </div>
              )}
              <div className="flex gap-2">
                <button onClick={() => setStep(2)} className="btn-ghost flex-1">Back</button>
                <button
                  onClick={finishOnboarding}
                  disabled={loading}
                  className="btn-primary flex-1 flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                  {loading ? 'Joining…' : selectedCircleIds.length > 0 ? `Join ${selectedCircleIds.length} Circle${selectedCircleIds.length === 1 ? '' : 's'}` : 'Skip for now'}
                </button>
              </div>
            </div>
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

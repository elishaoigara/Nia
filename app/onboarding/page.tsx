'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Loader2, ArrowRight, Check } from 'lucide-react'

const UNIVERSITIES = ['University of Nairobi','Kenyatta University','JKUAT','Strathmore University','Moi University','Maseno University','Egerton University','Daystar University','USIU-Africa','Mount Kenya University','KCA University','Multimedia University','Other']

const STEPS = ['Profile', 'University', 'Bio']

export default function OnboardingPage() {
  const supabase = createClient()
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [username, setUsername] = useState('')
  const [fullName, setFullName] = useState('')
  const [university, setUniversity] = useState('')
  const [bio, setBio] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleComplete() {
    setLoading(true); setError('')
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }
    const { data: existing } = await supabase.from('profiles').select('id').eq('username', username.toLowerCase()).single()
    if (existing) { setError('Username taken. Try another.'); setLoading(false); return }
    const { error } = await supabase.from('profiles').insert({ id: user.id, username: username.toLowerCase().replace(/\s+/g, ''), full_name: fullName, university, bio })
    if (error) { setError(error.message); setLoading(false) } else { router.push('/') }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden" style={{ background: 'var(--surface-0)' }}>
      <div className="absolute top-1/4 left-0 w-48 h-48 rounded-full blur-[80px] opacity-15" style={{ background: 'var(--nia-amber)' }} />
      <div className="absolute bottom-1/4 right-0 w-48 h-48 rounded-full blur-[80px] opacity-15" style={{ background: 'var(--nia-coral)' }} />

      <div className="w-full max-w-sm space-y-6 relative z-10">
        {/* Logo */}
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl mx-auto flex items-center justify-center text-white font-black text-2xl mb-4" style={{ background: 'var(--grad-brand)', boxShadow: '0 8px 30px rgba(168,85,247,0.4)' }}>N</div>
          <h1 className="font-extrabold text-2xl">Set up your profile 🎉</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>This is how your campus sees you</p>
        </div>

        {/* Progress */}
        <div className="flex gap-2">
          {STEPS.map((s, i) => (
            <div key={s} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--surface-2)' }}>
                <div className="h-full rounded-full transition-all duration-500" style={{ width: i <= step ? '100%' : '0%', background: 'var(--grad-brand)' }} />
              </div>
              <span className="text-[10px] font-semibold" style={{ color: i <= step ? 'var(--nia-violet)' : 'var(--text-tertiary)' }}>{s}</span>
            </div>
          ))}
        </div>

        <div className="card p-6 space-y-4">
          {step === 0 && (
            <>
              <div className="space-y-1.5">
                <label className="text-sm font-bold">Full name</label>
                <input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Amara Osei" className="input" />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-bold">Username</label>
                <div className="flex items-center gap-0 input p-0 overflow-hidden">
                  <span className="px-3 py-3 font-semibold text-sm" style={{ color: 'var(--text-tertiary)', background: 'var(--surface-2)', borderRight: '1.5px solid var(--border)' }}>@</span>
                  <input value={username} onChange={e => setUsername(e.target.value)} placeholder="amara" className="flex-1 px-3 py-3 bg-transparent focus:outline-none text-sm" />
                </div>
              </div>
              <button onClick={() => setStep(1)} disabled={!fullName.trim() || !username.trim()} className="btn-primary w-full flex items-center justify-center gap-2">
                Continue <ArrowRight size={16} />
              </button>
            </>
          )}

          {step === 1 && (
            <>
              <label className="text-sm font-bold">Your university</label>
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {UNIVERSITIES.map(u => (
                  <button key={u} onClick={() => setUniversity(u)} className="w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold text-left transition-all" style={university === u ? { background: 'linear-gradient(135deg,rgba(255,107,107,0.12),rgba(168,85,247,0.12))', color: 'var(--nia-violet)', border: '1.5px solid var(--nia-violet)' } : { background: 'var(--surface-2)', color: 'var(--text-primary)', border: '1.5px solid transparent' }}>
                    {u}
                    {university === u && <Check size={16} />}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button onClick={() => setStep(0)} className="btn-ghost flex-1">Back</button>
                <button onClick={() => setStep(2)} disabled={!university} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  Continue <ArrowRight size={16} />
                </button>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="space-y-1.5">
                <label className="text-sm font-bold">Bio <span className="font-normal" style={{ color: 'var(--text-tertiary)' }}>(optional)</span></label>
                <textarea value={bio} onChange={e => setBio(e.target.value)} placeholder="CS student. Builder. Nairobi vibes ✨" rows={3} className="input resize-none" />
              </div>
              {error && <div className="px-3 py-2 rounded-xl text-sm font-semibold text-red-500" style={{ background: 'rgba(239,68,68,0.08)' }}>{error}</div>}
              <div className="flex gap-2">
                <button onClick={() => setStep(1)} className="btn-ghost flex-1">Back</button>
                <button onClick={handleComplete} disabled={loading || !fullName || !username || !university} className="btn-primary flex-1 flex items-center justify-center gap-2">
                  {loading ? <Loader2 size={16} className="animate-spin" /> : '🚀'}
                  {loading ? 'Setting up…' : "Let's go!"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

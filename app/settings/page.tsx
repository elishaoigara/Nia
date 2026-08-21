'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Bell, ChevronRight, Eye, Gauge, Globe2, Lock, MessageCircle, Moon, ShieldCheck, UserRound } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import ThemeToggle from '@/components/ThemeToggle'
import LogoutButton from '@/components/LogoutButton'

const STORAGE_KEY = 'nia-settings'

type Preferences = {
  dataSaver: boolean
  autoplay: boolean
  notifications: boolean
  showOnline: boolean
}

const DEFAULTS: Preferences = { dataSaver: false, autoplay: true, notifications: true, showOnline: true }

function SettingToggle({ checked, onChange, label }: { checked: boolean; onChange: (next: boolean) => void; label: string }) {
  return <button type="button" className={`settings-toggle${checked ? ' is-on' : ''}`} role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)}><span /></button>
}

function SettingRow({ icon, title, description, children }: { icon: React.ReactNode; title: string; description: string; children: React.ReactNode }) {
  return <div className="settings-row"><div className="settings-row-icon">{icon}</div><div className="settings-row-copy"><p>{title}</p><span>{description}</span></div><div className="settings-row-control">{children}</div></div>
}

export default function SettingsPage() {
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [preferences, setPreferences] = useState<Preferences>(() => {
    if (typeof window === 'undefined') return DEFAULTS
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY)
      return stored ? { ...DEFAULTS, ...JSON.parse(stored) } : DEFAULTS
    } catch { return DEFAULTS }
  })
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ''))
  }, [supabase])

  function updatePreference(key: keyof Preferences, value: boolean) {
    const next = { ...preferences, [key]: value }
    setPreferences(next)
    try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next)) } catch { /* non-blocking */ }
    setSaved(true)
    window.setTimeout(() => setSaved(false), 1600)
  }

  return <main className="settings-page">
    <div className="settings-heading"><Link href="/profile" className="settings-back" aria-label="Back to profile"><ArrowLeft size={18} /></Link><div><p className="home-eyebrow">Your space</p><h1>Settings</h1><p>Shape Nia around how you connect, learn, and contribute.</p></div></div>

    <section className="settings-card settings-account-card"><div className="settings-account-avatar"><UserRound size={22} /></div><div className="settings-account-copy"><strong>Account & profile</strong><span>{email || 'Your Nia account'}</span></div><Link href="/profile/edit" className="settings-outline-button">Edit profile <ChevronRight size={15} /></Link></section>

    <section className="settings-section" aria-labelledby="settings-preferences"><div className="settings-section-heading"><h2 id="settings-preferences">Your experience</h2><span>{saved ? 'Saved on this device' : 'Private by default'}</span></div><div className="settings-card">
      <SettingRow icon={<Moon size={18} />} title="Appearance" description="Choose light, dark, or follow your device."><ThemeToggle /></SettingRow>
      <SettingRow icon={<Bell size={18} />} title="Notifications" description="Stay informed about messages and Circle activity."><SettingToggle checked={preferences.notifications} onChange={value => updatePreference('notifications', value)} label="Toggle notifications" /></SettingRow>
      <SettingRow icon={<Gauge size={18} />} title="Data saver" description="Use less data by reducing video preloading and media loading."><SettingToggle checked={preferences.dataSaver} onChange={value => updatePreference('dataSaver', value)} label="Toggle data saver" /></SettingRow>
      <SettingRow icon={<Eye size={18} />} title="Flicks autoplay" description="Start videos automatically when they enter view."><SettingToggle checked={preferences.autoplay} onChange={value => updatePreference('autoplay', value)} label="Toggle Flicks autoplay" /></SettingRow>
      <SettingRow icon={<Globe2 size={18} />} title="Online status" description="Let people in your Circles see when you are active."><SettingToggle checked={preferences.showOnline} onChange={value => updatePreference('showOnline', value)} label="Toggle online status" /></SettingRow>
    </div></section>

    <section className="settings-section" aria-labelledby="settings-community"><div className="settings-section-heading"><h2 id="settings-community">Community & safety</h2><span>Help Nia feel welcoming</span></div><div className="settings-card">
      <Link href="/notifications" className="settings-link-row"><span className="settings-row-icon"><MessageCircle size={18} /></span><span><strong>Notification centre</strong><small>Review Circle updates, replies, and messages.</small></span><ChevronRight size={16} /></Link>
      <Link href="/moderation" className="settings-link-row"><span className="settings-row-icon"><ShieldCheck size={18} /></span><span><strong>Report & moderation</strong><small>Find help with safety, reports, and community standards.</small></span><ChevronRight size={16} /></Link>
      <Link href="/profile/verify" className="settings-link-row"><span className="settings-row-icon"><Lock size={18} /></span><span><strong>Verification</strong><small>Manage identity verification for trusted participation.</small></span><ChevronRight size={16} /></Link>
    </div></section>

    <section className="settings-card settings-logout-card"><div><strong>Ready to take a break?</strong><span>You can always return to your Circles later.</span></div><LogoutButton /></section>
    <p className="settings-footnote">Nia is built for thoughtful participation. Your settings are designed to keep your attention, data, and choices in your hands.</p>
  </main>
}

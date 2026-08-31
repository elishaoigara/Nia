'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ChevronRight, MessageCircle, Moon, ShieldCheck, UserRound } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import ThemeToggle from '@/components/ThemeToggle'
import LogoutButton from '@/components/LogoutButton'

function SettingRow({ icon, title, description, children }: { icon: React.ReactNode; title: string; description: string; children: React.ReactNode }) {
  return <div className="settings-row"><div className="settings-row-icon">{icon}</div><div className="settings-row-copy"><p>{title}</p><span>{description}</span></div><div className="settings-row-control">{children}</div></div>
}

export default function SettingsPage() {
  const supabase = createClient()
  const [email, setEmail] = useState('')

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? ''))
  }, [supabase])

  return <main className="settings-page">
    <div className="settings-heading"><Link href="/profile" className="settings-back" aria-label="Back to profile"><ArrowLeft size={18} /></Link><div><p className="home-eyebrow">Your space</p><h1>Settings</h1><p>Shape Nia around how you connect, learn, and contribute.</p></div></div>

    <section className="settings-card settings-account-card"><div className="settings-account-avatar"><UserRound size={22} /></div><div className="settings-account-copy"><strong>Account & profile</strong><span>{email || 'Your Nia account'}</span></div><Link href="/profile/edit" className="settings-outline-button">Edit profile <ChevronRight size={15} /></Link></section>

    <section className="settings-section" aria-labelledby="settings-preferences"><div className="settings-section-heading"><h2 id="settings-preferences">Your experience</h2><span>Applied across Nia</span></div><div className="settings-card">
      <SettingRow icon={<Moon size={18} />} title="Appearance" description="Choose light, dark, or follow your device."><ThemeToggle /></SettingRow>
    </div></section>

    <section className="settings-section" aria-labelledby="settings-community"><div className="settings-section-heading"><h2 id="settings-community">Community & safety</h2><span>Help Nia feel welcoming</span></div><div className="settings-card">
      <Link href="/notifications" className="settings-link-row"><span className="settings-row-icon"><MessageCircle size={18} /></span><span><strong>Notification centre</strong><small>Review Circle updates, replies, and messages.</small></span><ChevronRight size={16} /></Link>
      <Link href="/safety" className="settings-link-row"><span className="settings-row-icon"><ShieldCheck size={18} /></span><span><strong>Safety & support</strong><small>Review muted and blocked accounts or get help with a report.</small></span><ChevronRight size={16} /></Link>
    </div></section>

    <section className="settings-card settings-logout-card"><div><strong>Ready to take a break?</strong><span>You can always return to your Circles later.</span></div><LogoutButton /></section>
    <p className="settings-footnote">Nia is built for thoughtful participation. Your settings are designed to keep your attention, data, and choices in your hands.</p>
  </main>
}

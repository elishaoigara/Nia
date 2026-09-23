import type { Metadata } from 'next'
import Link from 'next/link'
import PublicPage from '@/components/PublicPage'

export const metadata: Metadata = { title: 'Privacy notice', alternates: { canonical: '/privacy' } }

export default function Page() {
  return <PublicPage><main className="public-copy"><h1>Privacy notice</h1>
<p>This notice describes how Nia uses information to provide its social features. You choose what to share in your profile and posts.</p>
<h2>Information used by Nia</h2><p>Nia processes your email and authentication information, profile details, interests, posts, uploaded media, messages, interactions, preferences, and reports. Hosting and authentication services also process technical information needed to serve requests, maintain sessions, and investigate errors or abuse.</p>
<h2>Why this information is used</h2><p>Your information supports account access, content delivery, community recommendations, messaging, notifications, moderation, and account controls. Your browser stores session cookies and preferences so you can stay signed in and keep your settings. Some composition drafts are stored locally on your device.</p>
<h2>Who can see your content</h2><p>Visibility depends on your account, audience, and Circle settings. Messages are shared with conversation participants. Recipients can copy or capture content, including disappearing media; do not treat these features as a guarantee that a copy cannot be kept. Moderation reports and relevant content may be reviewed to address concerns.</p>
<h2>Services that process information</h2><p>Nia uses Vercel for web hosting and Supabase for authentication, database, storage, and realtime features. When you request an AI caption or translation, the content needed for that request is sent to the configured AI service, Anthropic. Information may be processed outside your country. Optional GIF search uses Tenor when configured.</p>
<h2>Your choices</h2><p>Use <Link href="/settings">Settings</Link> to manage preferences, export account data, or delete your account. You can edit your profile and remove your own content. Deleting an account also removes Circles you own. Backups and service logs may persist separately from the live account; deletion is not an instant purge of every backup or a copy held by another person.</p>
<h2>Questions about your information</h2><p>Visit <Link href="/help">Help &amp; support</Link> for account and reporting guidance.</p>
  </main></PublicPage>
}

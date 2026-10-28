import type { Metadata } from 'next'
import Link from 'next/link'
import PublicPage from '@/components/PublicPage'

export const metadata: Metadata = { title: 'Terms of use', alternates: { canonical: '/terms' } }

export default function Page() {
  return <PublicPage><main className="public-copy"><h1>Terms of use</h1>
<p>These terms describe the expectations for using Nia. Read them alongside our <Link href="/privacy">privacy notice</Link> and <Link href="/community-guidelines">community guidelines</Link>.</p>
<h2>Your account</h2><p>Use an email address you control. Keep your password secure and do not impersonate another person or share access to someone else’s account. You are responsible for activity you carry out through your account.</p>
<h2>Content you share</h2><p>You keep ownership of the content you create. By uploading it, you allow Nia to store, process, and display it to provide the features and audience settings you choose. Only share content you have the right to use, and respect other people’s privacy and intellectual property.</p>
<h2>Respect the community</h2><p>Do not use Nia for harassment, threats, exploitation, fraud, spam, or unlawful activity. Do not attempt to access another person’s data, bypass access controls, or disrupt the service.</p>
<h2>Moderation and account access</h2><p>Content and accounts may be restricted or removed for violations. Use the reporting tools for concerns and the appeals tools in <Link href="/safety">Safety &amp; support</Link> to request review of moderation actions.</p>
<h2>Availability and leaving Nia</h2><p>Features may change and the service may be interrupted. Keep your own copies of important content. You can export your account data and delete your account in <Link href="/settings">Settings</Link>; review the deletion notice before confirming.</p>
<h2>Questions</h2><p>See <Link href="/help">Help &amp; support</Link> for account assistance and reporting options.</p>
  </main></PublicPage>
}

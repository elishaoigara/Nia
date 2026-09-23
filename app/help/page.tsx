import type { Metadata } from 'next'
import Link from 'next/link'
import PublicPage from '@/components/PublicPage'

export const metadata: Metadata = { title: 'Help & support', alternates: { canonical: '/help' } }

export default function Page() {
  return <PublicPage><main className="public-copy"><h1>Help &amp; support</h1>
<p>New to Nia or having trouble? Start here.</p>
<h2>Create your account</h2><p><Link href="/signup">Sign up with your email</Link>, open your confirmation email, then choose a handle and your interests. Check your spam folder if the email hasn’t arrived. You can request another confirmation link on the signup page.</p>
<h2>Can’t sign in?</h2><p><Link href="/forgot-password">Reset your password</Link>. Use the latest email link; older links may have expired. If a confirmation link fails, request a new one. Never share your password or confirmation link.</p>
<h2>Use Nia on your phone</h2><p>Open niaapp.app in your browser. On Android, use your browser menu and choose Install app or Add to Home screen when available. On iPhone, open Safari, tap Share, then Add to Home Screen. This opens the web version; it is not the native mobile app.</p>
<h2>Report something or manage your boundaries</h2><p>Use the report option in a post, comment, profile, or conversation menu. Reports go to the moderation queue. You can also mute or block accounts and manage them in <Link href="/safety">Safety &amp; support</Link>. Read our <Link href="/community-guidelines">community guidelines</Link>.</p>
<h2>Manage your data</h2><p>Go to <Link href="/settings">Settings</Link> to change preferences, export account data, or request permanent account deletion. Deletion also removes Circles you own and their content; review this before confirming.</p>
<h2>Something isn’t working?</h2><p>Try refreshing the page and checking your connection. For a bug report, include the page, what you expected, and what happened. Remove private conversations, passwords, and sign-in links from screenshots.</p>
{process.env.NEXT_PUBLIC_SUPPORT_EMAIL && <p>Contact <a href={`mailto:${process.env.NEXT_PUBLIC_SUPPORT_EMAIL}`}>{process.env.NEXT_PUBLIC_SUPPORT_EMAIL}</a>.</p>}
  </main></PublicPage>
}

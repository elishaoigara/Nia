import type { Metadata } from 'next'
import Link from 'next/link'
import PublicPage from '@/components/PublicPage'

export const metadata: Metadata = { title: 'Community guidelines', alternates: { canonical: '/community-guidelines' } }

export default function Page() {
  return <PublicPage><main className="public-copy"><h1>Community guidelines</h1>
<p>Nia is a place to connect across interests, cultures, and experiences. Help keep that space welcoming.</p>
<h2>Respect people</h2><p>Disagree with ideas without harassing, threatening, or dehumanising people. Hate, targeted abuse, and encouragement of violence do not belong here.</p>
<h2>Protect privacy and safety</h2><p>Do not share someone’s private information, intimate content without consent, or content that exploits children. Never pressure another person to share private images or personal details.</p>
<h2>Be honest</h2><p>Do not impersonate people, run scams, manipulate engagement, or send repeated unwanted promotions. Make the nature of an opportunity or promotion clear.</p>
<h2>Share responsibly</h2><p>Respect copyright and only upload content you have permission to share. Avoid graphic violence and content that encourages dangerous or unlawful acts.</p>
<h2>Report, mute, or block</h2><p>Use a content or profile menu to report a concern. You can mute or block accounts without engaging with them. Reports are sent to the moderation queue. If you face an immediate threat, contact local emergency services rather than waiting for an in-app response.</p>
<h2>Review and appeals</h2><p>Moderation can result in content removal or account restrictions. Use <Link href="/safety">Safety &amp; support</Link> to review your controls and submit an available appeal.</p>
  </main></PublicPage>
}

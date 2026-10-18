import Link from 'next/link'
import type { ReactNode } from 'react'
import ThemeToggle from '@/components/ThemeToggle'

export function PublicFooter() {
  return <footer className="public-footer"><span>Nia · Africa connects here.</span><nav aria-label="Information" className="public-links"><Link href="/help">Help</Link><Link href="/community-guidelines">Community guidelines</Link><Link href="/privacy">Privacy</Link><Link href="/terms">Terms</Link></nav></footer>
}

export default function PublicPage({ children }: { children: ReactNode }) {
  return <div className="public-page"><div className="public-shell">
    <header className="public-header"><Link href="/" className="public-brand" aria-label="Nia home"><img src="/logo/nia-icon.svg" width={36} height={36} alt=""/>Nia</Link><nav aria-label="Welcome" className="public-links"><ThemeToggle/><Link href="/help">Get help</Link><Link href="/login" className="btn-ghost">Sign in</Link></nav></header>
    {children}
    <PublicFooter/>
  </div></div>
}

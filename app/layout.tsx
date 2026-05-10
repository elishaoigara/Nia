import type { Metadata, Viewport } from 'next'
import './globals.css'
import Navbar from '@/components/Navbar'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Nia — Your campus, your circle',
  description: 'Connect with your campus community on Nia.',
  manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Nia' },
}

export const viewport: Viewport = {
  themeColor: '#A855F7',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {user && <Navbar />}
        <div className={user ? 'sm:pl-60 pt-14 pb-nav sm:pb-6' : ''}>
          {children}
        </div>
      </body>
    </html>
  )
}

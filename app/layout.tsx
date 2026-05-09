import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Navbar from '@/components/Navbar'
import { createClient } from '@/lib/supabase/server'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Nia',
  description: 'Your campus. Your circle. Your Nia.',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const authPages = ['/login', '/signup', '/onboarding']
  const isAuthPage = authPages.some(p =>
    typeof window === 'undefined' ? false : window.location.pathname.startsWith(p)
  )

  return (
    <html lang="en">
      <body className={inter.className}>
        {user && <Navbar />}
        <div className={user ? 'sm:pl-56 pt-14 pb-20 sm:pb-6' : ''}>
          {children}
        </div>
      </body>
    </html>
  )
}
import './globals.css'
import type { Metadata } from 'next'
import { ThemeProvider } from '@/components/ThemeProvider'
import Navbar from '@/components/Navbar'

export const metadata: Metadata = {
  title: 'Nia',
  description: 'A social platform for Africa',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <Navbar />
          <main className="sm:pl-60 pt-14 pb-(--nav-bottom,64px) sm:pb-0 min-h-screen">
            {children}
          </main>
        </ThemeProvider>
      </body>
    </html>
  )
}
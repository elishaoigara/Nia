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
      <body className="bg-[#0b0c10] antialiased">
        <ThemeProvider>
          <Navbar />
          
          {/* Main flex container pushes past the desktop sidebar width smoothly */}
          <main
            className="sm:pl-60 pt-16 min-h-screen w-full"
            style={{ paddingBottom: 'var(--nav-bottom)' }}
          >
            <div className="w-full">
              {children}
            </div>
          </main>
        </ThemeProvider>
      </body>
    </html>
  )
}
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
            className="sm:pl-64 pt-16 min-h-screen w-full flex justify-start"
            style={{ paddingBottom: 'var(--nav-bottom)' }}
          >
            {/* This inner layout wrapper balances the layout feed framework. 
              Using flex-1 ensures it snaps right next to your sidebar with 0 empty gaps.
            */}
            <div className="w-full max-w-7xl px-4 md:px-6 py-4 flex-1 min-w-0">
              {children}
            </div>
          </main>
        </ThemeProvider>
      </body>
    </html>
  )
}
import type { Metadata, Viewport } from 'next'
import './globals.css'
import Navbar from '@/components/Navbar'
import { ThemeProvider } from '@/components/ThemeProvider'
import SplashScreen from '@/components/SplashScreen'
import { getAppUrl } from '@/lib/app-url'

export const metadata: Metadata = {
  metadataBase: new URL(getAppUrl()),
  applicationName: 'Nia',
  title: {
    default: 'Nia — Africa Connects Here',
    template: '%s | Nia',
  },
  description: 'A mobile-first, pan-African social platform.',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/icon.png',
    apple: '/apple-icon.png',
  },
  openGraph: {
    type: 'website',
    siteName: 'Nia',
    title: 'Nia — Africa Connects Here',
    description: 'A mobile-first, pan-African social platform.',
    images: [{ url: '/logo/og-image.png', width: 1200, height: 630, alt: 'Nia' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Nia — Africa Connects Here',
    description: 'A mobile-first, pan-African social platform.',
    images: ['/logo/og-image.png'],
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#F9F8F6' },
    { media: '(prefers-color-scheme: dark)', color: '#0D0C0B' },
  ],
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-(--surface-0) text-(--text-primary) antialiased">
        <ThemeProvider>
          <SplashScreen />
          <Navbar />
          <div id="main-content" className="page-wrap">
            {children}
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}

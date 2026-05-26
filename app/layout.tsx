import './globals.css'
import Navbar from '@/components/Navbar'
import { ThemeProvider } from '@/components/ThemeProvider'

export const metadata = {
  title: 'Nia — Africa Connects Here',
  description: 'Pan-African social platform',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="bg-(--surface-0) text-(--text-primary) antialiased">
        <ThemeProvider>
          <Navbar />
          {/*
            page-wrap handles:
              mobile  → padding-top: nav-top,  padding-bottom: nav-bottom
              desktop → padding-left: sidebar-w, no bottom pad
            (all defined as CSS vars in globals.css)
          */}
          <div className="page-wrap">
            {children}
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}

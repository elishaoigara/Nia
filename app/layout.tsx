<<<<<<< HEAD
// app/layout.tsx
import './globals.css';
import Navbar from '@/components/Navbar';
import { ThemeProvider } from '@/components/ThemeProvider';

export const metadata = {
  title: 'Nia — Africa Connects Here',
  description: 'Pan‑African social media',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className="bg-[var(--surface-0)] text-[var(--text-primary)] antialiased"
      >
        <ThemeProvider>
          <Navbar />
          {/* Main app content – give it a left‑margin when the sidebar is visible */}
          <div className="page-transition pt-14 sm:pt-0 sm:pl-60">
=======
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
>>>>>>> 70a68ce (fix:331666133166613316661331666133888)
            {children}
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}

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
            {children}
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}

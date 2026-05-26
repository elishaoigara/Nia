import { Html, Head, Main, NextScript } from 'next/document';
import Navbar from '../components/Navbar';
import '../styles/globals.css';

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <Head>
        <title>Nia — Africa Connects Here</title>
        <meta name="description" content="Pan-African social media" />
      </Head>
      <body className="bg-[var(--surface-0)] text-[var(--text-primary)] antialiased">
        <Navbar />
        <div className="page-transition">
          <Main>{children}</Main>
        </div>
        <NextScript />
      </body>
    </html>
  );
}

import { defineConfig } from 'vite'
import { fileURLToPath } from 'node:url'
import { mkdirSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
const root = fileURLToPath(new URL('../../', import.meta.url))
const here = fileURLToPath(new URL('./', import.meta.url))
mkdirSync(here + 'public', { recursive: true })
// VP9 is supported by the open-source Chromium build used in CI.
execFileSync('ffmpeg', ['-loglevel', 'error', '-f', 'lavfi', '-i', 'testsrc2=s=180x320:d=12:r=10', '-c:v', 'libvpx-vp9', '-deadline', 'realtime', '-cpu-used', '8', '-pix_fmt', 'yuv420p', '-y', here + 'public/fixture.webm'])
export default defineConfig({
  root: here,
  publicDir: root + 'public',
  esbuild: { jsx: 'automatic' },
  resolve: { alias: [
    { find: '@/lib/supabase/client', replacement: here + 'supabase.js' },
    { find: 'next/navigation', replacement: here + 'navigation.js' },
    { find: 'next/link', replacement: here + 'link.jsx' },
    { find: '@', replacement: root },
  ] },
  define: {
    'process.env.NEXT_PUBLIC_SUPABASE_URL': JSON.stringify('http://127.0.0.1:54321'),
    'process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY': JSON.stringify('layout-fixture-key'),
  },
  server: { host: '127.0.0.1', port: 4178, fs: { allow: [root] } },
})

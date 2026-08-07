import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Nia — Africa Connects Here',
    short_name: 'Nia',
    description: 'A mobile-first, pan-African social platform.',
    start_url: '/',
    display: 'standalone',
    background_color: '#F9F8F6',
    theme_color: '#5B21B6',
    icons: [
      { src: '/logo/nia-icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/logo/nia-icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  }
}

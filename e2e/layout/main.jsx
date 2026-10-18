import { createRoot } from 'react-dom/client'
import '../../app/globals.css'
import Flicks from '../../app/flicks/FlicksClient'
import Messages from '../../app/messages/page'
import Settings from '../../app/settings/page'
import Notifications from '../../app/notifications/page'
import PostCard from '../../components/PostCard'
import Navbar from '../../components/Navbar'
import { PreferencesProvider } from '../../components/PreferencesProvider'
import { ThemeProvider } from '../../components/ThemeProvider'
import DialogAccessibility from '../../components/DialogAccessibility'
import { creator } from './supabase'
import fixtureVideo from './public/fixture.webm?url'
const poster = 'data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="720" height="1280"><defs><linearGradient id="g" x2="1" y2="1"><stop stop-color="#a78bfa"/><stop offset=".5" stop-color="#243855"/><stop offset="1" stop-color="#d0a792"/></linearGradient></defs><path fill="url(#g)" d="M0 0h720v1280H0z"/><circle fill="#ffffff30" cx="480" cy="400" r="230"/><text x="48" y="620" fill="white" font-family="sans-serif" font-size="54">Nairobi after hours</text></svg>')
const videos = Array.from({ length: 4 }, (_, i) => ({ id: String(i + 1), user_id: 'creator', content: i === 0 ? 'A little Nairobi energy. '.repeat(50) : 'Good people. Great stories. #Nia', media_url: fixtureVideo, thumbnail_url: poster, media_type: 'video', video_duration: i === 3 ? 165 : 30, created_at: '2026-10-17T18:00:00Z', language: 'Swahili', profiles: creator, likes: [], comments: [], post_views: [] }))
const screen = new URLSearchParams(location.search).get('screen') ?? 'flicks'
createRoot(document.getElementById('root')).render(<ThemeProvider><PreferencesProvider><DialogAccessibility /><Navbar /><div className="page-wrap">
{screen === 'flicks' ? <Flicks shorts={videos.slice(0, 3)} longs={videos.slice(3)} currentUserId="viewer" circleIds={[]} followingIds={[]} /> : screen === 'inbox' ? <Messages /> : screen === 'settings' ? <Settings /> : screen === 'notifications' ? <Notifications /> : <main className="feed-col"><PostCard post={{ ...videos[0], media_url: poster, media_type: 'image', extra_media: [{ url: poster, type: 'image' }], polls: [], reposts: [] }} currentUserId="viewer" /><PostCard post={videos[1]} currentUserId="viewer" /></main>}
</div></PreferencesProvider></ThemeProvider>)

'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import PostCard from '@/components/PostCard'
import FollowButton from '@/components/FollowButton'
import LogoutButton from '@/components/LogoutButton'
import {
  ArrowLeft, MapPin, Calendar, Pencil,
  Grid3x3, MessageCircle, Bookmark,
  Loader2, Link as LinkIcon, Globe, Languages,
} from 'lucide-react'
import { getFlag } from '@/lib/african-data'

const BASE_SELECT = `
  *,
  profiles:user_id (id, username, full_name, avatar_url, country, city),
  circles:circle_id (id, name, slug),
  likes (user_id),
  comments (id),
  reposts (user_id),
  polls (id, question, options, ends_at)
`

type Tab = 'posts' | 'replies' | 'saved'

function timeJoined(date: string) {
  return new Date(date).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
}

// Skyline SVGs for African cities — simple silhouettes as inline SVG data URIs
const CITY_SKYLINES: Record<string, string> = {
  Nairobi: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 200" preserveAspectRatio="none">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="%23120a2e"/>
          <stop offset="100%" stop-color="%231a0f3a"/>
        </linearGradient>
      </defs>
      <rect width="800" height="200" fill="url(%23sky)"/>
      <!-- Stars -->
      <circle cx="50" cy="20" r="1" fill="white" opacity="0.8"/>
      <circle cx="120" cy="35" r="0.8" fill="white" opacity="0.6"/>
      <circle cx="200" cy="15" r="1.2" fill="white" opacity="0.9"/>
      <circle cx="320" cy="25" r="0.7" fill="white" opacity="0.7"/>
      <circle cx="450" cy="10" r="1" fill="white" opacity="0.8"/>
      <circle cx="580" cy="30" r="0.9" fill="white" opacity="0.6"/>
      <circle cx="680" cy="18" r="1.1" fill="white" opacity="0.8"/>
      <circle cx="740" cy="40" r="0.8" fill="white" opacity="0.5"/>
      <!-- KICC tower -->
      <rect x="370" y="40" width="18" height="140" fill="%231e1245" opacity="0.95"/>
      <rect x="374" y="30" width="10" height="20" fill="%231e1245"/>
      <rect x="377" y="20" width="4" height="15" fill="%232a1a5e"/>
      <rect x="363" y="100" width="32" height="8" fill="%23160d38"/>
      <!-- Tall office blocks -->
      <rect x="80" y="80" width="35" height="120" fill="%231a1040" opacity="0.9"/>
      <rect x="85" y="85" width="6" height="8" fill="%235b21b6" opacity="0.4"/>
      <rect x="96" y="85" width="6" height="8" fill="%235b21b6" opacity="0.3"/>
      <rect x="85" y="100" width="6" height="8" fill="%235b21b6" opacity="0.35"/>
      <rect x="130" y="95" width="28" height="105" fill="%23160e38" opacity="0.85"/>
      <rect x="170" y="70" width="40" height="130" fill="%231c1242" opacity="0.9"/>
      <rect x="175" y="75" width="8" height="10" fill="%235b21b6" opacity="0.4"/>
      <rect x="190" y="75" width="8" height="10" fill="%235b21b6" opacity="0.3"/>
      <rect x="430" y="60" width="45" height="140" fill="%231a1040" opacity="0.92"/>
      <rect x="435" y="65" width="8" height="10" fill="%235b21b6" opacity="0.35"/>
      <rect x="450" y="65" width="8" height="10" fill="%235b21b6" opacity="0.4"/>
      <rect x="435" y="82" width="8" height="10" fill="%235b21b6" opacity="0.3"/>
      <rect x="490" y="75" width="35" height="125" fill="%23160e38"/>
      <rect x="540" y="55" width="50" height="145" fill="%231e1245" opacity="0.9"/>
      <rect x="600" y="85" width="30" height="115" fill="%231a1040"/>
      <rect x="645" y="90" width="38" height="110" fill="%23160e38" opacity="0.88"/>
      <rect x="700" y="100" width="25" height="100" fill="%231a1040"/>
      <!-- Ground -->
      <rect x="0" y="185" width="800" height="15" fill="%230d0820" opacity="0.95"/>
      <!-- Glow at base of KICC -->
      <ellipse cx="379" cy="185" rx="60" ry="8" fill="%235b21b6" opacity="0.15"/>
    </svg>`,
  Lagos: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 200" preserveAspectRatio="none">
      <defs>
        <linearGradient id="sky2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="%230a1628"/>
          <stop offset="100%" stop-color="%23142038"/>
        </linearGradient>
      </defs>
      <rect width="800" height="200" fill="url(%23sky2)"/>
      <circle cx="100" cy="25" r="1" fill="white" opacity="0.7"/>
      <circle cx="250" cy="15" r="1.2" fill="white" opacity="0.8"/>
      <circle cx="500" cy="20" r="0.9" fill="white" opacity="0.6"/>
      <circle cx="700" cy="30" r="1" fill="white" opacity="0.75"/>
      <!-- Eko Atlantic style towers -->
      <rect x="60" y="50" width="50" height="150" fill="%230e1c35" opacity="0.95"/>
      <rect x="66" y="55" width="8" height="12" fill="%23fbbf24" opacity="0.3"/>
      <rect x="80" y="55" width="8" height="12" fill="%23fbbf24" opacity="0.25"/>
      <rect x="66" y="75" width="8" height="12" fill="%23fbbf24" opacity="0.2"/>
      <rect x="125" y="30" width="60" height="170" fill="%230c1830" opacity="0.9"/>
      <rect x="131" y="35" width="10" height="14" fill="%23fbbf24" opacity="0.3"/>
      <rect x="148" y="35" width="10" height="14" fill="%23fbbf24" opacity="0.25"/>
      <rect x="165" y="35" width="10" height="14" fill="%23fbbf24" opacity="0.2"/>
      <rect x="200" y="65" width="40" height="135" fill="%230e1c35"/>
      <rect x="260" y="45" width="55" height="155" fill="%23101f38" opacity="0.92"/>
      <rect x="330" y="20" width="70" height="180" fill="%230c1830" opacity="0.95"/>
      <rect x="337" y="25" width="12" height="16" fill="%23fbbf24" opacity="0.3"/>
      <rect x="356" y="25" width="12" height="16" fill="%23fbbf24" opacity="0.25"/>
      <rect x="375" y="25" width="12" height="16" fill="%23fbbf24" opacity="0.2"/>
      <rect x="415" y="55" width="45" height="145" fill="%230e1c35"/>
      <rect x="475" y="40" width="55" height="160" fill="%23101f38" opacity="0.9"/>
      <rect x="545" y="70" width="40" height="130" fill="%230c1830"/>
      <rect x="600" y="50" width="50" height="150" fill="%230e1c35" opacity="0.88"/>
      <rect x="665" y="80" width="35" height="120" fill="%23101f38"/>
      <rect x="715" y="60" width="45" height="140" fill="%230c1830" opacity="0.9"/>
      <rect x="0" y="188" width="800" height="12" fill="%23071020"/>
      <ellipse cx="360" cy="188" rx="80" ry="6" fill="%23fbbf24" opacity="0.1"/>
    </svg>`,
  Accra: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 200" preserveAspectRatio="none">
      <defs>
        <linearGradient id="sky3" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="%231a0a0a"/>
          <stop offset="100%" stop-color="%230a1a12"/>
        </linearGradient>
      </defs>
      <rect width="800" height="200" fill="url(%23sky3)"/>
      <circle cx="80" cy="20" r="1" fill="white" opacity="0.75"/>
      <circle cx="350" cy="12" r="1.1" fill="white" opacity="0.8"/>
      <circle cx="620" cy="25" r="0.9" fill="white" opacity="0.7"/>
      <!-- Independence Arch style -->
      <rect x="370" y="90" width="60" height="110" fill="%23101a12" opacity="0.95"/>
      <path d="M370 90 Q400 60 430 90" stroke="%23166534" stroke-width="3" fill="none" opacity="0.6"/>
      <rect x="395" y="70" width="10" height="25" fill="%23166534" opacity="0.5"/>
      <!-- Other buildings -->
      <rect x="50" y="70" width="45" height="130" fill="%230f1a10" opacity="0.9"/>
      <rect x="110" y="55" width="55" height="145" fill="%230d1810"/>
      <rect x="180" y="80" width="35" height="120" fill="%230f1a10" opacity="0.88"/>
      <rect x="230" y="45" width="60" height="155" fill="%230d1810" opacity="0.92"/>
      <rect x="310" y="65" width="45" height="135" fill="%230f1a10"/>
      <rect x="450" y="50" width="55" height="150" fill="%230d1810" opacity="0.9"/>
      <rect x="520" y="75" width="40" height="125" fill="%230f1a10" opacity="0.88"/>
      <rect x="575" y="55" width="50" height="145" fill="%230d1810"/>
      <rect x="640" y="85" width="38" height="115" fill="%230f1a10" opacity="0.9"/>
      <rect x="692" y="65" width="45" height="135" fill="%230d1810"/>
      <rect x="0" y="186" width="800" height="14" fill="%23060d08"/>
    </svg>`,
  default: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 200" preserveAspectRatio="none">
      <defs>
        <linearGradient id="skyD" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="%230d0820"/>
          <stop offset="60%" stop-color="%23180f35"/>
          <stop offset="100%" stop-color="%230f1428"/>
        </linearGradient>
      </defs>
      <rect width="800" height="200" fill="url(%23skyD)"/>
      <!-- Stars -->
      <circle cx="40" cy="18" r="1" fill="white" opacity="0.8"/>
      <circle cx="150" cy="30" r="0.8" fill="white" opacity="0.6"/>
      <circle cx="280" cy="12" r="1.1" fill="white" opacity="0.85"/>
      <circle cx="420" cy="22" r="0.9" fill="white" opacity="0.7"/>
      <circle cx="560" cy="8" r="1" fill="white" opacity="0.8"/>
      <circle cx="700" cy="28" r="0.8" fill="white" opacity="0.65"/>
      <!-- Generic African city silhouette -->
      <rect x="40" y="85" width="30" height="115" fill="%23130b30" opacity="0.9"/>
      <rect x="85" y="65" width="40" height="135" fill="%230f0928" opacity="0.95"/>
      <rect x="140" y="75" width="50" height="125" fill="%23130b30" opacity="0.88"/>
      <rect x="205" y="50" width="35" height="150" fill="%230f0928"/>
      <!-- Central landmark tower -->
      <rect x="260" y="35" width="20" height="165" fill="%231a0f40" opacity="0.95"/>
      <rect x="264" y="25" width="12" height="15" fill="%231a0f40"/>
      <rect x="267" y="15" width="6" height="14" fill="%235b21b6" opacity="0.6"/>
      <rect x="253" y="95" width="34" height="6" fill="%23130b30"/>
      <rect x="295" y="60" width="45" height="140" fill="%230f0928" opacity="0.9"/>
      <rect x="355" y="70" width="38" height="130" fill="%23130b30"/>
      <rect x="408" y="45" width="52" height="155" fill="%230f0928" opacity="0.92"/>
      <rect x="415" y="50" width="8" height="10" fill="%235b21b6" opacity="0.35"/>
      <rect x="430" y="50" width="8" height="10" fill="%235b21b6" opacity="0.3"/>
      <rect x="415" y="67" width="8" height="10" fill="%235b21b6" opacity="0.25"/>
      <rect x="475" y="80" width="35" height="120" fill="%23130b30" opacity="0.88"/>
      <rect x="525" y="55" width="48" height="145" fill="%230f0928"/>
      <rect x="588" y="70" width="40" height="130" fill="%23130b30" opacity="0.9"/>
      <rect x="643" y="85" width="32" height="115" fill="%230f0928"/>
      <rect x="690" y="60" width="44" height="140" fill="%23130b30" opacity="0.88"/>
      <rect x="0" y="186" width="800" height="14" fill="%23080515"/>
      <ellipse cx="270" cy="186" rx="50" ry="7" fill="%235b21b6" opacity="0.2"/>
    </svg>`,
}

function getCitySkyline(city?: string | null, country?: string | null): string {
  if (city && CITY_SKYLINES[city]) return CITY_SKYLINES[city]
  if (country === 'Nigeria' || country === 'NG') return CITY_SKYLINES.Lagos
  if (country === 'Ghana' || country === 'GH') return CITY_SKYLINES.Accra
  if (country === 'Kenya' || country === 'KE') return CITY_SKYLINES.Nairobi
  return CITY_SKYLINES.default
}

// Profile strength calculation
function calcStrength(profile: any): { score: number; missing: string[] } {
  const checks = [
    { done: !!profile.avatar_url,  label: 'Add a profile photo' },
    { done: !!profile.banner_url,  label: 'Add a cover photo' },
    { done: !!profile.bio,         label: 'Write a bio' },
    { done: !!profile.full_name,   label: 'Add your full name' },
    { done: !!profile.city || !!profile.country, label: 'Add your location' },
    { done: !!profile.website,     label: 'Add a website' },
  ]
  const done = checks.filter(c => c.done).length
  return {
    score: Math.round((done / checks.length) * 100),
    missing: checks.filter(c => !c.done).map(c => c.label).slice(0, 2),
  }
}

// Parse interests/tags from bio or dedicated field
function parseTags(profile: any): string[] {
  const tags: string[] = []
  if (profile.interests) {
    if (Array.isArray(profile.interests)) tags.push(...profile.interests)
    else if (typeof profile.interests === 'string')
      tags.push(...profile.interests.split(',').map((t: string) => t.trim()).filter(Boolean))
  }
  // Extract hashtags from bio as fallback
  if (tags.length === 0 && profile.bio) {
    const found = profile.bio.match(/#\w+/g) ?? []
    tags.push(...found.map((t: string) => t.slice(1)))
  }
  return tags.slice(0, 6)
}

export default function ProfilePage() {
  const { id }   = useParams() as { id: string }
  const router   = useRouter()
  const supabase = createClient()

  const [currentUserId,  setCurrentUserId]  = useState<string | null>(null)
  const [profile,        setProfile]        = useState<any>(null)
  const [posts,          setPosts]          = useState<any[]>([])
  const [replies,        setReplies]        = useState<any[]>([])
  const [saved,          setSaved]          = useState<any[]>([])
  const [tab,            setTab]            = useState<Tab>('posts')
  const [loading,        setLoading]        = useState(true)
  const [tabLoading,     setTabLoading]     = useState(false)
  const [followerCount,  setFollowerCount]  = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [isFollowing,    setIsFollowing]    = useState(false)
  const [postCount,      setPostCount]      = useState(0)

  const isOwner = currentUserId === id

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null))
  }, []) // eslint-disable-line

  useEffect(() => {
    if (!id) return
    setLoading(true)
    Promise.all([
      supabase.from('profiles').select('*').eq('id', id).single(),
      supabase.from('follows').select('follower_id', { count: 'exact', head: true }).eq('following_id', id),
      supabase.from('follows').select('following_id', { count: 'exact', head: true }).eq('follower_id', id),
      supabase.from('posts').select('id', { count: 'exact', head: true }).eq('user_id', id),
    ]).then(([profileRes, followersRes, followingRes, postsRes]) => {
      setProfile(profileRes.data)
      setFollowerCount(followersRes.count ?? 0)
      setFollowingCount(followingRes.count ?? 0)
      setPostCount(postsRes.count ?? 0)
      setLoading(false)
    })
  }, [id]) // eslint-disable-line

  useEffect(() => {
    if (!currentUserId || !id || currentUserId === id) return
    supabase.from('follows').select('follower_id')
      .eq('follower_id', currentUserId).eq('following_id', id)
      .maybeSingle().then(({ data }) => setIsFollowing(!!data))
  }, [currentUserId, id]) // eslint-disable-line

  useEffect(() => {
    if (!id) return
    supabase.from('posts').select(BASE_SELECT).eq('user_id', id)
      .order('created_at', { ascending: false }).limit(30)
      .then(({ data }) => setPosts(data ?? []))
  }, [id]) // eslint-disable-line

  const loadReplies = useCallback(async () => {
    if (replies.length > 0) return
    setTabLoading(true)
    const { data } = await supabase.from('comments').select(`
      *, profiles:user_id (id, username, full_name, avatar_url),
      posts:post_id (*, profiles:user_id (id, username, full_name, avatar_url))
    `).eq('user_id', id).order('created_at', { ascending: false }).limit(30)
    setReplies(data ?? [])
    setTabLoading(false)
  }, [id, replies.length]) // eslint-disable-line

  const loadSaved = useCallback(async () => {
    if (saved.length > 0) return
    setTabLoading(true)
    const { data } = await supabase.from('bookmarks').select(`
      post_id,
      posts:post_id (
        *, profiles:user_id (id, username, full_name, avatar_url, country, city),
        circles:circle_id (id, name, slug),
        likes (user_id), comments (id), reposts (user_id),
        polls (id, question, options, ends_at)
      )
    `).eq('user_id', currentUserId!).order('created_at', { ascending: false }).limit(30)
    setSaved((data ?? []).map((b: any) => b.posts).filter(Boolean))
    setTabLoading(false)
  }, [currentUserId, saved.length]) // eslint-disable-line

  function handleTabChange(t: Tab) {
    setTab(t)
    if (t === 'replies') loadReplies()
    if (t === 'saved')   loadSaved()
  }

  function handlePostDelete(postId: string) {
    setPosts(prev => prev.filter(p => p.id !== postId))
    setSaved(prev => prev.filter(p => p.id !== postId))
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
      <Loader2 size={26} className="animate-spin" style={{ color: 'var(--nia-violet)' }} />
    </div>
  )

  if (!profile) return (
    <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-tertiary)' }}>User not found.</div>
  )

  const initials     = (profile.full_name ?? profile.username ?? '?').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()
  const countryFlag  = profile.country ? getFlag(profile.country) : null
  const tags         = parseTags(profile)
  const strength     = calcStrength(profile)

  // Banner: uploaded > city skyline SVG
  const skylineSvg  = getCitySkyline(profile.city, profile.country)
  const skylineUri  = `data:image/svg+xml,${skylineSvg.trim().replace(/\s+/g, ' ')}`
  const bannerStyle = profile.banner_url
    ? `url(${profile.banner_url}) center/cover no-repeat`
    : `url("${skylineUri}") center/cover no-repeat`

  // Gradient ring colors per country hue
  const hue = ((profile.country?.charCodeAt(0) ?? 75) * 23 + (profile.username?.charCodeAt(0) ?? 65) * 7) % 360
  const ringGradient = `conic-gradient(from 0deg, hsl(${hue},80%,55%), hsl(${(hue+90)%360},70%,65%), hsl(${(hue+180)%360},75%,55%), hsl(${hue},80%,55%))`

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', minHeight: '100vh' }}>

      {/* ── Sticky top bar ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '8px 12px',
        position: 'sticky', top: 'var(--nav-top)',
        background: 'var(--surface-0)',
        zIndex: 20, borderBottom: '1px solid var(--divider)',
      }}>
        <button onClick={() => router.back()} style={{
          width: 34, height: 34, borderRadius: '50%', border: 'none',
          background: 'var(--surface-2)', cursor: 'pointer',
          color: 'var(--text-primary)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <ArrowLeft size={17} strokeWidth={2.5} />
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontWeight: 800, fontSize: 14, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {profile.full_name ?? profile.username}
          </p>
          <p style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: 0 }}>{postCount} posts</p>
        </div>
        {isOwner && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <Link href="/profile/edit" style={{
              padding: '6px 14px', borderRadius: 20, fontSize: 13, fontWeight: 700,
              border: '1.5px solid var(--border)', background: 'none',
              color: 'var(--text-primary)', textDecoration: 'none',
              display: 'flex', alignItems: 'center', gap: 5,
            }}>
              <Pencil size={12} /> Edit
            </Link>
            <LogoutButton
              variant="icon"
              className="border"
              style={{ border: '1.5px solid var(--border)' }}
            />
          </div>
        )}
      </div>

      {/* ── Banner ── */}
      <div style={{ position: 'relative' }}>
        <div style={{
          height: 190,
          background: bannerStyle,
          position: 'relative',
        }}>
          {/* Atmospheric label when using skyline */}
          {!profile.banner_url && (
            <div style={{
              position: 'absolute', bottom: 10, right: 12,
              fontSize: 10, fontWeight: 600, letterSpacing: '0.8px',
              color: 'rgba(255,255,255,0.45)',
              textTransform: 'uppercase',
            }}>
              {profile.city ?? profile.country ?? 'Africa'} skyline
            </div>
          )}
          {/* Bottom gradient fade */}
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, height: 90,
            background: 'linear-gradient(to top, var(--surface-0) 0%, transparent 100%)',
            pointerEvents: 'none',
          }} />
        </div>

        {/* ── Avatar with gradient ring + country badge ── */}
        <div style={{
          position: 'absolute', bottom: -44, left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          zIndex: 2,
        }}>
          {/* Gradient ring */}
          <div style={{
            width: 108, height: 108, borderRadius: '50%',
            padding: 3,
            background: ringGradient,
            boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
            position: 'relative',
          }}>
            <div style={{
              width: '100%', height: '100%', borderRadius: '50%',
              background: 'var(--grad-brand)',
              overflow: 'hidden',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 800, fontSize: 32,
              border: '3px solid var(--surface-0)',
            }}>
              {profile.avatar_url
                ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : initials
              }
            </div>
            {/* Country badge */}
            {countryFlag && (
              <div style={{
                position: 'absolute', bottom: 4, right: 2,
                fontSize: 18, lineHeight: 1,
                background: 'var(--surface-0)',
                borderRadius: '50%',
                width: 28, height: 28,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                border: '2px solid var(--surface-0)',
              }}>
                {countryFlag}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Profile info card ── */}
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        paddingTop: 56, paddingBottom: 4, paddingLeft: 16, paddingRight: 16,
      }}>
        {/* Name — heavy weight */}
        <h1 style={{ fontWeight: 900, fontSize: 22, margin: '0 0 2px', textAlign: 'center', letterSpacing: '-0.3px' }}>
          {profile.full_name ?? profile.username}
        </h1>

        {/* Username — light weight */}
        <p style={{ fontWeight: 400, fontSize: 14, color: 'var(--text-tertiary)', margin: '0 0 4px' }}>
          @{profile.username}
        </p>

        {/* Role / headline — medium weight */}
        {profile.headline && (
          <p style={{ fontWeight: 500, fontSize: 13, color: 'var(--text-secondary)', margin: '0 0 12px', textAlign: 'center' }}>
            {profile.headline}
          </p>
        )}

        {/* Follow / Message */}
        {!isOwner && currentUserId && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 16, marginTop: 4 }}>
            <FollowButton targetUserId={id} currentUserId={currentUserId} initialIsFollowing={isFollowing} />
            <Link href={`/messages/${id}`} style={{
              padding: '7px 18px', borderRadius: 20,
              border: '1.5px solid var(--border)',
              background: 'var(--surface-2)',
              color: 'var(--text-primary)',
              fontWeight: 700, fontSize: 13, textDecoration: 'none',
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <MessageCircle size={13} /> Message
            </Link>
          </div>
        )}

        {/* Bio */}
        {profile.bio && (
          <p style={{
            fontSize: 14, lineHeight: 1.65, color: 'var(--text-primary)',
            textAlign: 'center', maxWidth: 400, margin: '0 0 16px', fontWeight: 400,
          }}>
            {profile.bio}
          </p>
        )}

        {/* Interest tags */}
        {tags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center', marginBottom: 16 }}>
            {tags.map(tag => (
              <span key={tag} style={{
                fontSize: 12, fontWeight: 600, padding: '4px 10px',
                borderRadius: 20,
                background: 'rgba(91,33,182,0.09)',
                color: 'var(--nia-violet)',
                border: '1px solid rgba(91,33,182,0.15)',
              }}>
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Meta pills */}
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 6, marginBottom: 20 }}>
          {(profile.city || profile.country) && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              fontSize: 12, fontWeight: 500,
              color: 'var(--text-tertiary)',
              background: 'var(--surface-2)',
              borderRadius: 20, padding: '4px 10px',
            }}>
              <MapPin size={11} />
              {[profile.city, profile.country].filter(Boolean).join(', ')}
            </span>
          )}
          {profile.created_at && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              fontSize: 12, fontWeight: 500,
              color: 'var(--text-tertiary)',
              background: 'var(--surface-2)',
              borderRadius: 20, padding: '4px 10px',
            }}>
              <Calendar size={11} />
              Joined {timeJoined(profile.created_at)}
            </span>
          )}
          {profile.website && (
            <a href={profile.website} target="_blank" rel="noopener noreferrer" style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              fontSize: 12, fontWeight: 600,
              color: 'var(--nia-violet)',
              background: 'rgba(91,33,182,0.07)',
              border: '1px solid rgba(91,33,182,0.12)',
              borderRadius: 20, padding: '4px 10px',
              textDecoration: 'none',
            }}>
              <LinkIcon size={11} />
              {profile.website.replace(/^https?:\/\//, '')}
            </a>
          )}
          {/* Languages */}
          {profile.languages && (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 5,
              fontSize: 12, fontWeight: 500,
              color: 'var(--text-tertiary)',
              background: 'var(--surface-2)',
              borderRadius: 20, padding: '4px 10px',
            }}>
              <Languages size={11} />
              {Array.isArray(profile.languages) ? profile.languages.join(' · ') : profile.languages}
            </span>
          )}
        </div>

        {/* ── Stats glass card ── */}
        <div style={{
          display: 'flex', width: '100%', maxWidth: 380,
          borderRadius: 18,
          background: 'var(--surface-1)',
          border: '1px solid var(--divider)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          overflow: 'hidden',
          marginBottom: 20,
          boxShadow: '0 2px 20px rgba(0,0,0,0.06)',
        }}>
          {[
            { label: 'Posts',     value: postCount },
            { label: 'Following', value: followingCount },
            { label: 'Followers', value: followerCount },
          ].map((stat, i) => (
            <div key={stat.label} style={{
              flex: 1, textAlign: 'center', padding: '14px 8px',
              borderRight: i < 2 ? '1px solid var(--divider)' : 'none',
            }}>
              <div style={{ fontWeight: 800, fontSize: 22, lineHeight: 1, letterSpacing: '-0.5px' }}>
                {stat.value >= 1000 ? `${(stat.value / 1000).toFixed(1)}k` : stat.value}
              </div>
              <div style={{
                fontSize: 10, color: 'var(--text-tertiary)', fontWeight: 600,
                marginTop: 4, textTransform: 'uppercase', letterSpacing: '0.6px',
              }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>

        {/* ── African identity card ── */}
        {(profile.country || profile.languages) && (
          <div style={{
            width: '100%', maxWidth: 380,
            borderRadius: 16,
            background: 'var(--surface-1)',
            border: '1px solid var(--divider)',
            padding: '14px 16px',
            marginBottom: 20,
          }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.7px', margin: '0 0 10px' }}>
              Identity
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {profile.country && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: 'var(--surface-2)', borderRadius: 10, padding: '6px 10px',
                }}>
                  <span style={{ fontSize: 18 }}>{countryFlag ?? '🌍'}</span>
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{profile.country}</span>
                </div>
              )}
              {profile.city && (
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: 'var(--surface-2)', borderRadius: 10, padding: '6px 10px',
                }}>
                  <MapPin size={13} color="var(--text-tertiary)" />
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{profile.city}</span>
                </div>
              )}
              {profile.languages && (
                (Array.isArray(profile.languages) ? profile.languages : [profile.languages]).map((lang: string) => (
                  <div key={lang} style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    background: 'var(--surface-2)', borderRadius: 10, padding: '6px 10px',
                  }}>
                    <Globe size={13} color="var(--text-tertiary)" />
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{lang}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ── Profile strength (owner only) ── */}
        {isOwner && strength.score < 100 && (
          <div style={{
            width: '100%', maxWidth: 380,
            borderRadius: 16,
            background: 'var(--surface-1)',
            border: '1px solid var(--divider)',
            padding: '14px 16px',
            marginBottom: 20,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <p style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>Profile strength</p>
              <span style={{
                fontSize: 12, fontWeight: 800,
                color: strength.score >= 80 ? '#22c55e' : strength.score >= 50 ? '#f59e0b' : 'var(--nia-violet)',
              }}>
                {strength.score}%
              </span>
            </div>
            {/* Progress bar */}
            <div style={{ height: 6, borderRadius: 6, background: 'var(--surface-3)', overflow: 'hidden', marginBottom: 10 }}>
              <div style={{
                height: '100%', borderRadius: 6,
                width: `${strength.score}%`,
                background: strength.score >= 80 ? 'linear-gradient(90deg, #22c55e, #16a34a)'
                  : strength.score >= 50 ? 'linear-gradient(90deg, #f59e0b, #d97706)'
                  : 'var(--grad-brand)',
                transition: 'width 0.6s ease',
              }} />
            </div>
            {strength.missing.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {strength.missing.map(item => (
                  <Link key={item} href="/profile/edit" style={{
                    fontSize: 12, color: 'var(--nia-violet)', textDecoration: 'none',
                    display: 'flex', alignItems: 'center', gap: 4, fontWeight: 500,
                  }}>
                    <span style={{ fontSize: 9 }}>●</span> {item}
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Tabs ── */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid var(--divider)',
        position: 'sticky',
        top: 'calc(var(--nav-top) + 51px)',
        background: 'var(--surface-0)',
        zIndex: 9,
      }}>
        {(([
          { key: 'posts',   icon: <Grid3x3 size={14} />,      label: 'Posts' },
          { key: 'replies', icon: <MessageCircle size={14} />, label: 'Replies' },
          ...(isOwner ? [{ key: 'saved', icon: <Bookmark size={14} />, label: 'Saved' }] : []),
        ]) as { key: Tab; icon: React.ReactNode; label: string }[]).map(t => (
          <button key={t.key} onClick={() => handleTabChange(t.key)} style={{
            flex: 1, padding: '13px 8px',
            border: 'none', background: 'none', cursor: 'pointer',
            fontWeight: tab === t.key ? 700 : 500, fontSize: 13,
            color: tab === t.key ? 'var(--text-primary)' : 'var(--text-tertiary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
            borderBottom: tab === t.key ? '2px solid var(--nia-violet)' : '2px solid transparent',
            transition: 'color 0.15s, border-color 0.15s', fontFamily: 'inherit',
          }}>
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      {tabLoading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
          <Loader2 size={22} className="animate-spin" style={{ color: 'var(--nia-violet)' }} />
        </div>
      ) : (
        <>
          {tab === 'posts' && (
            posts.length === 0
              ? <EmptyState emoji="✍️" message="No posts yet" sub={isOwner ? "Share what's on your mind." : `@${profile.username} hasn't posted yet.`} />
              : posts.map(post => <PostCard key={post.id} post={post} currentUserId={currentUserId} onDelete={handlePostDelete} />)
          )}
          {tab === 'replies' && (
            replies.length === 0
              ? <EmptyState emoji="💬" message="No replies yet" />
              : replies.map((reply: any) => (
                  <div key={reply.id} style={{ borderBottom: '1px solid var(--divider)', padding: '14px 16px' }}>
                    {reply.posts && (
                      <Link href={`/posts/${reply.post_id}`} style={{ textDecoration: 'none' }}>
                        <div style={{ fontSize: 12, color: 'var(--text-tertiary)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 4 }}>
                          <MessageCircle size={11} /> Replying to @{reply.posts?.profiles?.username ?? 'unknown'}
                        </div>
                        {reply.posts?.content && (
                          <div style={{
                            fontSize: 13, color: 'var(--text-tertiary)',
                            borderLeft: '2px solid var(--divider)', paddingLeft: 10, marginBottom: 8,
                            overflow: 'hidden', display: '-webkit-box',
                            WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                          } as React.CSSProperties}>
                            {reply.posts.content}
                          </div>
                        )}
                      </Link>
                    )}
                    <p style={{ fontSize: 14, color: 'var(--text-primary)', margin: 0, lineHeight: 1.55 }}>{reply.content}</p>
                    {reply.media_url && (
                      <div style={{ marginTop: 8, borderRadius: 12, overflow: 'hidden', maxWidth: 280, border: '1px solid var(--divider)' }}>
                        {reply.media_type === 'video'
                          ? <video src={reply.media_url} controls style={{ width: '100%', display: 'block', maxHeight: 200, objectFit: 'cover' }} />
                          : <img src={reply.media_url} alt="" style={{ width: '100%', display: 'block', maxHeight: 200, objectFit: 'cover' }} />
                        }
                      </div>
                    )}
                    <span style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 6, display: 'block' }}>
                      {new Date(reply.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))
          )}
          {tab === 'saved' && isOwner && (
            saved.length === 0
              ? <EmptyState emoji="🔖" message="No saved posts" sub="Tap the bookmark icon on any post to save it here." />
              : saved.map(post => <PostCard key={post.id} post={post} currentUserId={currentUserId} onDelete={handlePostDelete} />)
          )}
        </>
      )}
    </div>
  )
}

function EmptyState({ emoji, message, sub }: { emoji?: string; message: string; sub?: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '56px 24px', gap: 6 }}>
      {emoji && <span style={{ fontSize: 36, marginBottom: 4 }}>{emoji}</span>}
      <p style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-primary)', margin: 0 }}>{message}</p>
      {sub && <p style={{ fontSize: 13, margin: 0, textAlign: 'center', color: 'var(--text-tertiary)' }}>{sub}</p>}
    </div>
  )
}
'use client'

import { useEffect, useRef, useState } from 'react'
import { Heart, MessageCircle, Share2, Volume2, VolumeX, Play } from 'lucide-react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { getFlag } from '@/lib/african-data'

export interface ReelPost {
  id: string
  content: string | null
  media_url: string
  created_at: string
  language: string | null
  profiles: { id: string; username: string; avatar_url: string | null; country: string | null } | null
  likes: { user_id: string }[]
  comments: { id: string }[]
}

interface ReelsClientProps {
  videos: ReelPost[]
  currentUserId: string
}

export default function NiaReelsClient({ videos, currentUserId }: ReelsClientProps) {
  const [activeIdx, setActiveIdx] = useState(0)
  const [muted, setMuted] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    function onScroll() {
      const reelHeight = window.innerHeight
      const idx = Math.round(el!.scrollTop / reelHeight)
      setActiveIdx(idx)
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  if (videos.length === 0) {
    return (
      <div className="fixed inset-0 flex flex-col" style={{ background: '#000' }}>
        <div
          className="flex items-center justify-between px-4"
          style={{ height: '56px', background: 'rgba(0,0,0,0.8)' }}
        >
          <Link href="/" className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-black text-sm"
              style={{ background: 'var(--grad-brand)' }}
            >
              N
            </div>
            <span className="text-white font-extrabold text-lg tracking-tight">Nia</span>
          </Link>
          <span
            className="text-xs font-bold px-3 py-1 rounded-full"
            style={{ background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.8)' }}
          >
            🎬 Reels
          </span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-3 px-8">
            <div className="text-5xl">🎬</div>
            <p className="text-white font-bold text-lg">No videos yet</p>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Be the first to share a video on Nia!
            </p>
            <Link
              href="/"
              className="inline-block mt-4 px-6 py-2.5 rounded-2xl text-sm font-bold text-white"
              style={{ background: 'var(--grad-brand)' }}
            >
              Go to feed
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0" style={{ background: '#000' }}>
      {/* ── Custom header ─────────────────────────────────── */}
      <div
        className="absolute top-0 left-0 right-0 z-50 flex items-center justify-between px-4"
        style={{
          height: '56px',
          background: 'linear-gradient(to bottom, rgba(0,0,0,0.75), transparent)',
          pointerEvents: 'none',
        }}
      >
        <Link href="/" className="flex items-center gap-2" style={{ pointerEvents: 'auto' }}>
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center text-white font-black text-sm"
            style={{ background: 'var(--grad-brand)' }}
          >
            N
          </div>
          <span className="text-white font-extrabold text-lg tracking-tight">Nia</span>
        </Link>
        <span
          className="text-xs font-bold px-3 py-1 rounded-full"
          style={{
            background: 'rgba(255,255,255,0.15)',
            color: 'rgba(255,255,255,0.9)',
            backdropFilter: 'blur(4px)',
            pointerEvents: 'none',
          }}
        >
          🎬 Reels
        </span>
      </div>

      {/* ── Scrollable reel stack ─────────────────────────── */}
      <div
        ref={containerRef}
        className="absolute inset-0 overflow-y-scroll"
        style={{
          scrollSnapType: 'y mandatory',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {videos.map((video, i) => (
          <ReelItem
            key={video.id}
            video={video}
            isActive={i === activeIdx}
            muted={muted}
            onToggleMute={() => setMuted(m => !m)}
            currentUserId={currentUserId}
          />
        ))}
      </div>
    </div>
  )
}

// ── Single reel item ──────────────────────────────────────────────────────────

function ReelItem({
  video, isActive, muted, onToggleMute, currentUserId,
}: {
  video: ReelPost
  isActive: boolean
  muted: boolean
  onToggleMute: () => void
  currentUserId: string
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [playing, setPlaying] = useState(false)
  const [liked, setLiked] = useState(video.likes?.some(l => l.user_id === currentUserId) ?? false)
  const [likeCount, setLikeCount] = useState(video.likes?.length ?? 0)
  const [progress, setProgress] = useState(0)
  const supabase = createClient()

  useEffect(() => {
    const v = videoRef.current
    if (!v) return
    if (isActive) {
      v.currentTime = 0
      v.play().then(() => setPlaying(true)).catch(() => {})
    } else {
      v.pause()
      setPlaying(false)
    }
  }, [isActive])

  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted
  }, [muted])

  function togglePlay() {
    const v = videoRef.current
    if (!v) return
    if (v.paused) { v.play(); setPlaying(true) }
    else { v.pause(); setPlaying(false) }
  }

  async function toggleLike() {
    if (liked) {
      setLiked(false); setLikeCount(c => c - 1)
      await supabase.from('likes').delete()
        .eq('post_id', video.id).eq('user_id', currentUserId)
    } else {
      setLiked(true); setLikeCount(c => c + 1)
      await supabase.from('likes').insert({ post_id: video.id, user_id: currentUserId })
    }
  }

  async function share() {
    const url = `${window.location.origin}/posts/${video.id}`
    if (navigator.share) {
      await navigator.share({ url })
    } else {
      await navigator.clipboard.writeText(url)
    }
  }

  const profile = video.profiles

  return (
    <div
      className="relative w-full flex items-center justify-center"
      style={{
        height: '100dvh',
        scrollSnapAlign: 'start',
        scrollSnapStop: 'always',
        background: '#000',
      }}
    >
      <video
        ref={videoRef}
        src={video.media_url}
        className="absolute inset-0 w-full h-full object-cover"
        loop
        playsInline
        muted={muted}
        preload="auto"
        onTimeUpdate={() => {
          const v = videoRef.current
          if (v && v.duration) setProgress((v.currentTime / v.duration) * 100)
        }}
        onClick={togglePlay}
      />

      {/* Gradient */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 50%, rgba(0,0,0,0.15) 100%)' }}
      />

      {/* Pause indicator */}
      {!playing && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(6px)' }}
          >
            <Play size={28} fill="white" color="white" style={{ marginLeft: 4 }} />
          </div>
        </div>
      )}

      {/* ── Right action rail ─────────────────────────────── */}
      <div className="absolute right-3 sm:right-8 bottom-24 sm:bottom-28 flex flex-col items-center gap-4 sm:gap-5">
        <Link href={`/profile/${profile?.id}`}>
          <div
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-full overflow-hidden"
            style={{ border: '2px solid white' }}
          >
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center text-white font-bold text-sm"
                style={{ background: 'var(--grad-brand)' }}
              >
                {profile?.username?.[0]?.toUpperCase() ?? '?'}
              </div>
            )}
          </div>
        </Link>

        <button onClick={toggleLike} className="flex flex-col items-center gap-1 active:scale-90 transition-transform">
          <div
            className="w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center rounded-full"
            style={{ background: 'rgba(255,255,255,0.12)' }}
          >
            <Heart size={20} fill={liked ? '#ff4d6d' : 'none'} color={liked ? '#ff4d6d' : 'white'} strokeWidth={1.8} />
          </div>
          <span className="text-white text-xs font-bold">{likeCount}</span>
        </button>

        <Link href={`/posts/${video.id}`} className="flex flex-col items-center gap-1">
          <div
            className="w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center rounded-full"
            style={{ background: 'rgba(255,255,255,0.12)' }}
          >
            <MessageCircle size={20} color="white" strokeWidth={1.8} />
          </div>
          <span className="text-white text-xs font-bold">{video.comments?.length ?? 0}</span>
        </Link>

        <button onClick={share} className="flex flex-col items-center gap-1 active:scale-90 transition-transform">
          <div
            className="w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center rounded-full"
            style={{ background: 'rgba(255,255,255,0.12)' }}
          >
            <Share2 size={18} color="white" strokeWidth={1.8} />
          </div>
          <span className="text-white text-xs font-bold">Share</span>
        </button>

        <button onClick={onToggleMute} className="active:scale-90 transition-transform">
          <div
            className="w-10 h-10 sm:w-11 sm:h-11 flex items-center justify-center rounded-full"
            style={{ background: 'rgba(255,255,255,0.12)' }}
          >
            {muted
              ? <VolumeX size={18} color="white" strokeWidth={1.8} />
              : <Volume2 size={18} color="white" strokeWidth={1.8} />
            }
          </div>
        </button>
      </div>

      {/* ── Bottom info ────────────────────────────────────── */}
      <div className="absolute bottom-16 sm:bottom-20 left-0 right-16 sm:right-24 px-4">
        <Link href={`/profile/${profile?.id}`} className="flex items-center gap-2 mb-1.5">
          <span className="text-white font-bold text-sm">
            @{profile?.username ?? 'unknown'}
          </span>
          {profile?.country && (
            <span className="text-base leading-none">{getFlag(profile.country)}</span>
          )}
        </Link>
        {video.content && (
          <p
            className="text-white text-sm leading-snug line-clamp-2"
            style={{ textShadow: '0 1px 4px rgba(0,0,0,0.6)' }}
          >
            {video.content}
          </p>
        )}
      </div>

      {/* Progress bar */}
      <div
        className="absolute bottom-10 sm:bottom-12 left-0 right-0 h-0.5"
        style={{ background: 'rgba(255,255,255,0.2)' }}
      >
        <div
          className="h-full"
          style={{ width: `${progress}%`, background: 'white', transition: 'width 0.1s linear' }}
        />
      </div>
    </div>
  )
}
'use client'

import { useEffect, useRef, useState } from 'react'
import { Play, Volume2, VolumeX } from 'lucide-react'

interface VideoPlayerProps {
  src: string
  poster?: string
  className?: string
}

export default function VideoPlayer({ src, poster, className = '' }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(true)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [tapped, setTapped] = useState(false) // user has tapped at least once

  // Pause when scrolled off screen — saves data on slow connections
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting && videoRef.current && !videoRef.current.paused) {
          videoRef.current.pause()
          setPlaying(false)
        }
      },
      { threshold: 0.25 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  function togglePlay() {
    const v = videoRef.current
    if (!v) return
    setTapped(true)
    if (v.paused) {
      v.play()
      setPlaying(true)
    } else {
      v.pause()
      setPlaying(false)
    }
  }

  function toggleMute() {
    const v = videoRef.current
    if (!v) return
    v.muted = !v.muted
    setMuted(v.muted)
  }

  function handleTimeUpdate() {
    const v = videoRef.current
    if (!v || !v.duration) return
    setProgress((v.currentTime / v.duration) * 100)
  }

  function handleLoadedMetadata() {
    const v = videoRef.current
    if (!v) return
    setDuration(v.duration)
  }

  function handleEnded() {
    setPlaying(false)
    setProgress(0)
  }

  function handleScrub(e: React.MouseEvent<HTMLDivElement>) {
    const v = videoRef.current
    if (!v || !v.duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    const ratio = (e.clientX - rect.left) / rect.width
    v.currentTime = ratio * v.duration
    setProgress(ratio * 100)
  }

  function fmt(s: number) {
    const m = Math.floor(s / 60)
    return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`
  }

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden rounded-2xl ${className}`}
      style={{ background: '#000', border: '1px solid var(--border)' }}
    >
      {/* Video element — preload=none means zero data until user taps */}
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        preload="none"
        muted={muted}
        playsInline
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onClick={togglePlay}
        className="w-full max-h-80 object-contain cursor-pointer"
        style={{ display: 'block' }}
      />

      {/* Tap-to-play overlay — shown until first tap */}
      {!playing && (
        <div
          onClick={togglePlay}
          className="absolute inset-0 flex items-center justify-center cursor-pointer"
          style={{ background: tapped ? 'rgba(0,0,0,0.25)' : 'rgba(0,0,0,0.35)' }}
        >
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center transition-transform active:scale-95"
            style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(6px)', border: '1.5px solid rgba(255,255,255,0.35)' }}
          >
            <Play size={22} fill="white" color="white" style={{ marginLeft: 3 }} />
          </div>
        </div>
      )}

      {/* Controls bar — shown after first tap */}
      {tapped && (
        <div
          className="absolute bottom-0 left-0 right-0 flex items-center gap-2 px-3 py-2"
          style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.65))' }}
        >
          {/* Mute toggle */}
          <button
            onClick={toggleMute}
            className="w-7 h-7 flex items-center justify-center rounded-full transition-all active:scale-90"
            style={{ background: 'rgba(255,255,255,0.15)' }}
          >
            {muted
              ? <VolumeX size={13} color="white" />
              : <Volume2 size={13} color="white" />
            }
          </button>

          {/* Scrub bar */}
          <div
            className="flex-1 h-1 rounded-full cursor-pointer"
            style={{ background: 'rgba(255,255,255,0.25)' }}
            onClick={handleScrub}
          >
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${progress}%`, background: 'rgba(255,255,255,0.9)' }}
            />
          </div>

          {/* Duration */}
          {duration > 0 && (
            <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: 11, fontVariantNumeric: 'tabular-nums', minWidth: 36, textAlign: 'right' }}>
              {fmt(duration)}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

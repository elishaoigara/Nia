'use client'

import { useEffect, useRef, useState } from 'react'
import { Play, Pause, Volume2, VolumeX, Maximize2 } from 'lucide-react'
import MediaLightbox from '@/components/MediaLightbox'

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
  const [currentTime, setCurrentTime] = useState(0)
  const [tapped, setTapped] = useState(false)
  const [lightbox, setLightbox] = useState(false)
  
  // Track if the video was intentionally playing before rolling past the viewport boundary
  const wasPlayingRef = useRef(false)

  // Explicit mutation bypasses React's virtual tree property mapping quirks
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = true
    }
  }, [])

  // Viewport intersection side-effects handler
  useEffect(() => {
    const element = containerRef.current
    if (!element) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        const video = videoRef.current
        if (!video) return

        if (!entry.isIntersecting) {
          // If it leaves viewport, track state, pause execution, and clear flags
          if (!video.paused) {
            wasPlayingRef.current = true
            video.pause()
            setPlaying(false)
          }
        } else {
          // If it re-enters viewport and was manually left playing, resume playback
          if (wasPlayingRef.current) {
            video.play().then(() => setPlaying(true)).catch(() => {})
            wasPlayingRef.current = false
          }
        }
      },
      { threshold: 0.25 }
    )

    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  function togglePlay() {
    const video = videoRef.current
    if (!video) return
    
    setTapped(true)
    wasPlayingRef.current = false // Reset intersection tracking flag on manual interaction

    if (video.paused) {
      video.play()
        .then(() => setPlaying(true))
        .catch((err) => console.warn("Playback interrupted or blocked:", err))
    } else {
      video.pause()
      setPlaying(false)
    }
  }

  function toggleMute() {
    const video = videoRef.current
    if (!video) return
    
    video.muted = !video.muted
    setMuted(video.muted)
  }

  function handleScrub(e: React.MouseEvent<HTMLDivElement>) {
    const video = videoRef.current
    if (!video || !video.duration) return
    
    const rect = e.currentTarget.getBoundingClientRect()
    const clickPositionPositionRatio = (e.clientX - rect.left) / rect.width
    video.currentTime = clickPositionPositionRatio * video.duration
    setCurrentTime(video.currentTime)
  }

  function fmt(seconds: number) {
    const minutes = Math.floor(seconds / 60)
    const remainder = Math.floor(seconds % 60)
    return `${minutes}:${String(remainder).padStart(2, '0')}`
  }

  return (
    <>
      <div
        ref={containerRef}
        className={`relative overflow-hidden rounded-2xl bg-black border border-(--border) ${className}`}
      >
        {/* HTML Canvas Video Node */}
        <video
          ref={videoRef}
          src={src}
          poster={poster}
          preload="none"
          playsInline
          onTimeUpdate={() => {
            const video = videoRef.current
            if (video && video.duration) {
              setCurrentTime(video.currentTime)
              setProgress((video.currentTime / video.duration) * 100)
            }
          }}
          onLoadedMetadata={() => {
            if (videoRef.current) setDuration(videoRef.current.duration)
          }}
          onEnded={() => {
            setPlaying(false)
            setProgress(0)
            setCurrentTime(0)
            setTapped(false)
            wasPlayingRef.current = false
          }}
          onError={() => {
            setPlaying(false)
            wasPlayingRef.current = false
          }}
          onClick={togglePlay}
          className="w-full max-h-80 object-contain cursor-pointer block"
        />

        {/* Playback Intermission Overlay Button Trigger */}
        {!playing && (
          <div
            onClick={togglePlay}
            className={`absolute inset-0 flex items-center justify-center cursor-pointer transition-colors ${
              tapped ? 'bg-black/20' : 'bg-black/35'
            }`}
          >
            <div className="w-14 h-14 rounded-full flex items-center justify-center transition-transform active:scale-95 bg-white/20 backdrop-blur-md border border-white/35">
              <Play size={22} className="fill-white text-white ml-1" />
            </div>
          </div>
        )}

        {/* Controls Overlay Bar */}
        {tapped && (
          <div className="absolute bottom-0 left-0 right-0 flex items-center gap-2 px-3 py-3 bg-linear-to-t from-black/70 to-transparent">
            {/* Play/Pause Toggle Switch */}
            <button
              onClick={togglePlay}
              className="w-7 h-7 flex items-center justify-center rounded-full transition-all active:scale-90 shrink-0 bg-white/15"
              aria-label={playing ? "Pause video" : "Play video"}
            >
              {playing ? <Pause size={12} className="text-white fill-white" /> : <Play size={12} className="text-white fill-white ml-0.5" />}
            </button>

            {/* Mute Button Control Wrapper */}
            <button
              onClick={toggleMute}
              className="w-7 h-7 flex items-center justify-center rounded-full transition-all active:scale-90 shrink-0 bg-white/15"
              aria-label={muted ? "Unmute sound" : "Mute sound"}
            >
              {muted ? <VolumeX size={13} className="text-white" /> : <Volume2 size={13} className="text-white" />}
            </button>

            {/* Time Slider Timeline Scrub Container */}
            <div
              className="flex-1 h-1.5 rounded-full cursor-pointer bg-white/25 flex items-center group relative"
              onClick={handleScrub}
            >
              <div
                className="h-full rounded-full bg-white/90 relative"
                style={{ width: `${progress}%` }}
              >
                {/* Scrub head handle visual feedback node */}
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-white opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-1/2 shadow-sm" />
              </div>
            </div>

            {/* Live Counter Display */}
            {duration > 0 && (
              <span className="text-white/85 text-[11px] tabular-nums min-w-9 text-right font-medium">
                {fmt(currentTime)} / {fmt(duration)}
              </span>
            )}

            {/* Fullscreen Modal Portal Trigger */}
            <button
              onClick={e => {
                e.stopPropagation()
                videoRef.current?.pause()
                setPlaying(false)
                setLightbox(true)
              }}
              className="w-7 h-7 flex items-center justify-center rounded-full transition-all active:scale-90 shrink-0 bg-white/15"
              title="Expand window"
            >
              <Maximize2 size={13} className="text-white" />
            </button>
          </div>
        )}

        {/* Floating Quick Fullscreen Trigger before initial engagement */}
        {!tapped && (
          <button
            onClick={e => {
              e.stopPropagation()
              setLightbox(true)
            }}
            className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded-full transition-all active:scale-90 bg-black/45"
          >
            <Maximize2 size={13} className="text-white" />
          </button>
        )}
      </div>

      {/* Portal Lightbox Mount Render */}
      {lightbox && (
        <MediaLightbox
          items={[{ url: src, type: 'video' }]}
          onClose={() => setLightbox(false)}
        />
      )}
    </>
  )
}
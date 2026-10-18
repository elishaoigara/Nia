'use client'

import { mediaUrl } from '@/lib/media-url'
import { useCallback, useEffect, useRef, useState } from 'react'
import { X, ChevronLeft, ChevronRight, Play, Pause, Volume2, VolumeX } from 'lucide-react'

interface MediaItem {
  url: string
  type: 'image' | 'video'
}

interface MediaLightboxProps {
  items: MediaItem[]
  startIndex?: number
  onClose: () => void
}

export default function MediaLightbox({ items, startIndex = 0, onClose }: MediaLightboxProps) {
  const [idx, setIdx] = useState(startIndex)
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const videoRef = useRef<HTMLVideoElement>(null)

  const current = items[idx]

  const navigate = useCallback((direction: -1 | 1) => {
    setPlaying(false)
    setProgress(0)
    setDuration(0)
    setIdx(index => Math.max(0, Math.min(items.length - 1, index + direction)))
  }, [items.length])

  // Lock body scroll while open
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  // Close on Escape, arrow keys to navigate safely using functional state updates
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      if (e.target instanceof HTMLInputElement) return
      if (e.key === 'ArrowRight') navigate(1)
      if (e.key === 'ArrowLeft') navigate(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navigate, onClose])

  function prev() { navigate(-1) }
  function next() { navigate(1) }

  function togglePlay() {
    const v = videoRef.current
    if (!v) return
    if (v.paused) {
      void v.play().catch(() => setPlaying(false))
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

  function fmt(s: number) {
    if (isNaN(s)) return '0:00'
    const m = Math.floor(s / 60)
    return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`
  }

  return (
    <div
      role="dialog" aria-modal="true" aria-label="Media viewer"
      className="fixed inset-0 z-999 flex items-center justify-center select-none"
      style={{ background: 'rgba(0,0,0,0.95)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      {/* ── Close Button ────────────────────────────────── */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-50 w-11 h-11 flex items-center justify-center rounded-full text-white transition-all duration-150 tap-sm active:scale-90"
        style={{ background: 'rgba(255,255,255,0.12)' }}
        aria-label="Close lightbox"
      >
        <X size={20} />
      </button>

      {/* ── Image/Video Position Pagination Counter ────────── */}
      {items.length > 1 && (
        <div
          className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3.5 py-1 rounded-full text-xs font-bold text-white z-50"
          style={{ background: 'rgba(255,255,255,0.12)' }}
        >
          {idx + 1} / {items.length}
        </div>
      )}

      {/* ── Left Navigation Handle ───────────────────────── */}
      {idx > 0 && (
        <button
          onClick={e => { e.stopPropagation(); prev() }}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-50 w-11 h-11 flex items-center justify-center rounded-full text-white transition-all duration-150 tap-sm active:scale-90"
          style={{ background: 'rgba(255,255,255,0.12)' }}
          aria-label="Previous media"
        >
          <ChevronLeft size={24} />
        </button>
      )}

      {/* ── Right Navigation Handle ──────────────────────── */}
      {idx < items.length - 1 && (
        <button
          onClick={e => { e.stopPropagation(); next() }}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-50 w-11 h-11 flex items-center justify-center rounded-full text-white transition-all duration-150 tap-sm active:scale-90"
          style={{ background: 'rgba(255,255,255,0.12)' }}
          aria-label="Next media"
        >
          <ChevronRight size={24} />
        </button>
      )}

      {/* ── Active Presenter Layout Matrix ────────────────── */}
      <div
        className="relative flex items-center justify-center w-full h-full p-4 xs:p-8 md:p-16"
        onClick={e => e.stopPropagation()}
      >
        {current.type === 'image' ? (
          <img
            src={mediaUrl(current.url)}
            alt=""
            className="max-w-full max-h-full rounded-2xl object-contain select-none shadow-2xl"
            draggable={false}
          />
        ) : (
          <div className="relative w-full max-w-2xl flex flex-col items-center justify-center">
            <video
              ref={videoRef}
              src={mediaUrl(current.url)}
              className="w-full rounded-2xl object-contain shadow-2xl cursor-pointer"
              style={{ maxHeight: 'calc(100dvh - 200px)', background: '#000' }}
              muted={muted}
              playsInline
              onTimeUpdate={() => {
                const v = videoRef.current
                if (v && v.duration) setProgress((v.currentTime / v.duration) * 100)
              }}
              onLoadedMetadata={() => {
                if (videoRef.current) setDuration(videoRef.current.duration)
              }}
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onEnded={() => setPlaying(false)}
              onClick={togglePlay}
            />

            {/* ── Interactive Inline Media Controls Hud ───────── */}
            <div
              className="nia-lightbox-controls"
            >
              <button
                onClick={togglePlay}
                className="w-11 h-11 flex items-center justify-center rounded-full text-white shrink-0 transition-all duration-150 tap-sm active:scale-90"
                style={{ background: 'rgba(255,255,255,0.18)' }}
                aria-label={playing ? 'Pause' : 'Play'}
              >
                {playing ? (
                  <Pause size={15} fill="white" color="white" />
                ) : (
                  <Play size={15} fill="white" color="white" className="ml-0.5" />
                )}
              </button>

              {/* Progress Slider Track */}
              <input type="range" aria-label="Video position" min={0} max={100} step={0.1} value={progress} disabled={!duration} onChange={event => {
                if (!videoRef.current || !duration) return
                videoRef.current.currentTime = Number(event.target.value) / 100 * duration
                setProgress(Number(event.target.value))
              }} />

              {duration > 0 && (
                <span 
                  className="text-white/80 text-xs font-medium min-w-9 text-right tabular-nums"
                >
                  {fmt(duration)}
                </span>
              )}

              <button
                onClick={toggleMute}
                className="w-11 h-11 flex items-center justify-center rounded-full text-white shrink-0 transition-all duration-150 tap-sm active:scale-90"
                style={{ background: 'rgba(255,255,255,0.12)' }}
                aria-label={muted ? 'Unmute' : 'Mute'}
              >
                {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Secondary Carousel Dot Matrix ──────────────────── */}
      {items.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-50">
          {items.map((_, i) => (
            <button
              key={i}
              onClick={e => { e.stopPropagation(); setIdx(i) }}
              className="h-1.5 rounded-full transition-all duration-200"
              style={{
                width: i === idx ? '20px' : '6px',
                background: i === idx ? '#ffffff' : 'rgba(255,255,255,0.35)',
              }}
              aria-label={`Go to slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

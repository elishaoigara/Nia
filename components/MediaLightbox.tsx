'use client'

import { useEffect, useRef, useState } from 'react'
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
  const isVideo = current.type === 'video'

  // Lock body scroll while open
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  // Close on Escape, arrow keys to navigate
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight') next()
      if (e.key === 'ArrowLeft') prev()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, items.length])

  // Reset video state when switching slides
  useEffect(() => {
    setPlaying(false)
    setProgress(0)
    setDuration(0)
  }, [idx])

  function prev() { setIdx(i => Math.max(0, i - 1)) }
  function next() { setIdx(i => Math.min(items.length - 1, i + 1)) }

  function togglePlay() {
    const v = videoRef.current
    if (!v) return
    if (v.paused) { v.play(); setPlaying(true) }
    else { v.pause(); setPlaying(false) }
  }

  function toggleMute() {
    const v = videoRef.current
    if (!v) return
    v.muted = !v.muted
    setMuted(v.muted)
  }

  function handleScrub(e: React.MouseEvent<HTMLDivElement>) {
    const v = videoRef.current
    if (!v || !v.duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    v.currentTime = ((e.clientX - rect.left) / rect.width) * v.duration
  }

  function fmt(s: number) {
    const m = Math.floor(s / 60)
    return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`
  }

  return (
    <div
      className="fixed inset-0 z-999 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.95)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center rounded-full text-white transition-all active:scale-90"
        style={{ background: 'rgba(255,255,255,0.12)' }}
      >
        <X size={20} />
      </button>

      {/* Counter */}
      {items.length > 1 && (
        <div
          className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold text-white"
          style={{ background: 'rgba(255,255,255,0.12)' }}
        >
          {idx + 1} / {items.length}
        </div>
      )}

      {/* Prev */}
      {idx > 0 && (
        <button
          onClick={e => { e.stopPropagation(); prev() }}
          className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 flex items-center justify-center rounded-full text-white transition-all active:scale-90"
          style={{ background: 'rgba(255,255,255,0.12)' }}
        >
          <ChevronLeft size={22} />
        </button>
      )}

      {/* Next */}
      {idx < items.length - 1 && (
        <button
          onClick={e => { e.stopPropagation(); next() }}
          className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 flex items-center justify-center rounded-full text-white transition-all active:scale-90"
          style={{ background: 'rgba(255,255,255,0.12)' }}
        >
          <ChevronRight size={22} />
        </button>
      )}

      {/* Media */}
      <div
        className="relative flex items-center justify-center w-full h-full px-16 py-16"
        onClick={e => e.stopPropagation()}
      >
        {current.type === 'image' ? (
          <img
            src={current.url}
            alt=""
            className="max-w-full max-h-full rounded-2xl object-contain select-none"
            style={{ boxShadow: '0 32px 64px rgba(0,0,0,0.6)' }}
            draggable={false}
          />
        ) : (
          <div className="relative w-full max-w-2xl">
            <video
              ref={videoRef}
              src={current.url}
              className="w-full rounded-2xl object-contain"
              style={{ maxHeight: 'calc(100vh - 160px)', background: '#000' }}
              muted={muted}
              playsInline
              onTimeUpdate={() => {
                const v = videoRef.current
                if (v && v.duration) setProgress((v.currentTime / v.duration) * 100)
              }}
              onLoadedMetadata={() => {
                if (videoRef.current) setDuration(videoRef.current.duration)
              }}
              onEnded={() => setPlaying(false)}
              onClick={togglePlay}
            />

            {/* Video controls */}
            <div
              className="absolute bottom-0 left-0 right-0 flex items-center gap-3 px-4 py-3 rounded-b-2xl"
              style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.75))' }}
            >
              <button
                onClick={togglePlay}
                className="w-9 h-9 flex items-center justify-center rounded-full text-white shrink-0 transition-all active:scale-90"
                style={{ background: 'rgba(255,255,255,0.18)' }}
              >
                {playing
                  ? <Pause size={16} fill="white" color="white" />
                  : <Play size={16} fill="white" color="white" style={{ marginLeft: 2 }} />
                }
              </button>

              {/* Scrub */}
              <div
                className="flex-1 h-1.5 rounded-full cursor-pointer"
                style={{ background: 'rgba(255,255,255,0.25)' }}
                onClick={handleScrub}
              >
                <div
                  className="h-full rounded-full"
                  style={{ width: `${progress}%`, background: 'white' }}
                />
              </div>

              {duration > 0 && (
                <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, minWidth: 36, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                  {fmt(duration)}
                </span>
              )}

              <button
                onClick={toggleMute}
                className="w-8 h-8 flex items-center justify-center rounded-full text-white shrink-0 transition-all active:scale-90"
                style={{ background: 'rgba(255,255,255,0.12)' }}
              >
                {muted ? <VolumeX size={15} /> : <Volume2 size={15} />}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Dot indicators */}
      {items.length > 1 && (
        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-1.5">
          {items.map((_, i) => (
            <button
              key={i}
              onClick={e => { e.stopPropagation(); setIdx(i) }}
              className="rounded-full transition-all"
              style={{
                width: i === idx ? 20 : 6,
                height: 6,
                background: i === idx ? 'white' : 'rgba(255,255,255,0.35)',
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
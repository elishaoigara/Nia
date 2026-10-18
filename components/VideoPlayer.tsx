'use client'

import { usePreferences } from '@/components/PreferencesProvider'
import { mediaUrl } from '@/lib/media-url'
import { useEffect, useRef, useState } from 'react'
import { Play, Pause, Volume2, VolumeX, Maximize2 } from 'lucide-react'
import MediaLightbox from '@/components/MediaLightbox'

interface VideoPlayerProps {
  src: string
  poster?: string
  className?: string
  onProgress?: (currentTime: number, duration: number) => void
  paused?: boolean
}

export default function VideoPlayer({ src, poster, className = '', onProgress, paused = false }: VideoPlayerProps) {
  const { preferences } = usePreferences()
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const wasPlayingRef = useRef(false)
  const [playing, setPlaying] = useState(false)
  const [muted, setMuted] = useState(true)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [lightbox, setLightbox] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => { if (paused) videoRef.current?.pause() }, [paused])

  useEffect(() => {
    const element = containerRef.current
    if (!element) return
    const observer = new IntersectionObserver(([entry]) => {
      const video = videoRef.current
      if (!video) return
      if (!entry.isIntersecting) {
        wasPlayingRef.current = !video.paused
        video.pause()
      } else if (wasPlayingRef.current && !document.hidden && preferences.autoplay && !preferences.data_saver) {
        void video.play().catch(() => {})
        wasPlayingRef.current = false
      }
    }, { threshold: 0.25 })
    const pauseWhenHidden = () => { if (document.hidden) videoRef.current?.pause() }
    observer.observe(element)
    document.addEventListener('visibilitychange', pauseWhenHidden)
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', pauseWhenHidden) }
  }, [preferences.autoplay, preferences.data_saver])

  function togglePlay() {
    const video = videoRef.current
    if (!video) return
    wasPlayingRef.current = false
    if (video.paused) void video.play().catch(() => setFailed(true))
    else video.pause()
  }

  function expand() {
    videoRef.current?.pause()
    wasPlayingRef.current = false
    setLightbox(true)
  }

  function fmt(seconds: number) {
    return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`
  }

  return <>
    <div ref={containerRef} className={`nia-video-player ${className}`}>
      <div className="nia-video-stage">
        <video ref={videoRef} src={mediaUrl(src)} poster={mediaUrl(poster)} preload={preferences.data_saver ? 'none' : 'metadata'} playsInline muted={muted}
          onPlay={() => { setPlaying(true); setFailed(false) }} onPause={() => setPlaying(false)}
          onLoadedMetadata={event => { if (Number.isFinite(event.currentTarget.duration)) setDuration(event.currentTarget.duration) }}
          onTimeUpdate={event => {
            const video = event.currentTarget
            setCurrentTime(video.currentTime)
            if (Number.isFinite(video.duration) && video.duration > 0) onProgress?.(video.currentTime, video.duration)
          }}
          onEnded={event => { setPlaying(false); onProgress?.(event.currentTarget.duration, event.currentTarget.duration) }}
          onError={() => { setPlaying(false); setFailed(true) }} onClick={togglePlay}
        />
        {!playing && <button type="button" className="nia-video-start" aria-label="Play video" onClick={togglePlay}><Play size={26} fill="currentColor" /></button>}
      </div>
      <div className="nia-video-controls">
        <input aria-label="Video position" type="range" min={0} max={duration || 1} step={0.1} value={Math.min(currentTime, duration || 1)} disabled={!duration}
          onChange={event => {
            if (!videoRef.current) return
            videoRef.current.currentTime = Number(event.target.value)
            setCurrentTime(Number(event.target.value))
          }} />
        <button type="button" onClick={togglePlay} aria-label={playing ? 'Pause video' : 'Play video'}>{playing ? <Pause size={18} /> : <Play size={18} />}</button>
        <button type="button" onClick={() => setMuted(value => !value)} aria-label={muted ? 'Unmute sound' : 'Mute sound'}>{muted ? <VolumeX size={18} /> : <Volume2 size={18} />}</button>
        <span>{fmt(currentTime)} / {fmt(duration)}</span>
        <button type="button" onClick={expand} aria-label="Expand video"><Maximize2 size={18} /></button>
      </div>
      {failed && <p role="status" className="nia-video-error">This video could not play. <button type="button" onClick={() => { videoRef.current?.load(); setFailed(false) }}>Retry</button></p>}
    </div>
    {lightbox && <MediaLightbox items={[{ url: src, type: 'video' }]} onClose={() => setLightbox(false)} />}
  </>
}

'use client'

import { mediaUrl } from '@/lib/media-url'
import { useState, useRef, useEffect } from 'react'
import { Mic, Square, Trash2, Play, Pause } from 'lucide-react'

interface VoiceRecorderProps {
  onRecorded: (blob: Blob, durationMs: number) => void
  onClear: () => void
}

export default function VoiceRecorder({ onRecorded, onClear }: VoiceRecorderProps) {
  const [state, setState] = useState<'idle' | 'recording' | 'recorded'>('idle')
  const [duration, setDuration] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  
  const mrRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startRef = useRef(0)

  // Clean memory leaks on component unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (audioUrl) URL.revokeObjectURL(audioUrl)
    }
  }, [audioUrl])

  // Explicitly sync audio playback when state mutations occur
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    if (isPlaying) {
      audio.play().catch(() => setIsPlaying(false))
    } else {
      audio.pause()
    }
  }, [isPlaying])

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream)
      
      mrRef.current = mr
      chunksRef.current = []
      
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        const dur = Date.now() - startRef.current
        const url = URL.createObjectURL(blob)
        
        setAudioUrl(url)
        setDuration(dur)
        setState('recorded')
        onRecorded(blob, dur)
        
        // Kill hardware mic activity lines cleanly
        stream.getTracks().forEach(t => t.stop())
      }
      
      mr.start()
      startRef.current = Date.now()
      setState('recording')
      timerRef.current = setInterval(() => setDuration(Date.now() - startRef.current), 100)
    } catch (err) {
      console.error('Microphone allocation failure:', err)
      alert('Microphone access denied or unsupported by browser framework environment.')
    }
  }

  function stopRecording() {
    if (timerRef.current) clearInterval(timerRef.current)
    mrRef.current?.stop()
  }

  function handleClear() {
    if (audioUrl) URL.revokeObjectURL(audioUrl)
    setAudioUrl(null)
    setDuration(0)
    setState('idle')
    setIsPlaying(false)
    onClear()
  }

  const fmt = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const remainderSeconds = totalSeconds % 60
    return `${minutes}:${String(remainderSeconds).padStart(2, '0')}`
  }

  // --- Render Conditional Branches ---

  if (state === 'idle') {
    return (
      <button
        type="button"
        onClick={startRecording}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all active:scale-95 bg-(--surface-2) text-(--text-secondary) hover:brightness-105"
      >
        <Mic size={17} />
        <span className="hidden xs:inline">Voice</span>
      </button>
    )
  }

  if (state === 'recording') {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20">
        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
        <span className="text-sm font-mono font-bold text-red-500">{fmt(duration)}</span>
        <button 
          type="button" 
          onClick={stopRecording} 
          className="w-7 h-7 rounded-lg flex items-center justify-center text-white bg-red-500 transition-all active:scale-90 hover:bg-red-600"
          aria-label="Stop recording"
        >
          <Square size={11} className="fill-current" />
        </button>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-linear-to-br from-red-500/10 to-purple-500/10 border border-purple-500/10">
      <button 
        type="button" 
        onClick={() => setIsPlaying(!isPlaying)} 
        className="w-7 h-7 rounded-full text-white flex items-center justify-center transition-all active:scale-90 bg-(--grad-brand) hover:opacity-90"
        aria-label={isPlaying ? "Pause voice note" : "Play voice note"}
      >
        {isPlaying ? <Pause size={11} className="fill-current" /> : <Play size={11} className="fill-current ml-0.5" />}
      </button>
      
      <span className="text-xs font-mono font-bold text-(--data-violet)">{fmt(duration)}</span>
      
      <button 
        type="button" 
        onClick={handleClear} 
        className="w-6 h-6 rounded-lg flex items-center justify-center transition-all active:scale-90 text-(--text-tertiary) hover:text-red-500"
        title="Delete recording"
      >
        <Trash2 size={13} />
      </button>

      {/* Persistent Audio Tag inside identical branch space guarantees element tracking safely */}
      <audio 
        ref={audioRef} 
        src={mediaUrl(audioUrl ?? '')}
        onEnded={() => setIsPlaying(false)} 
        className="hidden" 
        preload="auto"
      />
    </div>
  )
}
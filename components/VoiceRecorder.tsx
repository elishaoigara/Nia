'use client'
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

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current); if (audioUrl) URL.revokeObjectURL(audioUrl) }, [])

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream)
      mrRef.current = mr; chunksRef.current = []
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        const dur = Date.now() - startRef.current
        const url = URL.createObjectURL(blob)
        setAudioUrl(url); setDuration(dur); setState('recorded'); onRecorded(blob, dur)
        stream.getTracks().forEach(t => t.stop())
      }
      mr.start(); startRef.current = Date.now(); setState('recording')
      timerRef.current = setInterval(() => setDuration(Date.now() - startRef.current), 100)
    } catch { alert('Microphone access denied.') }
  }

  function stopRecording() { if (timerRef.current) clearInterval(timerRef.current); mrRef.current?.stop() }

  function togglePlay() {
    if (!audioRef.current || !audioUrl) return
    if (isPlaying) { audioRef.current.pause() } else { audioRef.current.play() }
    setIsPlaying(!isPlaying)
  }

  function handleClear() {
    if (audioUrl) URL.revokeObjectURL(audioUrl)
    setAudioUrl(null); setDuration(0); setState('idle'); setIsPlaying(false); onClear()
  }

  const fmt = (ms: number) => { const s = Math.floor(ms / 1000); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` }

  if (state === 'idle') return (
    <button
      type="button"
      onClick={startRecording}
      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all active:scale-90"
      style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}
    >
      <Mic size={17} />
      <span className="hidden xs:inline">Voice</span>
    </button>
  )

  if (state === 'recording') return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: 'rgba(239,68,68,0.08)' }}>
      <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
      <span className="text-sm font-mono font-bold text-red-500">{fmt(duration)}</span>
      <button type="button" onClick={stopRecording} className="w-7 h-7 rounded-lg flex items-center justify-center text-white transition-all active:scale-90" style={{ background: '#ef4444' }}>
        <Square size={11} fill="currentColor" />
      </button>
    </div>
  )

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: 'linear-gradient(135deg,rgba(255,107,107,0.1),rgba(168,85,247,0.1))' }}>
      <button type="button" onClick={togglePlay} className="w-7 h-7 rounded-full text-white flex items-center justify-center transition-all active:scale-90" style={{ background: 'var(--grad-brand)' }}>
        {isPlaying ? <Pause size={11} fill="currentColor" /> : <Play size={11} fill="currentColor" />}
      </button>
      <span className="text-xs font-mono font-bold" style={{ color: 'var(--nia-violet)' }}>{fmt(duration)}</span>
      <button type="button" onClick={handleClear} className="w-6 h-6 rounded-lg flex items-center justify-center transition-all active:scale-90" style={{ color: 'var(--text-tertiary)' }}>
        <Trash2 size={13} />
      </button>
      <audio ref={audioRef} src={audioUrl ?? ''} onEnded={() => setIsPlaying(false)} className="hidden" />
    </div>
  )
}

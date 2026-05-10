'use client'

import { useState, useRef, useEffect } from 'react'
import { Mic, Square, Trash2, Play, Pause, Upload } from 'lucide-react'

interface VoiceRecorderProps {
  onRecorded: (blob: Blob, durationMs: number) => void
  onClear: () => void
}

export default function VoiceRecorder({ onRecorded, onClear }: VoiceRecorderProps) {
  const [state, setState] = useState<'idle' | 'recording' | 'recorded'>('idle')
  const [duration, setDuration] = useState(0) // ms
  const [isPlaying, setIsPlaying] = useState(false)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startTimeRef = useRef<number>(0)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (audioUrl) URL.revokeObjectURL(audioUrl)
    }
  }, [])

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream)
      mediaRecorderRef.current = mr
      chunksRef.current = []

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }

      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        const dur = Date.now() - startTimeRef.current
        const url = URL.createObjectURL(blob)
        setAudioUrl(url)
        setDuration(dur)
        setState('recorded')
        onRecorded(blob, dur)
        stream.getTracks().forEach((t) => t.stop())
      }

      mr.start()
      startTimeRef.current = Date.now()
      setState('recording')

      timerRef.current = setInterval(() => {
        setDuration(Date.now() - startTimeRef.current)
      }, 100)
    } catch {
      alert('Microphone access denied. Please allow microphone access to record voice notes.')
    }
  }

  function stopRecording() {
    if (timerRef.current) clearInterval(timerRef.current)
    mediaRecorderRef.current?.stop()
  }

  function togglePlay() {
    if (!audioRef.current || !audioUrl) return
    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }
    setIsPlaying(!isPlaying)
  }

  function handleClear() {
    if (audioUrl) URL.revokeObjectURL(audioUrl)
    setAudioUrl(null)
    setDuration(0)
    setState('idle')
    setIsPlaying(false)
    onClear()
  }

  const formatDuration = (ms: number) => {
    const s = Math.floor(ms / 1000)
    const m = Math.floor(s / 60)
    return `${m}:${String(s % 60).padStart(2, '0')}`
  }

  return (
    <div className="flex items-center gap-3">
      {state === 'idle' && (
        <button
          type="button"
          onClick={startRecording}
          className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-red-500 transition-colors"
        >
          <Mic size={18} />
          <span>Voice</span>
        </button>
      )}

      {state === 'recording' && (
        <div className="flex items-center gap-3 bg-red-50 dark:bg-red-950/40 px-3 py-1.5 rounded-xl">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-sm font-mono text-red-500">{formatDuration(duration)}</span>
          <button
            type="button"
            onClick={stopRecording}
            className="p-1 rounded-lg bg-red-500 hover:bg-red-600 text-white transition-colors"
          >
            <Square size={12} fill="currentColor" />
          </button>
        </div>
      )}

      {state === 'recorded' && audioUrl && (
        <div className="flex items-center gap-2 bg-purple-50 dark:bg-purple-950/40 px-3 py-1.5 rounded-xl">
          <button
            type="button"
            onClick={togglePlay}
            className="p-1 rounded-full bg-purple-600 hover:bg-purple-700 text-white transition-colors"
          >
            {isPlaying ? <Pause size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" />}
          </button>
          <span className="text-xs font-mono text-purple-600">{formatDuration(duration)}</span>
          <button
            type="button"
            onClick={handleClear}
            className="p-1 rounded-lg text-zinc-400 hover:text-red-500 transition-colors"
          >
            <Trash2 size={13} />
          </button>
          <audio
            ref={audioRef}
            src={audioUrl}
            onEnded={() => setIsPlaying(false)}
            className="hidden"
          />
        </div>
      )}
    </div>
  )
}

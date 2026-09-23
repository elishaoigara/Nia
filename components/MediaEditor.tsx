'use client'

import { mediaUrl } from '@/lib/media-url'
import { useEffect, useId, useRef, useState } from 'react'
import {
  Check,
  FlipHorizontal2,
  Loader2,
  RotateCw,
  Scissors,
  SlidersHorizontal,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react'
import {
  ASPECT_RATIOS,
  DEFAULT_IMAGE_EDIT_SETTINGS,
  drawEditedImagePreview,
  exportEditedImage,
  formatMediaDuration,
  type CropAspect,
  type ImageEditSettings,
} from '@/lib/media-editing'

interface MediaEditorProps {
  file: File
  type: 'image' | 'video'
  duration?: number
  maxOutputBytes?: number
  onCancel: () => void
  onSave: (file: File, metadata: { duration?: number }) => void
}

const ASPECT_OPTIONS: { value: CropAspect; label: string }[] = [
  { value: 'original', label: 'Original' },
  { value: 'square', label: '1:1' },
  { value: 'portrait', label: '4:5' },
  { value: 'story', label: '9:16' },
  { value: 'wide', label: '16:9' },
]

function RangeControl({
  label,
  value,
  min,
  max,
  step = 1,
  suffix = '',
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  suffix?: string
  onChange: (value: number) => void
}) {
  return (
    <label style={{ display: 'grid', gridTemplateColumns: '92px minmax(0, 1fr) 48px', alignItems: 'center', gap: 10, fontSize: 12, color: 'var(--text-secondary)' }}>
      <span style={{ fontWeight: 700 }}>{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={event => onChange(Number(event.target.value))}
        style={{ width: '100%', accentColor: 'var(--nia-violet)' }}
      />
      <span style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'var(--text-tertiary)' }}>{Math.round(value)}{suffix}</span>
    </label>
  )
}

export default function MediaEditor({ file, type, duration, maxOutputBytes, onCancel, onSave }: MediaEditorProps) {
  const titleId = useId()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const initializedDurationRef = useRef(false)

  const [previewUrl] = useState(() => URL.createObjectURL(file))
  const [imageReady, setImageReady] = useState(false)
  const [settings, setSettings] = useState<ImageEditSettings>(DEFAULT_IMAGE_EDIT_SETTINGS)
  const [videoDuration, setVideoDuration] = useState(duration ?? 0)
  const [trimStart, setTrimStart] = useState(0)
  const [trimEnd, setTrimEnd] = useState(duration ?? 0)
  const [currentTime, setCurrentTime] = useState(0)
  const [mute, setMute] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')

  useEffect(() => {
    return () => URL.revokeObjectURL(previewUrl)
  }, [previewUrl])

  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !processing) onCancel()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [onCancel, processing])

  useEffect(() => {
    if (type !== 'image' || !previewUrl) return
    const image = new Image()
    image.decoding = 'async'
    image.onload = () => {
      imageRef.current = image
      setImageReady(true)
    }
    image.onerror = () => setError('This image could not be opened for editing.')
    image.src = previewUrl
    return () => {
      imageRef.current = null
      setImageReady(false)
    }
  }, [previewUrl, type])

  useEffect(() => {
    if (type !== 'image' || !imageReady || !imageRef.current || !canvasRef.current) return
    const frame = requestAnimationFrame(() => {
      try {
        drawEditedImagePreview(canvasRef.current!, imageRef.current!, settings)
      } catch (previewError) {
        setError(previewError instanceof Error ? previewError.message : 'The image preview could not be updated.')
      }
    })
    return () => cancelAnimationFrame(frame)
  }, [imageReady, settings, type])

  useEffect(() => {
    if (!videoDuration || initializedDurationRef.current) return
    initializedDurationRef.current = true
    setTrimEnd(videoDuration)
  }, [videoDuration])

  function updateSettings(patch: Partial<ImageEditSettings>) {
    setSettings(current => ({ ...current, ...patch }))
    setError('')
  }

  function resetImage() {
    setSettings(DEFAULT_IMAGE_EDIT_SETTINGS)
    setError('')
  }

  function useOriginal() {
    if (processing) return
    onSave(file, { duration: type === 'video' ? videoDuration : undefined })
  }

  async function applyEdits() {
    if (processing) return
    setProcessing(true)
    setProgress(0)
    setError('')
    try {
      if (type === 'image') {
        if (!imageRef.current) throw new Error('The image is still loading.')
        const edited = await exportEditedImage(file, imageRef.current, settings)
        if (maxOutputBytes && edited.size > maxOutputBytes) {
          throw new Error(`The edited photo is over ${Math.round(maxOutputBytes / 1024 / 1024)} MB. Reduce the crop or use the original.`)
        }
        onSave(edited, {})
        return
      }

      if (!videoDuration || trimEnd <= trimStart) throw new Error('Choose a valid video range.')
      const changed = trimStart > 0.05 || trimEnd < videoDuration - 0.05 || mute
      if (!changed) {
        onSave(file, { duration: videoDuration })
        return
      }

      const { exportEditedVideo } = await import('@/lib/video-editor')
      const edited = await exportEditedVideo(
        file,
        { start: trimStart, end: trimEnd, duration: videoDuration, mute },
        setProgress,
      )
      if (maxOutputBytes && edited.size > maxOutputBytes) {
        throw new Error(`The edited video is over ${Math.round(maxOutputBytes / 1024 / 1024)} MB. Choose a shorter range or use the original.`)
      }
      onSave(edited, { duration: trimEnd - trimStart })
    } catch (applyError) {
      setError(applyError instanceof Error ? applyError.message : 'Your edits could not be applied.')
    } finally {
      setProcessing(false)
    }
  }

  const activeAspect = ASPECT_RATIOS[settings.aspect]
  const clipDuration = Math.max(0, trimEnd - trimStart)

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1200, display: 'flex', alignItems: 'stretch', justifyContent: 'center', background: 'rgba(5,4,10,0.92)', backdropFilter: 'blur(12px)' }}>
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        style={{ width: '100%', maxWidth: 720, minHeight: '100%', background: 'var(--surface-0)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
      >
        <header style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', paddingTop: 'calc(12px + env(safe-area-inset-top, 0px))', borderBottom: '1px solid var(--divider)', background: 'var(--surface-1)', flexShrink: 0 }}>
          <button type="button" onClick={onCancel} disabled={processing} aria-label="Close media editor" style={{ width: 36, height: 36, border: 'none', borderRadius: '50%', background: 'var(--surface-2)', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            <X size={17} />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 id={titleId} style={{ margin: 0, fontSize: 16, fontWeight: 850 }}>Edit {type === 'image' ? 'photo' : 'video'}</h2>
            <p style={{ margin: '2px 0 0', fontSize: 11.5, color: 'var(--text-tertiary)' }}>Edits happen on this device before upload.</p>
          </div>
          <button type="button" onClick={resetImage} disabled={type !== 'image' || processing} style={{ border: 'none', background: 'transparent', color: type === 'image' ? 'var(--nia-violet)' : 'transparent', fontSize: 12, fontWeight: 800, cursor: type === 'image' ? 'pointer' : 'default', padding: '8px 4px' }}>Reset</button>
        </header>

        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          <div style={{ minHeight: 250, maxHeight: '48vh', padding: 14, background: '#09080d', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {type === 'image' ? (
              imageReady ? (
                <canvas
                  ref={canvasRef}
                  aria-label="Edited image preview"
                  style={{ display: 'block', maxWidth: '100%', maxHeight: '44vh', width: 'auto', height: 'auto', borderRadius: 12, boxShadow: '0 12px 36px rgba(0,0,0,0.28)', aspectRatio: activeAspect ? String(activeAspect) : undefined }}
                />
              ) : (
                <Loader2 size={28} className="animate-spin" color="rgba(255,255,255,0.7)" />
              )
            ) : previewUrl ? (
              <video
                ref={videoRef}
                src={mediaUrl(previewUrl)}
                controls
                playsInline
                onLoadedMetadata={event => {
                  const loadedDuration = event.currentTarget.duration
                  if (Number.isFinite(loadedDuration)) setVideoDuration(loadedDuration)
                }}
                onPlay={event => {
                  if (event.currentTarget.currentTime < trimStart || event.currentTarget.currentTime >= trimEnd) event.currentTarget.currentTime = trimStart
                }}
                onTimeUpdate={event => {
                  const time = event.currentTarget.currentTime
                  setCurrentTime(time)
                  if (trimEnd > trimStart && time >= trimEnd) {
                    event.currentTarget.pause()
                    event.currentTarget.currentTime = trimStart
                  }
                }}
                style={{ display: 'block', maxWidth: '100%', maxHeight: '44vh', borderRadius: 12 }}
              />
            ) : null}
          </div>

          {type === 'image' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18, padding: '18px 16px 24px' }}>
              <div>
                <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 850, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>Crop</p>
                <div className="hidden-scrollbar" style={{ display: 'flex', gap: 7, overflowX: 'auto', paddingBottom: 2 }}>
                  {ASPECT_OPTIONS.map(option => (
                    <button key={option.value} type="button" aria-pressed={settings.aspect === option.value} onClick={() => updateSettings({ aspect: option.value })} style={{ flexShrink: 0, padding: '8px 12px', borderRadius: 999, border: `1px solid ${settings.aspect === option.value ? 'var(--nia-violet)' : 'var(--border)'}`, background: settings.aspect === option.value ? 'rgba(91,33,182,0.1)' : 'var(--surface-1)', color: settings.aspect === option.value ? 'var(--nia-violet)' : 'var(--text-secondary)', fontSize: 12, fontWeight: 750, cursor: 'pointer' }}>{option.label}</button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" onClick={() => updateSettings({ rotation: ((settings.rotation + 90) % 360) as ImageEditSettings['rotation'] })} className="btn-ghost" style={{ flex: 1, justifyContent: 'center', display: 'flex', alignItems: 'center', gap: 7 }}><RotateCw size={15} /> Rotate</button>
                <button type="button" onClick={() => updateSettings({ flipHorizontal: !settings.flipHorizontal })} className="btn-ghost" style={{ flex: 1, justifyContent: 'center', display: 'flex', alignItems: 'center', gap: 7, color: settings.flipHorizontal ? 'var(--nia-violet)' : undefined }}><FlipHorizontal2 size={15} /> Flip</button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <RangeControl label="Zoom" value={settings.zoom * 100} min={100} max={250} suffix="%" onChange={value => updateSettings({ zoom: value / 100 })} />
                <RangeControl label="Move left/right" value={settings.focusX * 100} min={0} max={100} suffix="%" onChange={value => updateSettings({ focusX: value / 100 })} />
                <RangeControl label="Move up/down" value={settings.focusY * 100} min={0} max={100} suffix="%" onChange={value => updateSettings({ focusY: value / 100 })} />
              </div>

              <div>
                <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 850, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: 6 }}><SlidersHorizontal size={13} /> Adjust</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <RangeControl label="Brightness" value={settings.brightness} min={60} max={140} suffix="%" onChange={brightness => updateSettings({ brightness })} />
                  <RangeControl label="Contrast" value={settings.contrast} min={60} max={140} suffix="%" onChange={contrast => updateSettings({ contrast })} />
                  <RangeControl label="Colour" value={settings.saturation} min={0} max={180} suffix="%" onChange={saturation => updateSettings({ saturation })} />
                </div>
              </div>

              {file.type === 'image/gif' && <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5, color: 'var(--nia-amber)' }}>Editing an animated GIF exports its first frame as a still image.</p>}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18, padding: '18px 16px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <p style={{ margin: 0, fontSize: 11, fontWeight: 850, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: 6 }}><Scissors size={13} /> Trim clip</p>
                  <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-secondary)' }}>{formatMediaDuration(trimStart)}–{formatMediaDuration(trimEnd)} · {formatMediaDuration(clipDuration)} selected</p>
                </div>
                <span style={{ fontSize: 11, color: 'var(--text-tertiary)', fontVariantNumeric: 'tabular-nums' }}>Playhead {formatMediaDuration(currentTime)}</span>
              </div>

              <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>
                Start · {formatMediaDuration(trimStart)}
                <input type="range" min={0} max={Math.max(0, trimEnd - 0.25)} step={0.05} value={trimStart} onChange={event => { const value = Number(event.target.value); setTrimStart(value); if (videoRef.current) videoRef.current.currentTime = value }} style={{ width: '100%', accentColor: 'var(--nia-violet)' }} />
              </label>
              <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 12, fontWeight: 700, color: 'var(--text-secondary)' }}>
                End · {formatMediaDuration(trimEnd)}
                <input type="range" min={Math.min(videoDuration, trimStart + 0.25)} max={Math.max(videoDuration, 0.25)} step={0.05} value={trimEnd} onChange={event => { const value = Number(event.target.value); setTrimEnd(value); if (videoRef.current) videoRef.current.currentTime = value }} style={{ width: '100%', accentColor: 'var(--nia-coral)' }} />
              </label>

              <div style={{ display: 'flex', gap: 8 }}>
                <button type="button" className="btn-ghost" onClick={() => { const time = Math.min(currentTime, trimEnd - 0.25); setTrimStart(Math.max(0, time)) }} style={{ flex: 1, justifyContent: 'center' }}>Start here</button>
                <button type="button" className="btn-ghost" onClick={() => { const time = Math.max(currentTime, trimStart + 0.25); setTrimEnd(Math.min(videoDuration, time)) }} style={{ flex: 1, justifyContent: 'center' }}>End here</button>
              </div>

              <button type="button" aria-pressed={mute} onClick={() => setMute(value => !value)} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '12px 14px', borderRadius: 14, border: `1px solid ${mute ? 'var(--nia-violet)' : 'var(--border)'}`, background: mute ? 'rgba(91,33,182,0.08)' : 'var(--surface-1)', color: 'var(--text-primary)', font: 'inherit', fontSize: 13, fontWeight: 750, cursor: 'pointer' }}>
                {mute ? <VolumeX size={17} color="var(--nia-violet)" /> : <Volume2 size={17} />}
                {mute ? 'Sound removed from export' : 'Keep original sound'}
              </button>

              <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5, color: 'var(--text-tertiary)' }}>Video export runs locally and may take longer for large clips. Files over 80 MB can still be posted unchanged but are not processed on-device.</p>
            </div>
          )}

          {processing && (
            <div style={{ margin: '0 16px 16px' }}>
              <div style={{ height: 6, borderRadius: 999, background: 'var(--surface-3)', overflow: 'hidden' }}><div style={{ width: `${Math.max(4, progress * 100)}%`, height: '100%', background: 'var(--grad-brand)', transition: 'width 0.15s' }} /></div>
              <p role="status" style={{ margin: '6px 0 0', fontSize: 11.5, color: 'var(--text-tertiary)' }}>{type === 'video' ? `Exporting edited clip… ${Math.round(progress * 100)}%` : 'Creating edited photo…'}</p>
            </div>
          )}
          {error && <p role="alert" style={{ margin: '0 16px 16px', padding: '10px 12px', borderRadius: 12, background: 'rgba(244,63,94,0.08)', color: 'var(--nia-coral)', fontSize: 12.5, lineHeight: 1.45 }}>{error}</p>}
        </div>

        <footer style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '10px 14px', paddingBottom: 'calc(10px + env(safe-area-inset-bottom, 0px))', borderTop: '1px solid var(--divider)', background: 'var(--surface-1)', flexShrink: 0 }}>
          <button type="button" onClick={useOriginal} disabled={processing} className="btn-ghost" style={{ flex: 1, justifyContent: 'center', minHeight: 42 }}>Use original</button>
          <button type="button" onClick={applyEdits} disabled={processing || (type === 'image' && !imageReady) || (type === 'video' && !videoDuration)} className="btn-primary" style={{ flex: 1.35, minHeight: 42, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
            {processing ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
            {processing ? 'Applying…' : 'Apply edits'}
          </button>
        </footer>
      </section>
    </div>
  )
}

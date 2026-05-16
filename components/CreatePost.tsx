'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AFRICAN_LANGUAGES } from '@/lib/african-data'
import {
  ImagePlus, Video, X, Loader2, Sparkles, BarChart2, Plus, Trash2,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import VoiceRecorder from '@/components/VoiceRecorder'

interface MediaItem {
  file: File
  preview: string
  type: 'image' | 'video'
}

interface CreatePostProps {
  userId: string
  circleId?: string | null
}

const MAX_MEDIA = 2
const MAX_VIDEO_SIZE_MB = 10
const MAX_VIDEO_DURATION_S = 60

export default function CreatePost({ userId, circleId = null }: CreatePostProps) {
  const supabase = createClient()
  const router = useRouter()
  const imageRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLInputElement>(null)

  const [content, setContent] = useState('')
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([])
  const [voiceBlob, setVoiceBlob] = useState<Blob | null>(null)
  const [loading, setLoading] = useState(false)
  const [captionLoading, setCaptionLoading] = useState(false)
  const [error, setError] = useState('')
  const [focused, setFocused] = useState(false)
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [language, setLanguage] = useState('english')
  const [showLangPicker, setShowLangPicker] = useState(false)
  const [showPoll, setShowPoll] = useState(false)
  const [pollQuestion, setPollQuestion] = useState('')
  const [pollOptions, setPollOptions] = useState(['', ''])
  const [pollDuration, setPollDuration] = useState('24')

  const canAddMore = mediaItems.length < MAX_MEDIA && !voiceBlob

  function handleImagePick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    addMediaFiles(files, 'image')
    e.target.value = ''
  }

  async function handleVideoPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    for (const file of files) {
      if (file.size > MAX_VIDEO_SIZE_MB * 1024 * 1024) {
        setError(`Video must be under ${MAX_VIDEO_SIZE_MB} MB — keeps uploads fast on mobile data.`)
        continue
      }
      const dur = await getVideoDuration(file)
      if (dur > MAX_VIDEO_DURATION_S) {
        setError(`Videos must be under ${MAX_VIDEO_DURATION_S} seconds.`)
        continue
      }
      addMediaFiles([file], 'video')
    }
    e.target.value = ''
  }

  function addMediaFiles(files: File[], type: 'image' | 'video') {
    setError('')
    const slots = MAX_MEDIA - mediaItems.length
    const toAdd = files.slice(0, slots)
    const newItems: MediaItem[] = toAdd.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      type,
    }))
    setMediaItems(prev => [...prev, ...newItems])
    if (newItems.length > 0) setVoiceBlob(null)
  }

  function removeMedia(idx: number) {
    setMediaItems(prev => {
      URL.revokeObjectURL(prev[idx].preview)
      return prev.filter((_, i) => i !== idx)
    })
  }

  function getVideoDuration(file: File): Promise<number> {
    return new Promise(resolve => {
      const url = URL.createObjectURL(file)
      const v = document.createElement('video')
      v.preload = 'metadata'
      v.onloadedmetadata = () => { URL.revokeObjectURL(url); resolve(v.duration) }
      v.onerror = () => { URL.revokeObjectURL(url); resolve(0) }
      v.src = url
    })
  }

  function extractHashtags(text: string): string[] {
    return (text.match(/#[\w\u00C0-\u024F\u1E00-\u1EFF]+/g) ?? [])
      .map(tag => tag.toLowerCase().replace('#', ''))
  }

  async function generateCaption() {
    if (!content.trim() && mediaItems.length === 0) return
    setCaptionLoading(true)
    try {
      const res = await fetch('/api/caption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      const data = await res.json()
      if (data.caption) setContent(data.caption)
    } catch { setError('Caption generation failed.') }
    finally { setCaptionLoading(false) }
  }

  async function handlePost() {
    const hasPoll =
      showPoll && pollQuestion.trim() &&
      pollOptions.filter(o => o.trim()).length >= 2

    if (!content.trim() && mediaItems.length === 0 && !voiceBlob && !hasPoll) return
    setLoading(true); setError('')

    let media_url: string | null = null
    let media_type: string | null = null
    let extra_media: { url: string; type: string }[] = []

    try {
      if (voiceBlob) {
        const path = `${userId}/voice_${Date.now()}.webm`
        const { error: upErr } = await supabase.storage
          .from('post-media').upload(path, voiceBlob, { contentType: 'audio/webm' })
        if (upErr) { setError('Voice upload failed.'); setLoading(false); return }
        const { data } = supabase.storage.from('post-media').getPublicUrl(path)
        media_url = data.publicUrl; media_type = 'audio'
      } else if (mediaItems.length > 0) {
        const uploaded: { url: string; type: string }[] = []
        for (const item of mediaItems) {
          const ext = item.file.name.split('.').pop() ?? (item.type === 'video' ? 'mp4' : 'jpg')
          const path = `${userId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
          const contentType = item.file.type || (item.type === 'video' ? 'video/mp4' : 'image/jpeg')
          const { error: upErr } = await supabase.storage
            .from('post-media').upload(path, item.file, { contentType })
          if (upErr) { setError(`Upload failed: ${upErr.message}`); setLoading(false); return }
          const { data } = supabase.storage.from('post-media').getPublicUrl(path)
          uploaded.push({ url: data.publicUrl, type: item.type })
        }
        media_url = uploaded[0].url
        media_type = uploaded[0].type
        extra_media = uploaded.slice(1)
      }

      const { data: post, error: postError } = await supabase
        .from('posts')
        .insert({
          user_id: userId, circle_id: circleId,
          content: content.trim() || null,
          media_url, media_type,
          extra_media: extra_media.length > 0 ? extra_media : null,
          is_anonymous: isAnonymous, language,
        })
        .select().single()

      if (postError) { setError(postError.message); setLoading(false); return }

      if (post && content.trim()) {
        const tags = extractHashtags(content)
        if (tags.length > 0) {
          const { data: profile } = await supabase
            .from('profiles').select('country').eq('id', userId).single()
          await supabase.from('hashtags').insert(
            tags.map(tag => ({ tag, post_id: post.id, user_id: userId, country: profile?.country ?? null }))
          )
        }
      }

      if (hasPoll && post) {
        const validOptions = pollOptions.filter(o => o.trim())
        const endsAt = new Date(Date.now() + parseInt(pollDuration) * 3_600_000).toISOString()
        await supabase.from('polls').insert({
          post_id: post.id,
          question: pollQuestion.trim(),
          options: validOptions.map((text, i) => ({ id: `opt_${i}`, text, votes: 0 })),
          ends_at: endsAt,
        })
      }

      mediaItems.forEach(m => URL.revokeObjectURL(m.preview))
      setContent(''); setMediaItems([]); setVoiceBlob(null)
      setShowPoll(false); setPollQuestion(''); setPollOptions(['', '']); setPollDuration('24')
      setLanguage('english'); setShowLangPicker(false); setFocused(false)
      router.refresh()
    } catch (err) {
      console.error(err)
      setError('Something went wrong while creating post.')
    } finally { setLoading(false) }
  }

  const canPost =
    content.trim() || mediaItems.length > 0 || voiceBlob ||
    (showPoll && pollQuestion.trim() && pollOptions.filter(o => o.trim()).length >= 2)

  return (
    <div
      className="card overflow-hidden transition-all duration-200"
      style={focused ? { border: '1.5px solid var(--nia-violet)', boxShadow: '0 0 0 3px rgba(168,85,247,0.1)' } : {}}
    >
      {/* ── Composer ──────────────────────────────────────── */}
      <div className="flex gap-3 p-4">
        <div
          className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center text-white font-bold text-sm"
          style={{ background: 'var(--grad-brand)' }}
        >
          +
        </div>
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          onFocus={() => setFocused(true)}
          placeholder={circleId ? "What's happening in this circle? 🎯" : "What's happening? ✨"}
          rows={focused || content ? 3 : 1}
          className="flex-1 bg-transparent text-[15px] resize-none focus:outline-none leading-relaxed"
          style={{ color: 'var(--text-primary)' }}
        />
      </div>

      {/* ── Media Previews ────────────────────────────────── */}
      {mediaItems.length > 0 && (
        <div className="mx-4 mb-1">
          <div className={mediaItems.length === 2 ? 'grid grid-cols-2 gap-2' : 'flex'}>
            {mediaItems.map((item, idx) => (
              <div
                key={idx}
                className="relative rounded-2xl overflow-hidden"
                style={{
                  border: '1px solid var(--border)',
                  aspectRatio: mediaItems.length === 2 ? '1/1' : '16/9',
                  background: '#000',
                }}
              >
                {item.type === 'image' ? (
                  <img src={item.preview} alt="" className="w-full h-full object-cover" />
                ) : (
                  <>
                    <video
                      src={item.preview}
                      className="w-full h-full object-contain"
                      preload="metadata"
                      muted
                      playsInline
                    />
                    <div
                      className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold text-white"
                      style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
                    >
                      <Video size={11} /> Video
                    </div>
                  </>
                )}
                <button
                  onClick={() => removeMedia(idx)}
                  className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded-full text-white transition-all active:scale-90"
                  style={{ background: 'rgba(0,0,0,0.6)' }}
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>

          {/* Slot hint */}
          <div className="flex items-center gap-1.5 mt-2 mb-2">
            {[0, 1].map(i => (
              <div
                key={i}
                className="h-1 rounded-full transition-all duration-200"
                style={{
                  width: 24,
                  background: i < mediaItems.length ? 'var(--nia-violet)' : 'var(--surface-3)',
                }}
              />
            ))}
            <span className="text-xs ml-1" style={{ color: 'var(--text-tertiary)' }}>
              {mediaItems.length} / {MAX_MEDIA} media
              {mediaItems.length < MAX_MEDIA ? ' · add one more' : ' · limit reached'}
            </span>
          </div>
        </div>
      )}

      {/* ── Poll Builder ──────────────────────────────────── */}
      {showPoll && (
        <div className="mx-4 mb-3 p-4 rounded-2xl space-y-3" style={{ background: 'var(--surface-2)' }}>
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold" style={{ color: 'var(--nia-violet)' }}>📊 Poll</p>
            <button onClick={() => setShowPoll(false)} style={{ color: 'var(--text-tertiary)' }}>
              <X size={15} />
            </button>
          </div>
          <input
            value={pollQuestion}
            onChange={e => setPollQuestion(e.target.value)}
            placeholder="Ask a question…"
            className="input text-sm"
          />
          {pollOptions.map((opt, i) => (
            <div key={i} className="flex gap-2">
              <input
                value={opt}
                onChange={e => { const u = [...pollOptions]; u[i] = e.target.value; setPollOptions(u) }}
                placeholder={`Option ${i + 1}`}
                className="input flex-1 text-sm"
              />
              {pollOptions.length > 2 && (
                <button
                  onClick={() => setPollOptions(pollOptions.filter((_, j) => j !== i))}
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  <Trash2 size={15} />
                </button>
              )}
            </div>
          ))}
          {pollOptions.length < 4 && (
            <button
              onClick={() => setPollOptions([...pollOptions, ''])}
              className="text-xs font-bold flex items-center gap-1"
              style={{ color: 'var(--nia-violet)' }}
            >
              <Plus size={13} /> Add option
            </button>
          )}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Duration:</span>
            {['1', '6', '24', '48'].map(h => (
              <button
                key={h}
                onClick={() => setPollDuration(h)}
                className="px-2.5 py-1 rounded-xl text-xs font-bold transition-all"
                style={pollDuration === h
                  ? { background: 'var(--nia-violet)', color: '#fff' }
                  : { background: 'var(--surface-3)', color: 'var(--text-secondary)' }
                }
              >
                {h}h
              </button>
            ))}
          </div>
        </div>
      )}

      {error && <p className="px-4 pb-2 text-sm text-red-500">{error}</p>}

      {/* ── Toolbar ───────────────────────────────────────── */}
      <div
        className="flex items-center gap-1.5 px-3 py-2.5 flex-wrap"
        style={{ borderTop: '1px solid var(--border)' }}
      >
        <button
          onClick={() => imageRef.current?.click()}
          disabled={!canAddMore}
          className="tap-sm flex items-center gap-1 px-2.5 py-2 rounded-xl text-sm font-semibold transition-all active:scale-90 disabled:opacity-30"
          style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}
          title={canAddMore ? 'Add photo' : 'Max 2 media'}
        >
          <ImagePlus size={17} />
          <span className="hidden xs:inline text-xs">Photo</span>
        </button>

        <button
          onClick={() => videoRef.current?.click()}
          disabled={!canAddMore}
          className="tap-sm flex items-center gap-1 px-2.5 py-2 rounded-xl text-sm font-semibold transition-all active:scale-90 disabled:opacity-30"
          style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}
          title={canAddMore ? 'Add video (max 10 MB, 60s)' : 'Max 2 media'}
        >
          <Video size={17} />
          <span className="hidden xs:inline text-xs">Video</span>
        </button>

        {mediaItems.length === 0 && (
          <VoiceRecorder
            onRecorded={(blob) => { setVoiceBlob(blob); setMediaItems([]) }}
            onClear={() => setVoiceBlob(null)}
          />
        )}

        <button
          onClick={() => { setShowPoll(!showPoll); setMediaItems([]); setVoiceBlob(null) }}
          className="tap-sm flex items-center gap-1 px-2.5 py-2 rounded-xl text-sm font-semibold transition-all active:scale-90"
          style={showPoll
            ? { background: 'rgba(168,85,247,0.15)', color: 'var(--nia-violet)' }
            : { background: 'var(--surface-2)', color: 'var(--text-secondary)' }
          }
        >
          <BarChart2 size={17} />
          <span className="hidden xs:inline text-xs">Poll</span>
        </button>

        <button
          onClick={generateCaption}
          disabled={captionLoading || (!content.trim() && mediaItems.length === 0)}
          className="tap-sm flex items-center gap-1 px-2.5 py-2 rounded-xl text-sm font-semibold transition-all active:scale-90 disabled:opacity-30"
          style={{ background: captionLoading ? 'rgba(255,217,61,0.15)' : 'var(--surface-2)', color: 'var(--nia-amber)' }}
        >
          {captionLoading ? <Loader2 size={17} className="animate-spin" /> : <Sparkles size={17} />}
          <span className="hidden xs:inline text-xs">AI</span>
        </button>

        {/* Language picker */}
        <div className="relative">
          <button
            onClick={() => setShowLangPicker(!showLangPicker)}
            className="tap-sm flex items-center gap-1 px-2.5 py-2 rounded-xl text-sm font-semibold transition-all active:scale-90"
            style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}
          >
            <span>{AFRICAN_LANGUAGES.find(l => l.code === language)?.emoji ?? '🌍'}</span>
            <span className="hidden xs:inline text-xs">
              {AFRICAN_LANGUAGES.find(l => l.code === language)?.label ?? 'English'}
            </span>
          </button>
          {showLangPicker && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowLangPicker(false)} />
              <div
                className="absolute z-50 rounded-2xl p-2 shadow-xl anim-pop"
                style={{
                  background: 'var(--surface-0)',
                  border: '1px solid var(--border)',
                  width: '260px',
                  maxHeight: '300px',
                  overflowY: 'auto',
                  bottom: 'calc(100% + 8px)',
                  right: 0,
                }}
              >
                <p className="text-xs font-bold px-2 pb-1.5 pt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                  Post language
                </p>
                <div className="grid grid-cols-2 gap-1">
                  {AFRICAN_LANGUAGES.map(lang => (
                    <button
                      key={lang.code}
                      onClick={() => { setLanguage(lang.code); setShowLangPicker(false) }}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-left transition-all w-full"
                      style={language === lang.code
                        ? { background: 'rgba(168,85,247,0.12)', color: 'var(--nia-violet)' }
                        : { color: 'var(--text-secondary)' }
                      }
                    >
                      <span className="text-base leading-none">{lang.emoji}</span>
                      <span className="truncate">{lang.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {circleId && (
          <button
            type="button"
            onClick={() => setIsAnonymous(!isAnonymous)}
            className="tap-sm flex items-center gap-1 px-2.5 py-2 rounded-xl text-sm font-semibold transition-all active:scale-90"
            style={isAnonymous
              ? { background: 'rgba(168,85,247,0.12)', color: 'var(--nia-violet)' }
              : { background: 'var(--surface-2)', color: 'var(--text-secondary)' }
            }
          >
            🎭
            <span className="hidden xs:inline text-xs">Anon</span>
          </button>
        )}

        <input ref={imageRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImagePick} />
        <input ref={videoRef} type="file" accept="video/mp4,video/webm,video/quicktime" className="hidden" onChange={handleVideoPick} />

        <button
          onClick={handlePost}
          disabled={!canPost || loading}
          className="ml-auto btn-primary flex items-center gap-1.5 px-4 py-2 text-sm"
          style={{ borderRadius: '12px', minHeight: '38px' }}
        >
          {loading && <Loader2 size={15} className="animate-spin" />}
          {loading ? 'Posting…' : 'Post 🚀'}
        </button>
      </div>
    </div>
  )
}

// components/CreatePost.tsx
'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
<<<<<<< HEAD
  Image,
  AtSign,
  Hash,
  MapPin,
  Smile,
  Loader2,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
=======
  ImagePlus, Video, X, Loader2, Sparkles, BarChart2,
  Plus, Trash2, Mic, MicOff,
} from 'lucide-react'
import { useRouter } from 'next/navigation'

interface MediaItem {
  file: File
  preview: string
  type: 'image' | 'video'
}
>>>>>>> 70a68ce (fix:331666133166613316661331666133888)

interface CreatePostProps {
  userId: string;
  circleId?: string;
}

<<<<<<< HEAD
export default function CreatePost({ userId, circleId }: CreatePostProps) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const router = useRouter();
  const supabase = createClient();

  const MAX_CHARS = 500;

  // Load avatar / username once
  useEffect(() => {
    supabase
      .from('profiles')
      .select('username, avatar_url')
      .eq('id', userId)
      .single()
      .then(({ data }) => setProfile(data));
  }, [userId, supabase]);

  // Auto‑grow textarea
  const autoResize = () => {
    const el = textRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight}px`;
    }
  };

  const handlePost = async () => {
    if (!content.trim() || loading || content.length > MAX_CHARS) return;
    setLoading(true);

    const { error } = await supabase.from('posts').insert({
      user_id: userId,
      content: content.trim(),
      ...(circleId ? { circle_id: circleId } : {}),
    });

    if (!error) {
      setContent('');
      if (textRef.current) textRef.current.style.height = 'auto';
      router.refresh(); // re‑validate the page data
=======
const MAX_MEDIA       = 2
const MAX_CHARS       = 500
const MAX_VIDEO_MB    = 10
const MAX_VIDEO_SEC   = 60

export default function CreatePost({ userId, circleId = null }: CreatePostProps) {
  const supabase = createClient()
  const router   = useRouter()
  const imageRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLInputElement>(null)
  const textRef  = useRef<HTMLTextAreaElement>(null)

  const [content,      setContent]      = useState('')
  const [mediaItems,   setMediaItems]   = useState<MediaItem[]>([])
  const [voiceBlob,    setVoiceBlob]    = useState<Blob | null>(null)
  const [loading,      setLoading]      = useState(false)
  const [captionLoad,  setCaptionLoad]  = useState(false)
  const [error,        setError]        = useState('')
  const [profile,      setProfile]      = useState<any>(null)
  const [language,     setLanguage]     = useState('english')
  const [showLang,     setShowLang]     = useState(false)
  const [showPoll,     setShowPoll]     = useState(false)
  const [pollQ,        setPollQ]        = useState('')
  const [pollOpts,     setPollOpts]     = useState(['', ''])
  const [pollDur,      setPollDur]      = useState('24')
  const [recording,    setRecording]    = useState(false)
  const mediaRecRef    = useRef<MediaRecorder | null>(null)
  const chunksRef      = useRef<Blob[]>([])

  /* fetch own profile for avatar */
  useEffect(() => {
    supabase.from('profiles').select('username, avatar_url').eq('id', userId).single()
      .then(({ data }) => setProfile(data))
  }, [userId]) // eslint-disable-line

  /* auto-grow textarea */
  const grow = () => {
    const el = textRef.current
    if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px' }
  }

  const canAddMore = mediaItems.length < MAX_MEDIA && !voiceBlob
  const charsLeft  = MAX_CHARS - content.length
  const isOver     = charsLeft < 0
  const canPost    = !isOver && (
    content.trim() || mediaItems.length > 0 || voiceBlob ||
    (showPoll && pollQ.trim() && pollOpts.filter(o => o.trim()).length >= 2)
  )

  /* ── Image pick ──────────────────────────────────── */
  function handleImagePick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    addFiles(files, 'image')
    e.target.value = ''
  }

  /* ── Video pick ──────────────────────────────────── */
  async function handleVideoPick(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    for (const f of files) {
      if (f.size > MAX_VIDEO_MB * 1024 * 1024) {
        setError(`Video must be under ${MAX_VIDEO_MB} MB.`); continue
      }
      const dur = await getVideoDuration(f)
      if (dur > MAX_VIDEO_SEC) {
        setError(`Videos must be under ${MAX_VIDEO_SEC}s.`); continue
      }
      addFiles([f], 'video')
>>>>>>> 70a68ce (fix:331666133166613316661331666133888)
    }
    setLoading(false);
  };

<<<<<<< HEAD
  const charsLeft = MAX_CHARS - content.length;
  const isOver = charsLeft < 0;
  const isNear = charsLeft <= 50;
=======
  function addFiles(files: File[], type: 'image' | 'video') {
    setError('')
    const slots = MAX_MEDIA - mediaItems.length
    const items: MediaItem[] = files.slice(0, slots).map(f => ({
      file: f,
      preview: URL.createObjectURL(f),
      type,
    }))
    setMediaItems(prev => [...prev, ...items])
    if (items.length) setVoiceBlob(null)
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
      const v   = document.createElement('video')
      v.preload = 'metadata'
      v.onloadedmetadata = () => { URL.revokeObjectURL(url); resolve(v.duration) }
      v.onerror = () => { URL.revokeObjectURL(url); resolve(0) }
      v.src = url
    })
  }

  /* ── Voice recording ─────────────────────────────── */
  async function toggleRecording() {
    if (recording) {
      mediaRecRef.current?.stop()
      setRecording(false)
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream)
      chunksRef.current = []
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        setVoiceBlob(blob)
        setMediaItems([])
        stream.getTracks().forEach(t => t.stop())
      }
      mr.start()
      mediaRecRef.current = mr
      setRecording(true)
    } catch { setError('Microphone access denied.') }
  }

  /* ── AI caption ──────────────────────────────────── */
  async function generateCaption() {
    if (!content.trim() && mediaItems.length === 0) return
    setCaptionLoad(true)
    try {
      const res  = await fetch('/api/caption', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      const data = await res.json()
      if (data.caption) setContent(data.caption)
    } catch { setError('Caption generation failed.') }
    finally { setCaptionLoad(false) }
  }

  function extractTags(text: string) {
    return (text.match(/#[\w\u00C0-\u024F\u1E00-\u1EFF]+/g) ?? [])
      .map(t => t.toLowerCase().replace('#', ''))
  }

  /* ── Submit ──────────────────────────────────────── */
  async function handlePost() {
    if (!canPost || loading) return
    setLoading(true); setError('')

    let media_url:   string | null = null
    let media_type:  string | null = null
    let extra_media: { url: string; type: string }[] = []

    try {
      /* Upload voice */
      if (voiceBlob) {
        const path = `${userId}/voice_${Date.now()}.webm`
        const { error: upErr } = await supabase.storage
          .from('post-media').upload(path, voiceBlob, { contentType: 'audio/webm' })
        if (upErr) { setError('Voice upload failed.'); return }
        media_url  = supabase.storage.from('post-media').getPublicUrl(path).data.publicUrl
        media_type = 'audio'

      /* Upload images/videos */
      } else if (mediaItems.length > 0) {
        const uploaded: { url: string; type: string }[] = []
        for (const item of mediaItems) {
          const ext  = item.file.name.split('.').pop() ?? (item.type === 'video' ? 'mp4' : 'jpg')
          const path = `${userId}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
          const { error: upErr } = await supabase.storage
            .from('post-media').upload(path, item.file, { contentType: item.file.type })
          if (upErr) { setError(`Upload failed: ${upErr.message}`); return }
          uploaded.push({
            url:  supabase.storage.from('post-media').getPublicUrl(path).data.publicUrl,
            type: item.type,
          })
        }
        media_url  = uploaded[0].url
        media_type = uploaded[0].type
        extra_media = uploaded.slice(1)
      }

      /* Insert post */
      const { data: post, error: postErr } = await supabase
        .from('posts')
        .insert({
          user_id:     userId,
          circle_id:   circleId,
          content:     content.trim() || null,
          media_url,
          media_type,
          extra_media: extra_media.length ? extra_media : null,
          language,
        })
        .select().single()

      if (postErr) { setError(postErr.message); return }

      /* Hashtags */
      if (post && content.trim()) {
        const tags = extractTags(content)
        if (tags.length) {
          const { data: prof } = await supabase
            .from('profiles').select('country').eq('id', userId).single()
          await supabase.from('hashtags').insert(
            tags.map(tag => ({ tag, post_id: post.id, user_id: userId, country: prof?.country ?? null }))
          )
        }
      }

      /* Poll */
      const hasPoll = showPoll && pollQ.trim() && pollOpts.filter(o => o.trim()).length >= 2
      if (hasPoll && post) {
        const validOpts = pollOpts.filter(o => o.trim())
        await supabase.from('polls').insert({
          post_id:  post.id,
          question: pollQ.trim(),
          options:  validOpts.map((text, i) => ({ id: `opt_${i}`, text, votes: 0 })),
          ends_at:  new Date(Date.now() + parseInt(pollDur) * 3_600_000).toISOString(),
        })
      }

      /* Reset */
      mediaItems.forEach(m => URL.revokeObjectURL(m.preview))
      setContent(''); setMediaItems([]); setVoiceBlob(null)
      setShowPoll(false); setPollQ(''); setPollOpts(['', '']); setPollDur('24')
      if (textRef.current) textRef.current.style.height = 'auto'
      router.refresh()

    } catch (err) {
      console.error(err)
      setError('Something went wrong.')
    } finally { setLoading(false) }
  }

  const initials = profile?.username?.[0]?.toUpperCase() ?? '?'
>>>>>>> 70a68ce (fix:331666133166613316661331666133888)

  /* ════════════════════════════════════════════════ */
  return (
<<<<<<< HEAD
    <div
      className="w-full rounded-2xl p-4 border transition-all duration-200 focus-within:border-(--nia-violet)"
      style={{ background: 'var(--surface-0)', borderColor: 'var(--border)' }}
    >
      {/* ---------- Input row ---------- */}
      <div className="flex items-start gap-3">
        {/* Avatar / placeholder */}
        <div
          className="w-10 h-10 rounded-full overflow-hidden flex items-center justify-center font-bold text-sm text-white shrink-0 select-none"
          style={{ background: 'var(--grad-brand)' }}
        >
          {profile?.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={profile?.username ?? 'avatar'}
              className="w-full h-full object-cover"
            />
          ) : (
            profile?.username?.[0]?.toUpperCase() ?? '?'
          )}
        </div>

        {/* Textarea */}
        <div className="flex-1 min-w-0">
          <textarea
            ref={textRef}
            className="w-full min-h-10 bg-transparent border-0 p-0 pt-2 text-[15px] leading-relaxed resize-none focus:ring-0 focus:outline-none placeholder-slate-500"
            style={{ color: 'var(--text-primary)' }}
            placeholder="What's on your mind?"
            value={content}
            onChange={(e) => {
              setContent(e.target.value);
              autoResize();
            }}
            rows={1}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                handlePost();
              }
            }}
          />
        </div>
      </div>

      {/* Divider */}
      <div
        className="my-3 border-t border-dashed"
        style={{ borderColor: 'var(--border)' }}
      />

      {/* Footer – actions + post button */}
      <div className="flex items-center justify-between gap-4">
        {/* Attachment icons */}
        <div className="flex items-center gap-1">
          {[
            { icon: Image, label: 'Add image' },
            { icon: AtSign, label: 'Mention' },
            { icon: Hash, label: 'Hashtag' },
            { icon: MapPin, label: 'Location' },
            { icon: Smile, label: 'Emoji' },
          ].map((item, i) => (
            <button
              key={i}
              className="p-2 rounded-xl transition-colors text-slate-400 hover:text-(--nia-violet) hover:bg-(--surface-1) active:scale-95"
              aria-label={item.label}
            >
              <item.icon size={18} strokeWidth={2} />
            </button>
          ))}
        </div>

        {/* Right side – char counter + post button */}
        <div className="flex items-center gap-3">
          {content.length > 0 && (
            <span
              className={`text-xs font-bold font-mono transition-colors duration-150 ${
                isOver
                  ? 'text-rose-500'
                  : isNear
                  ? 'text-amber-500'
                  : ''
              }`}
              style={{
                color: !isOver && !isNear ? 'var(--text-tertiary)' : undefined,
              }}
            >
              {charsLeft}
            </span>
          )}

          <button
            onClick={handlePost}
            disabled={!content.trim() || loading || isOver}
            className="px-4 py-1.5 rounded-xl text-xs font-bold text-white transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none min-w-16 flex items-center justify-center shadow-xs"
            style={{ background: 'var(--grad-brand)' }}
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : 'Post'}
          </button>
        </div>
=======
    <div>
      {/* ── Compose row ── */}
      <div className="compose-row">
        {/* Avatar */}
        <div className="compose-left">
          <div className="post-avatar" style={{ flexShrink: 0 }}>
            <div className="post-avatar-inner">
              {profile?.avatar_url
                ? <img src={profile.avatar_url} alt={profile.username} />
                : initials
              }
            </div>
          </div>
        </div>

        {/* Input + post button */}
        <div className="compose-body">
          <textarea
            ref={textRef}
            className="compose-textarea"
            placeholder={circleId ? "What's happening in this circle?" : "What's on your mind?"}
            value={content}
            onChange={e => { setContent(e.target.value); grow() }}
            rows={1}
            onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handlePost() }}
          />
          <button
            className="btn-post"
            onClick={handlePost}
            disabled={!canPost || loading}
            style={{ marginTop: 8 }}
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : 'Post'}
          </button>
        </div>
      </div>

      {/* ── Media previews ── */}
      {mediaItems.length > 0 && (
        <div style={{ padding: '8px 16px 4px' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: mediaItems.length === 2 ? '1fr 1fr' : '1fr',
            gap: 6,
          }}>
            {mediaItems.map((item, idx) => (
              <div
                key={idx}
                style={{
                  position: 'relative',
                  borderRadius: 14,
                  overflow: 'hidden',
                  border: '1px solid var(--border)',
                  aspectRatio: mediaItems.length === 2 ? '1/1' : '16/9',
                  background: '#000',
                }}
              >
                {item.type === 'image'
                  ? <img src={item.preview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <video src={item.preview} style={{ width: '100%', height: '100%', objectFit: 'contain' }} muted playsInline preload="metadata" />
                }
                <button
                  onClick={() => removeMedia(idx)}
                  style={{
                    position: 'absolute', top: 6, right: 6,
                    width: 26, height: 26,
                    borderRadius: '50%',
                    border: 'none',
                    background: 'rgba(0,0,0,0.6)',
                    color: '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>
          {/* Slot indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
            {[0, 1].map(i => (
              <div key={i} style={{
                height: 3, width: 20, borderRadius: 3,
                background: i < mediaItems.length ? 'var(--nia-violet)' : 'var(--surface-3)',
                transition: 'background 0.2s',
              }} />
            ))}
            <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
              {mediaItems.length}/{MAX_MEDIA} · {mediaItems.length < MAX_MEDIA ? 'add one more' : 'limit reached'}
            </span>
          </div>
        </div>
      )}

      {/* Voice blob indicator */}
      {voiceBlob && (
        <div style={{
          margin: '8px 16px 4px',
          padding: '8px 14px',
          borderRadius: 12,
          background: 'rgba(139, 92, 246, 0.08)',
          border: '1px solid rgba(139, 92, 246, 0.2)',
          display: 'flex', alignItems: 'center', gap: 8, fontSize: 13,
          color: 'var(--nia-violet)',
        }}>
          <Mic size={14} />
          Voice note ready
          <button
            onClick={() => setVoiceBlob(null)}
            style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
          >
            <X size={13} />
          </button>
        </div>
      )}

      {/* Poll builder */}
      {showPoll && (
        <div style={{ margin: '8px 16px', padding: 14, borderRadius: 14, background: 'var(--surface-2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--nia-violet)' }}>📊 Poll</span>
            <button onClick={() => setShowPoll(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}>
              <X size={14} />
            </button>
          </div>
          <input value={pollQ} onChange={e => setPollQ(e.target.value)} placeholder="Ask a question…" className="input" style={{ marginBottom: 8, fontSize: 13 }} />
          {pollOpts.map((opt, i) => (
            <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
              <input
                value={opt}
                onChange={e => { const u = [...pollOpts]; u[i] = e.target.value; setPollOpts(u) }}
                placeholder={`Option ${i + 1}`}
                className="input"
                style={{ flex: 1, fontSize: 13 }}
              />
              {pollOpts.length > 2 && (
                <button onClick={() => setPollOpts(pollOpts.filter((_, j) => j !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-tertiary)' }}>
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}
          {pollOpts.length < 4 && (
            <button onClick={() => setPollOpts([...pollOpts, ''])} style={{ fontSize: 12, fontWeight: 700, color: 'var(--nia-violet)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Plus size={12} /> Add option
            </button>
          )}
        </div>
      )}

      {error && <p style={{ padding: '4px 16px', fontSize: 13, color: '#f43f5e' }}>{error}</p>}

      {/* ── Toolbar ── */}
      <div className="compose-toolbar">
        <div className="compose-icons">
          {/* Image */}
          <button className="compose-icon-btn tap-xs" disabled={!canAddMore} onClick={() => imageRef.current?.click()} title={canAddMore ? 'Add photo' : 'Max 2 media'} style={{ opacity: canAddMore ? 1 : 0.3 }}>
            <ImagePlus size={19} />
          </button>

          {/* Video */}
          <button className="compose-icon-btn tap-xs" disabled={!canAddMore} onClick={() => videoRef.current?.click()} title="Add video" style={{ opacity: canAddMore ? 1 : 0.3 }}>
            <Video size={19} />
          </button>

          {/* Voice */}
          {mediaItems.length === 0 && (
            <button
              className="compose-icon-btn tap-xs"
              onClick={toggleRecording}
              style={{ color: recording ? '#f43f5e' : undefined }}
              title={recording ? 'Stop recording' : 'Record voice'}
            >
              {recording ? <MicOff size={19} /> : <Mic size={19} />}
            </button>
          )}

          {/* Poll */}
          <button
            className="compose-icon-btn tap-xs"
            onClick={() => { setShowPoll(!showPoll); setMediaItems([]); setVoiceBlob(null) }}
            style={{ color: showPoll ? 'var(--nia-violet)' : undefined }}
            title="Create poll"
          >
            <BarChart2 size={19} />
          </button>

          {/* AI caption */}
          <button
            className="compose-icon-btn tap-xs"
            onClick={generateCaption}
            disabled={captionLoad || (!content.trim() && mediaItems.length === 0)}
            style={{ color: 'var(--nia-amber)', opacity: captionLoad ? 0.6 : 1 }}
            title="AI caption"
          >
            {captionLoad ? <Loader2 size={19} className="animate-spin" /> : <Sparkles size={19} />}
          </button>

          {/* Language picker */}
          <div style={{ position: 'relative' }}>
            <button className="compose-icon-btn tap-xs" onClick={() => setShowLang(!showLang)} title="Language">
              <span style={{ fontSize: 16 }}>{AFRICAN_LANGUAGES.find(l => l.code === language)?.emoji ?? '🌍'}</span>
            </button>
            {showLang && (
              <>
                <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setShowLang(false)} />
                <div style={{
                  position: 'absolute',
                  bottom: 'calc(100% + 8px)',
                  left: 0,
                  zIndex: 50,
                  width: 240,
                  maxHeight: 280,
                  overflowY: 'auto',
                  background: 'var(--surface-0)',
                  border: '1px solid var(--border)',
                  borderRadius: 16,
                  padding: 8,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
                }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-tertiary)', padding: '4px 8px 8px', textTransform: 'uppercase', letterSpacing: 1 }}>Language</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4 }}>
                    {AFRICAN_LANGUAGES.map(lang => (
                      <button
                        key={lang.code}
                        onClick={() => { setLanguage(lang.code); setShowLang(false) }}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 6,
                          padding: '8px 10px', borderRadius: 10,
                          border: 'none', cursor: 'pointer', textAlign: 'left',
                          fontSize: 12, fontWeight: 600,
                          background: language === lang.code ? 'rgba(139,92,246,0.1)' : 'none',
                          color: language === lang.code ? 'var(--nia-violet)' : 'var(--text-secondary)',
                          width: '100%',
                        }}
                      >
                        <span style={{ fontSize: 14 }}>{lang.emoji}</span>
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lang.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Char count */}
        {content.length > 0 && (
          <span style={{
            fontSize: 12, fontWeight: 700,
            color: isOver ? '#f43f5e' : charsLeft <= 50 ? '#f59e0b' : 'var(--text-tertiary)',
          }}>
            {charsLeft}
          </span>
        )}
>>>>>>> 70a68ce (fix:331666133166613316661331666133888)
      </div>

      <input ref={imageRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImagePick} style={{ display: 'none' }} />
      <input ref={videoRef} type="file" accept="video/mp4,video/webm,video/quicktime" style={{ display: 'none' }} onChange={handleVideoPick} />
    </div>
  );
}

'use client'
import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ImagePlus, X, Loader2, Sparkles } from 'lucide-react'
import { useRouter } from 'next/navigation'
import VoiceRecorder from '@/components/VoiceRecorder'

interface CreatePostProps { userId: string; circleId?: string | null }

export default function CreatePost({ userId, circleId = null }: CreatePostProps) {
  const supabase = createClient()
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [content, setContent] = useState('')
  const [image, setImage] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [voiceBlob, setVoiceBlob] = useState<Blob | null>(null)
  const [loading, setLoading] = useState(false)
  const [captionLoading, setCaptionLoading] = useState(false)
  const [error, setError] = useState('')
  const [focused, setFocused] = useState(false)

  function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImage(file); setPreview(URL.createObjectURL(file))
  }

  async function generateCaption() {
    if (!content.trim() && !image) return
    setCaptionLoading(true)
    try {
      const res = await fetch('/api/caption', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content }) })
      const data = await res.json()
      if (data.caption) setContent(data.caption)
    } catch { setError('Caption generation failed.') } finally { setCaptionLoading(false) }
  }

  async function handlePost() {
    if (!content.trim() && !image && !voiceBlob) return
    setLoading(true); setError('')
    let media_url = null, media_type = null

    if (voiceBlob) {
      const path = `${userId}/voice_${Date.now()}.webm`
      const { error: e } = await supabase.storage.from('post-media').upload(path, voiceBlob, { contentType: 'audio/webm' })
      if (e) { setError('Voice upload failed.'); setLoading(false); return }
      const { data } = supabase.storage.from('post-media').getPublicUrl(path)
      media_url = data.publicUrl; media_type = 'audio'
    } else if (image) {
      const ext = image.name.split('.').pop()
      const path = `${userId}/${Date.now()}.${ext}`
      const { error: e } = await supabase.storage.from('post-media').upload(path, image)
      if (e) { setError('Image upload failed.'); setLoading(false); return }
      const { data } = supabase.storage.from('post-media').getPublicUrl(path)
      media_url = data.publicUrl; media_type = 'image'
    }

    const { error: postError } = await supabase.from('posts').insert({ user_id: userId, circle_id: circleId, content: content.trim() || null, media_url, media_type })
    if (postError) { setError(postError.message); setLoading(false); return }
    setContent(''); setImage(null); setPreview(null); setVoiceBlob(null); setLoading(false); setFocused(false)
    router.refresh()
  }

  return (
    <div
      className="card overflow-hidden transition-all duration-200"
      style={focused ? { border: '1.5px solid var(--nia-violet)', boxShadow: '0 0 0 3px rgba(168,85,247,0.1)' } : {}}
    >
      {/* Top: avatar + textarea */}
      <div className="flex gap-3 p-4">
        <div
          className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-white font-bold text-sm"
          style={{ background: 'var(--grad-brand)' }}
        >
          +
        </div>
        <textarea
          value={content}
          onChange={e => setContent(e.target.value)}
          onFocus={() => setFocused(true)}
          placeholder={circleId ? "What's happening in this circle? 🎯" : "What's happening on campus? ✨"}
          rows={focused || content ? 3 : 1}
          className="flex-1 bg-transparent text-[15px] resize-none focus:outline-none leading-relaxed placeholder:text-[var(--text-tertiary)] transition-all"
          style={{ color: 'var(--text-primary)' }}
        />
      </div>

      {/* Image preview */}
      {preview && (
        <div className="relative mx-4 mb-3">
          <img src={preview} className="w-full rounded-2xl object-cover max-h-64" style={{ border: '1px solid var(--border)' }} alt="" />
          <button
            onClick={() => { setImage(null); setPreview(null) }}
            className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center rounded-full text-white transition-all active:scale-90"
            style={{ background: 'rgba(0,0,0,0.6)' }}
          >
            <X size={14} />
          </button>
        </div>
      )}

      {error && <p className="px-4 pb-2 text-sm text-red-500">{error}</p>}

      {/* Actions */}
      <div
        className="flex items-center gap-2 px-4 py-3 flex-wrap"
        style={{ borderTop: '1px solid var(--border)' }}
      >
        {/* Image */}
        <button
          onClick={() => fileRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all active:scale-90"
          style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}
        >
          <ImagePlus size={17} />
          <span className="hidden xs:inline">Photo</span>
        </button>

        {/* Voice */}
        <VoiceRecorder
          onRecorded={(blob) => { setVoiceBlob(blob); setImage(null); setPreview(null) }}
          onClear={() => setVoiceBlob(null)}
        />

        {/* AI caption */}
        <button
          onClick={generateCaption}
          disabled={captionLoading || (!content.trim() && !image)}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition-all active:scale-90 disabled:opacity-30"
          style={{ background: captionLoading ? 'rgba(255,217,61,0.15)' : 'var(--surface-2)', color: 'var(--nia-amber)' }}
          title="AI caption suggestion"
        >
          {captionLoading ? <Loader2 size={17} className="animate-spin" /> : <Sparkles size={17} />}
          <span className="hidden xs:inline">AI</span>
        </button>

        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImage} />

        {/* Post button */}
        <button
          onClick={handlePost}
          disabled={(!content.trim() && !image && !voiceBlob) || loading}
          className="ml-auto btn-primary flex items-center gap-1.5 px-5 py-2.5 text-sm"
          style={{ borderRadius: '12px' }}
        >
          {loading ? <Loader2 size={15} className="animate-spin" /> : null}
          {loading ? 'Posting…' : 'Post it 🚀'}
        </button>
      </div>
    </div>
  )
}

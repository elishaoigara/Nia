'use client'
import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ImagePlus, X, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function CreatePost({ userId }: { userId: string }) {
  const supabase = createClient()
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)
  const [content, setContent] = useState('')
  const [image, setImage] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setImage(file)
    setPreview(URL.createObjectURL(file))
  }

  function removeImage() {
    setImage(null)
    setPreview(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function handlePost() {
    if (!content.trim() && !image) return
    setLoading(true)
    setError('')

    let media_url = null

    if (image) {
      const ext = image.name.split('.').pop()
      const path = `${userId}/${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('post-media')
        .upload(path, image)

      if (uploadError) {
        setError('Image upload failed. Try again.')
        setLoading(false)
        return
      }

      const { data } = supabase.storage
        .from('post-media')
        .getPublicUrl(path)

      media_url = data.publicUrl
    }

    const { error: postError } = await supabase.from('posts').insert({
      user_id: userId,
      content: content.trim() || null,
      media_url,
      media_type: image ? 'image' : null,
    })

    if (postError) {
      setError(postError.message)
      setLoading(false)
      return
    }

    setContent('')
    setImage(null)
    setPreview(null)
    setLoading(false)
    router.refresh()
  }

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-100 dark:border-zinc-800 p-4 space-y-3">
      <textarea
        value={content}
        onChange={e => setContent(e.target.value)}
        placeholder="What's happening on campus?"
        rows={3}
        className="w-full bg-transparent text-sm resize-none focus:outline-none placeholder:text-zinc-400"
      />

      {preview && (
        <div className="relative w-full">
          <img
            src={preview}
            alt="preview"
            className="rounded-xl w-full max-h-72 object-cover"
          />
          <button
            onClick={removeImage}
            className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1 transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex items-center justify-between pt-1 border-t border-zinc-100 dark:border-zinc-800">
        <button
          onClick={() => fileRef.current?.click()}
          className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-purple-500 transition-colors"
        >
          <ImagePlus size={18} />
          <span>Photo</span>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImage}
        />

        <button
          onClick={handlePost}
          disabled={(!content.trim() && !image) || loading}
          className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white text-sm font-medium px-4 py-1.5 rounded-lg transition-colors"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : null}
          {loading ? 'Posting…' : 'Post'}
        </button>
      </div>
    </div>
  )
}
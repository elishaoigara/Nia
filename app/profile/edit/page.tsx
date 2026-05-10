'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Upload, Loader2 } from 'lucide-react'

export default function EditProfilePage() {
  const supabase = createClient()
  const router = useRouter()

  const [profile, setProfile] = useState<any>(null)
  const [fullName, setFullName] = useState('')
  const [bio, setBio] = useState('')
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchProfile()
  }, [])

  async function fetchProfile() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      router.push('/login')
      return
    }

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (data) {
      setProfile(data)
      setFullName(data.full_name || '')
      setBio(data.bio || '')
    }
    setLoading(false)
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      setError("Image size must be less than 5MB")
      return
    }

    setAvatarFile(file)
    setAvatarPreview(URL.createObjectURL(file))
    setError('')
  }

  async function handleSave() {
    if (!fullName.trim()) {
      setError("Full name is required")
      return
    }

    setSaving(true)
    setError('')

    let avatar_url = profile?.avatar_url

    if (avatarFile) {
      const fileExt = avatarFile.name.split('.').pop()
      const filePath = `${profile.id}/avatar.${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, avatarFile, { upsert: true })

      if (uploadError) {
        setError('Failed to upload avatar. Please try again.')
        setSaving(false)
        return
      }

      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath)
      avatar_url = data.publicUrl
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        full_name: fullName.trim(),
        bio: bio.trim() || null,
        avatar_url,
      })
      .eq('id', profile.id)

    if (updateError) {
      setError(updateError.message)
    } else {
      router.push(`/profile/${profile.id}`)
      router.refresh()
    }

    setSaving(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-purple-600" size={32} />
      </div>
    )
  }

  return (
    <main className="max-w-xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <button 
          onClick={() => router.back()} 
          className="text-zinc-400 hover:text-zinc-600 transition"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-2xl font-bold">Edit Profile</h1>
      </div>

      <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-100 dark:border-zinc-800 p-6 space-y-6">
        {/* Avatar */}
        <div className="flex flex-col items-center">
          <div className="relative w-28 h-28 mb-4">
            <div className="w-28 h-28 rounded-2xl overflow-hidden border-4 border-zinc-200 dark:border-zinc-700">
              {avatarPreview || profile?.avatar_url ? (
                <img
                  src={avatarPreview || profile?.avatar_url}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-5xl font-bold text-white">
                  {profile?.username?.[0]?.toUpperCase() || '?'}
                </div>
              )}
            </div>

            <label className="absolute bottom-0 right-0 bg-purple-600 hover:bg-purple-700 text-white p-2.5 rounded-full cursor-pointer transition shadow-md">
              <Upload size={18} />
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </label>
          </div>
          <p className="text-xs text-zinc-500">Click the icon to change avatar (max 5MB)</p>
        </div>

        {/* Form */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-4 py-3 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="Amara Osei"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1.5">
              Bio <span className="text-zinc-400">(optional)</span>
            </label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={4}
              className="w-full px-4 py-3 rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-transparent focus:outline-none focus:ring-2 focus:ring-purple-500 resize-y"
              placeholder="CS student at University of Nairobi. Love building things."
            />
          </div>
        </div>

        {error && (
          <p className="text-red-500 text-sm bg-red-50 dark:bg-red-950 p-3 rounded-xl">
            {error}
          </p>
        )}

        <button
          onClick={handleSave}
          disabled={saving || !fullName.trim()}
          className="w-full py-3.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-medium rounded-2xl transition flex items-center justify-center gap-2"
        >
          {saving && <Loader2 className="animate-spin" size={20} />}
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </main>
  )
}
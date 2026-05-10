'use client'
import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, X, ChevronLeft, ChevronRight } from 'lucide-react'

interface Story {
  id: string
  user_id: string
  media_url: string | null
  text_content: string | null
  bg_color: string | null
  created_at: string
  profiles: { id: string; username: string; avatar_url: string | null }
}

const BG_COLORS = [
  'linear-gradient(135deg,#FF6B6B,#A855F7)',
  'linear-gradient(135deg,#FF8E53,#FFD93D)',
  'linear-gradient(135deg,#4ECDC4,#A855F7)',
  'linear-gradient(135deg,#6BCB77,#4ECDC4)',
  'linear-gradient(135deg,#EC4899,#A855F7)',
  'linear-gradient(135deg,#FF6B6B,#FF8E53)',
]

function timeLeft(created_at: string) {
  const diff = 24 * 60 * 60 * 1000 - (Date.now() - new Date(created_at).getTime())
  const h = Math.floor(diff / 3600000)
  if (h > 0) return `${h}h`
  const m = Math.floor(diff / 60000)
  return `${m}m`
}

export default function StoriesBar({ currentUserId }: { currentUserId: string }) {
  const supabase = createClient()
  const [stories, setStories] = useState<Story[]>([])
  const [viewingStory, setViewingStory] = useState<Story | null>(null)
  const [viewIndex, setViewIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const [showCreate, setShowCreate] = useState(false)
  const [storyText, setStoryText] = useState('')
  const [selectedBg, setSelectedBg] = useState(BG_COLORS[0])
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [posting, setPosting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Group stories by user, keep only latest per user
  const grouped = stories.reduce((acc: Record<string, Story[]>, s) => {
    if (!acc[s.user_id]) acc[s.user_id] = []
    acc[s.user_id].push(s)
    return acc
  }, {})
  const userStories = Object.values(grouped)
  const hasMyStory = !!grouped[currentUserId]

  useEffect(() => {
    loadStories()
  }, [])

  async function loadStories() {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data } = await supabase
      .from('stories')
      .select('*, profiles:user_id (id, username, avatar_url)')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
    setStories((data as any) ?? [])
  }

  function openStory(userGroup: Story[], idx: number = 0) {
    setViewingStory(userGroup[idx])
    setViewIndex(idx)
    setProgress(0)
    startProgress(userGroup, idx)
  }

  function startProgress(group: Story[], idx: number) {
    if (progressRef.current) clearInterval(progressRef.current)
    setProgress(0)
    progressRef.current = setInterval(() => {
      setProgress(p => {
        if (p >= 100) {
          clearInterval(progressRef.current!)
          if (idx + 1 < group.length) {
            const next = idx + 1
            setViewIndex(next)
            setViewingStory(group[next])
            startProgress(group, next)
          } else {
            setViewingStory(null)
          }
          return 0
        }
        return p + 2
      })
    }, 100)
  }

  function closeStory() {
    if (progressRef.current) clearInterval(progressRef.current)
    setViewingStory(null)
    setProgress(0)
  }

  async function postStory() {
    setPosting(true)
    let media_url = null
    if (imageFile) {
      const path = `${currentUserId}/story_${Date.now()}.${imageFile.name.split('.').pop()}`
      const { error } = await supabase.storage.from('post-media').upload(path, imageFile)
      if (!error) {
        const { data } = supabase.storage.from('post-media').getPublicUrl(path)
        media_url = data.publicUrl
      }
    }
    await supabase.from('stories').insert({
      user_id: currentUserId,
      text_content: storyText.trim() || null,
      media_url,
      bg_color: imageFile ? null : selectedBg,
    })
    setStoryText(''); setImageFile(null); setImagePreview(null); setShowCreate(false); setPosting(false)
    loadStories()
  }

  const allGroups = userStories.sort((a, b) => {
    if (a[0].user_id === currentUserId) return -1
    if (b[0].user_id === currentUserId) return 1
    return 0
  })

  return (
    <>
      {/* Stories row */}
      <div className="card p-4 overflow-hidden">
        <div ref={scrollRef} className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
          {/* Add story */}
          <button
            onClick={() => setShowCreate(true)}
            className="flex flex-col items-center gap-1.5 flex-shrink-0"
          >
            <div className="relative">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center text-white"
                style={{ background: hasMyStory ? 'var(--grad-brand)' : 'var(--surface-2)' }}
              >
                {hasMyStory
                  ? <div className="w-full h-full rounded-2xl overflow-hidden">
                      {grouped[currentUserId][0].media_url
                        ? <img src={grouped[currentUserId][0].media_url} className="w-full h-full object-cover" alt="" />
                        : <div className="w-full h-full flex items-center justify-center text-lg font-bold" style={{ background: grouped[currentUserId][0].bg_color ?? 'var(--grad-brand)' }}>
                            {grouped[currentUserId][0].text_content?.[0] ?? '✨'}
                          </div>
                      }
                    </div>
                  : <Plus size={22} style={{ color: 'var(--text-tertiary)' }} />
                }
              </div>
              {!hasMyStory && (
                <div
                  className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-white"
                  style={{ background: 'var(--grad-brand)' }}
                >
                  <Plus size={12} strokeWidth={3} />
                </div>
              )}
            </div>
            <span className="text-[10px] font-semibold w-14 text-center truncate" style={{ color: 'var(--text-secondary)' }}>
              {hasMyStory ? 'Your story' : 'Add story'}
            </span>
          </button>

          {/* Other users' stories */}
          {allGroups
            .filter(g => g[0].user_id !== currentUserId)
            .map(group => (
              <button
                key={group[0].user_id}
                onClick={() => openStory(group)}
                className="flex flex-col items-center gap-1.5 flex-shrink-0"
              >
                <div className="w-14 h-14 rounded-2xl p-0.5" style={{ background: 'var(--grad-brand)' }}>
                  <div className="w-full h-full rounded-[10px] overflow-hidden" style={{ background: 'var(--surface-0)' }}>
                    <div className="w-full h-full rounded-[10px] overflow-hidden">
                      {group[0].media_url
                        ? <img src={group[0].media_url} className="w-full h-full object-cover" alt="" />
                        : <div className="w-full h-full flex items-center justify-center text-base font-bold text-white" style={{ background: group[0].bg_color ?? 'var(--grad-brand)' }}>
                            {group[0].text_content?.[0] ?? '✨'}
                          </div>
                      }
                    </div>
                  </div>
                </div>
                <span className="text-[10px] font-semibold w-14 text-center truncate" style={{ color: 'var(--text-secondary)' }}>
                  @{group[0].profiles?.username}
                </span>
              </button>
            ))}

          {allGroups.length === 0 && !hasMyStory && (
            <p className="text-sm self-center ml-2" style={{ color: 'var(--text-tertiary)' }}>
              Be the first to post a story! 👆
            </p>
          )}
        </div>
      </div>

      {/* Story viewer */}
      {viewingStory && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.95)' }}
        >
          <div className="relative w-full max-w-sm h-[75vh] rounded-3xl overflow-hidden" style={{ background: viewingStory.bg_color ?? '#111' }}>
            {/* Progress bar */}
            <div className="absolute top-3 left-3 right-3 z-10">
              <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.3)' }}>
                <div
                  className="h-full rounded-full transition-none"
                  style={{ width: `${progress}%`, background: 'rgba(255,255,255,0.9)' }}
                />
              </div>
            </div>

            {/* Header */}
            <div className="absolute top-8 left-3 right-3 z-10 flex items-center gap-2">
              <div className="w-8 h-8 rounded-full overflow-hidden" style={{ background: 'var(--grad-brand)' }}>
                {viewingStory.profiles?.avatar_url
                  ? <img src={viewingStory.profiles.avatar_url} className="w-full h-full object-cover" alt="" />
                  : <div className="w-full h-full flex items-center justify-center text-white text-xs font-bold">
                      {viewingStory.profiles?.username?.[0]?.toUpperCase()}
                    </div>
                }
              </div>
              <div className="flex-1">
                <p className="text-white text-xs font-bold">@{viewingStory.profiles?.username}</p>
                <p className="text-white/60 text-[10px]">{timeLeft(viewingStory.created_at)} left</p>
              </div>
              <button onClick={closeStory} className="text-white/80 p-1">
                <X size={20} />
              </button>
            </div>

            {/* Content */}
            {viewingStory.media_url
              ? <img src={viewingStory.media_url} className="w-full h-full object-cover" alt="" />
              : <div
                  className="w-full h-full flex items-center justify-center p-8"
                  style={{ background: viewingStory.bg_color ?? 'var(--grad-brand)' }}
                >
                  <p className="text-white text-2xl font-extrabold text-center leading-snug">
                    {viewingStory.text_content}
                  </p>
                </div>
            }
            {viewingStory.media_url && viewingStory.text_content && (
              <div className="absolute bottom-6 left-4 right-4 px-4 py-3 rounded-2xl" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)' }}>
                <p className="text-white text-base font-semibold text-center">{viewingStory.text_content}</p>
              </div>
            )}

            {/* Tap zones */}
            <button className="absolute left-0 top-0 w-1/3 h-full" onClick={closeStory} />
            <button className="absolute right-0 top-0 w-1/3 h-full" onClick={closeStory} />
          </div>
        </div>
      )}

      {/* Create story modal */}
      {showCreate && (
        <div
          className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowCreate(false) }}
        >
          <div className="w-full max-w-sm rounded-t-[28px] sm:rounded-[28px] p-6 space-y-5 anim-up" style={{ background: 'var(--surface-0)' }}>
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-lg">New Story ✨</h3>
              <button onClick={() => setShowCreate(false)} className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}>
                <X size={16} />
              </button>
            </div>

            {/* Preview */}
            <div
              className="w-full h-36 rounded-2xl overflow-hidden flex items-center justify-center relative"
              style={{ background: imagePreview ? undefined : selectedBg }}
            >
              {imagePreview
                ? <img src={imagePreview} className="w-full h-full object-cover" alt="" />
                : <p className="text-white text-xl font-extrabold text-center px-4">{storyText || 'Your story preview'}</p>
              }
            </div>

            <textarea
              value={storyText}
              onChange={e => setStoryText(e.target.value)}
              placeholder="What's on your mind? 💭"
              rows={2}
              className="input resize-none text-sm"
            />

            {/* BG colors */}
            {!imagePreview && (
              <div className="flex gap-2">
                {BG_COLORS.map(bg => (
                  <button
                    key={bg}
                    onClick={() => setSelectedBg(bg)}
                    className="w-8 h-8 rounded-xl transition-all active:scale-90"
                    style={{ background: bg, outline: selectedBg === bg ? '3px solid var(--nia-violet)' : 'none', outlineOffset: '2px' }}
                  />
                ))}
                <button
                  onClick={() => fileRef.current?.click()}
                  className="w-8 h-8 rounded-xl flex items-center justify-center ml-auto"
                  style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}
                >
                  <Plus size={16} />
                </button>
              </div>
            )}

            {imagePreview && (
              <button onClick={() => { setImageFile(null); setImagePreview(null) }} className="text-sm font-semibold" style={{ color: 'var(--nia-coral)' }}>
                Remove image
              </button>
            )}

            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => {
              const f = e.target.files?.[0]
              if (f) { setImageFile(f); setImagePreview(URL.createObjectURL(f)) }
            }} />

            <button
              onClick={postStory}
              disabled={posting || (!storyText.trim() && !imageFile)}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {posting ? 'Posting…' : 'Share Story 🚀'}
            </button>
          </div>
        </div>
      )}
    </>
  )
}

'use client'
import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, X, Pencil, Trash2, Check, Loader2, Eye } from 'lucide-react'

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
  if (h > 0) return `${h}h left`
  return `${Math.floor(diff / 60000)}m left`
}

export default function StoriesBar({ currentUserId }: { currentUserId: string }) {
  const supabase = createClient()
  const [stories, setStories] = useState<Story[]>([])
  const [viewingGroup, setViewingGroup] = useState<Story[] | null>(null)
  const [viewIndex, setViewIndex] = useState(0)
  const [progress, setProgress] = useState(0)
  const [showCreate, setShowCreate] = useState(false)

  // Create / Edit shared state
  const [editingStory, setEditingStory] = useState<Story | null>(null)
  const [storyText, setStoryText] = useState('')
  const [selectedBg, setSelectedBg] = useState(BG_COLORS[0])
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [posting, setPosting] = useState(false)

  // Delete confirm
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deletingStory, setDeletingStory] = useState<Story | null>(null)

  const [storyViewers, setStoryViewers] = useState<any[]>([])
  const [showViewers, setShowViewers] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Clean up the interval when the component unmounts
  useEffect(() => {
    return () => {
      if (progressRef.current) clearInterval(progressRef.current)
    }
  }, [])

  useEffect(() => { loadStories() }, [])

  async function loadStories() {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data } = await supabase
      .from('stories')
      .select('*, profiles:user_id (id, username, avatar_url)')
      .gte('created_at', since)
      .order('created_at', { ascending: false })
    setStories((data as any) ?? [])
  }

  const grouped = stories.reduce((acc: Record<string, Story[]>, s) => {
    if (!acc[s.user_id]) acc[s.user_id] = []
    acc[s.user_id].push(s)
    return acc
  }, {})

  const hasMyStory = !!grouped[currentUserId]
  const myStories = grouped[currentUserId] ?? []

  const allGroups = Object.values(grouped).sort((a, b) => {
    if (a[0].user_id === currentUserId) return -1
    if (b[0].user_id === currentUserId) return 1
    return 0
  })

  // ── Story viewer ───────────────────────────────────────────
  async function trackView(storyId: string) {
    await supabase.from('story_views').insert({ story_id: storyId, viewer_id: currentUserId }).select().limit(1)
  }

  async function loadViewers(storyId: string) {
    const { data } = await supabase
      .from('story_views')
      .select('profiles:viewer_id (id, username, avatar_url)')
      .eq('story_id', storyId)
    setStoryViewers(data ?? [])
  }

  function openStory(group: Story[], idx = 0) {
    setViewingGroup(group); setViewIndex(idx); setProgress(0)
    startProgress(group, idx)
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
            setViewIndex(next); startProgress(group, next)
          } else {
            setViewingGroup(null)
          }
          return 0
        }
        return p + 2
      })
    }, 100)
  }

  function closeViewer() {
    if (progressRef.current) clearInterval(progressRef.current)
    setViewingGroup(null); setProgress(0)
  }

  // ── Create / Edit ─────────────────────────────────────────
  function openCreate() {
    setEditingStory(null); setStoryText(''); setSelectedBg(BG_COLORS[0])
    setImageFile(null); setImagePreview(null); setShowCreate(true)
  }

  function openEdit(story: Story) {
    setEditingStory(story)
    setStoryText(story.text_content ?? '')
    setSelectedBg(story.bg_color ?? BG_COLORS[0])
    setImagePreview(story.media_url)
    setImageFile(null)
    closeViewer()
    setShowCreate(true)
  }

  async function saveStory() {
    setPosting(true)
    let media_url = editingStory?.media_url ?? null

    if (imageFile) {
      const path = `${currentUserId}/story_${Date.now()}.${imageFile.name.split('.').pop()}`
      const { error } = await supabase.storage.from('post-media').upload(path, imageFile)
      if (!error) {
        const { data } = supabase.storage.from('post-media').getPublicUrl(path)
        media_url = data.publicUrl
      }
    } else if (!imagePreview) {
      media_url = null // user removed the image
    }

    if (editingStory) {
      await supabase.from('stories').update({
        text_content: storyText.trim() || null,
        media_url,
        bg_color: media_url ? null : selectedBg,
      }).eq('id', editingStory.id)
    } else {
      await supabase.from('stories').insert({
        user_id: currentUserId,
        text_content: storyText.trim() || null,
        media_url,
        bg_color: media_url ? null : selectedBg,
      })
    }

    setShowCreate(false); setEditingStory(null); setPosting(false)
    loadStories()
  }

  // ── Delete ────────────────────────────────────────────────
  function promptDelete(story: Story) {
    setDeletingStory(story)
    setShowDeleteConfirm(true)
    closeViewer()
  }

  async function confirmDelete() {
    if (!deletingStory) return
    await supabase.from('stories').delete().eq('id', deletingStory.id)
    setShowDeleteConfirm(false); setDeletingStory(null)
    loadStories()
  }

  const viewingStory = viewingGroup?.[viewIndex] ?? null
  const viewingIsOwn = viewingStory?.user_id === currentUserId

  return (
    <>
      {/* Stories bar */}
      <div className="card p-4 overflow-hidden">
        <div className="flex gap-3 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>

          {/* Add / My story */}
          <button onClick={openCreate} className="flex flex-col items-center gap-1.5 shrink-0">
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl overflow-hidden flex items-center justify-center" style={{ background: hasMyStory ? 'var(--grad-brand)' : 'var(--surface-2)' }}>
                {hasMyStory ? (
                  myStories[0].media_url
                    ? <img src={myStories[0].media_url} className="w-full h-full object-cover" alt="" />
                    : <div className="w-full h-full flex items-center justify-center text-lg font-bold text-white" style={{ background: myStories[0].bg_color ?? 'var(--grad-brand)' }}>
                        {myStories[0].text_content?.[0] ?? '✨'}
                      </div>
                ) : (
                  <Plus size={22} style={{ color: 'var(--text-tertiary)' }} />
                )}
              </div>
              {!hasMyStory && (
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-white" style={{ background: 'var(--grad-brand)' }}>
                  <Plus size={12} strokeWidth={3} />
                </div>
              )}
            </div>
            <span className="text-[10px] font-semibold w-14 text-center truncate" style={{ color: 'var(--text-secondary)' }}>
              {hasMyStory ? 'Your story' : 'Add story'}
            </span>
          </button>

          {/* Other users (tap to view, own group can also edit/delete) */}
          {allGroups
            .filter(g => g[0].user_id !== currentUserId)
            .map(group => (
              <button key={group[0].user_id} onClick={() => openStory(group)} className="flex flex-col items-center gap-1.5 shrink-0">
                <div className="w-14 h-14 rounded-2xl p-0.5" style={{ background: 'var(--grad-brand)' }}>
                  <div className="w-full h-full rounded-[10px] overflow-hidden">
                    {group[0].media_url
                      ? <img src={group[0].media_url} className="w-full h-full object-cover" alt="" />
                      : <div className="w-full h-full flex items-center justify-center text-base font-bold text-white" style={{ background: group[0].bg_color ?? 'var(--grad-brand)' }}>
                          {group[0].text_content?.[0] ?? '✨'}
                        </div>
                    }
                  </div>
                </div>
                <span className="text-[10px] font-semibold w-14 text-center truncate" style={{ color: 'var(--text-secondary)' }}>
                  @{group[0].profiles?.username}
                </span>
              </button>
            ))}

          {hasMyStory && (
            <button onClick={() => openStory(myStories)} className="flex flex-col items-center gap-1.5 shrink-0">
              <div className="w-14 h-14 rounded-2xl border-2 overflow-hidden" style={{ borderColor: 'var(--nia-violet)', background: myStories[0].bg_color ?? 'var(--grad-brand)' }}>
                {myStories[0].media_url
                  ? <img src={myStories[0].media_url} className="w-full h-full object-cover" alt="" />
                  : <div className="w-full h-full flex items-center justify-center text-white font-bold text-lg" style={{ background: myStories[0].bg_color ?? 'var(--grad-brand)' }}>
                      {myStories[0].text_content?.[0] ?? '✨'}
                    </div>
                }
              </div>
              <span className="text-[10px] font-semibold w-14 text-center truncate" style={{ color: 'var(--nia-violet)' }}>View mine</span>
            </button>
          )}

          {allGroups.length === 0 && (
            <p className="text-sm self-center ml-2" style={{ color: 'var(--text-tertiary)' }}>Be the first to share a story! 👆</p>
          )}
        </div>
      </div>

      {/* ── Story viewer ─────────────────────────────────── */}
      {viewingStory && viewingGroup && (
        <div className="fixed inset-0 z-200 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.95)' }}>
          <div className="relative w-full max-w-sm h-[75vh] rounded-3xl overflow-hidden">

            {/* Progress bars — one per story in group */}
            <div className="absolute top-3 left-3 right-3 z-10 flex gap-1">
              {viewingGroup.map((_, i) => (
                <div key={i} className="flex-1 h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.3)' }}>
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: i < viewIndex ? '100%' : i === viewIndex ? `${progress}%` : '0%',
                      background: 'rgba(255,255,255,0.9)',
                      transition: i === viewIndex ? 'none' : undefined,
                    }}
                  />
                </div>
              ))}
            </div>

            {/* Header */}
            <div className="absolute top-8 left-3 right-3 z-10 flex items-center gap-2">
              <div className="w-8 h-8 rounded-full overflow-hidden" style={{ background: 'var(--grad-brand)' }}>
                {viewingStory.profiles?.avatar_url
                  ? <img src={viewingStory.profiles.avatar_url} className="w-full h-full object-cover" alt="" />
                  : <div className="w-full h-full flex items-center justify-center text-white text-xs font-bold">{viewingStory.profiles?.username?.[0]?.toUpperCase()}</div>
                }
              </div>
              <div className="flex-1">
                <p className="text-white text-xs font-bold">@{viewingStory.profiles?.username}</p>
                <p className="text-white/60 text-[10px]">{timeLeft(viewingStory.created_at)}</p>
              </div>

              {/* Own story controls */}
              {viewingIsOwn && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => { loadViewers(viewingStory.id); setShowViewers(true) }}
                    className="w-8 h-8 flex items-center justify-center rounded-xl"
                    style={{ background: 'rgba(255,255,255,0.2)' }}
                    title="Seen by"
                  >
                    <Eye size={14} className="text-white" />
                  </button>
                  <button
                    onClick={() => openEdit(viewingStory)}
                    className="w-8 h-8 flex items-center justify-center rounded-xl"
                    style={{ background: 'rgba(255,255,255,0.2)' }}
                  >
                    <Pencil size={14} className="text-white" />
                  </button>
                  <button
                    onClick={() => promptDelete(viewingStory)}
                    className="w-8 h-8 flex items-center justify-center rounded-xl"
                    style={{ background: 'rgba(239,68,68,0.3)' }}
                  >
                    <Trash2 size={14} className="text-white" />
                  </button>
                </div>
              )}

              <button onClick={closeViewer} className="w-8 h-8 flex items-center justify-center" style={{ color: 'rgba(255,255,255,0.8)' }}>
                <X size={20} />
              </button>
            </div>

            {/* Story content */}
            {viewingStory.media_url
              ? <img src={viewingStory.media_url} className="w-full h-full object-cover" alt="" />
              : <div className="w-full h-full flex items-center justify-center p-8" style={{ background: viewingStory.bg_color ?? 'var(--grad-brand)' }}>
                  <p className="text-white text-2xl font-extrabold text-center leading-snug">{viewingStory.text_content}</p>
                </div>
            }
            {viewingStory.media_url && viewingStory.text_content && (
              <div className="absolute bottom-6 left-4 right-4 px-4 py-3 rounded-2xl" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(8px)' }}>
                <p className="text-white text-base font-semibold text-center">{viewingStory.text_content}</p>
              </div>
            )}

            {/* Tap zones for prev/next */}
            <button className="absolute left-0 top-0 w-1/3 h-full opacity-0" onClick={() => {
              if (viewIndex > 0) { const prev = viewIndex - 1; setViewIndex(prev); startProgress(viewingGroup, prev) } else closeViewer()
            }} />
            <button className="absolute right-0 top-0 w-1/3 h-full opacity-0" onClick={() => {
              if (viewIndex + 1 < viewingGroup.length) { const next = viewIndex + 1; setViewIndex(next); startProgress(viewingGroup, next) } else closeViewer()
            }} />
          </div>
        </div>
      )}

      {/* ── Create / Edit story modal ─────────────────── */}
      {showCreate && (
        <div
          className="fixed inset-0 z-200 flex items-end sm:items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowCreate(false) }}
        >
          <div className="w-full max-w-sm rounded-t-[28px] sm:rounded-[28px] p-6 space-y-5 anim-up" style={{ background: 'var(--surface-0)' }}>
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-lg">{editingStory ? 'Edit Story ✏️' : 'New Story ✨'}</h3>
              <button onClick={() => setShowCreate(false)} className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'var(--surface-2)', color: 'var(--text-secondary)' }}>
                <X size={16} />
              </button>
            </div>

            {/* Preview */}
            <div
              className="w-full h-36 rounded-2xl overflow-hidden flex items-center justify-center relative cursor-pointer"
              style={{ background: imagePreview ? undefined : selectedBg }}
              onClick={() => !imagePreview && fileRef.current?.click()}
            >
              {imagePreview
                ? <img src={imagePreview} className="w-full h-full object-cover" alt="" />
                : <p className="text-white text-xl font-extrabold text-center px-4">{storyText || 'Tap to preview'}</p>
              }
            </div>

            <textarea
              value={storyText}
              onChange={e => setStoryText(e.target.value)}
              placeholder="What's on your mind? 💭"
              rows={2}
              className="input resize-none text-sm"
            />

            {/* BG colors (hide if image selected) */}
            {!imagePreview && (
              <div className="flex gap-2 items-center">
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
                  title="Add photo"
                >
                  <Plus size={16} />
                </button>
              </div>
            )}

            {imagePreview && (
              <button
                onClick={() => { setImageFile(null); setImagePreview(null) }}
                className="text-sm font-semibold flex items-center gap-1.5"
                style={{ color: 'var(--nia-coral)' }}
              >
                <X size={14} /> Remove image
              </button>
            )}

            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={e => {
                const f = e.target.files?.[0]
                if (f) { setImageFile(f); setImagePreview(URL.createObjectURL(f)) }
              }}
            />

            <button
              onClick={saveStory}
              disabled={posting || (!storyText.trim() && !imageFile && !imagePreview)}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              {posting ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              {posting ? 'Saving…' : editingStory ? 'Save changes' : 'Share Story 🚀'}
            </button>
          </div>
        </div>
      )}

      {/* ── Story viewers panel ──────────────────────── */}
      {showViewers && (
        <div
          className="fixed inset-0 z-300 flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={() => setShowViewers(false)}
        >
          <div
            className="w-full max-w-sm rounded-3xl overflow-hidden anim-pop"
            style={{ background: 'var(--surface-0)', boxShadow: 'var(--shadow-lg)', maxHeight: '60vh', display: 'flex', flexDirection: 'column' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border)' }}>
              <h3 className="font-extrabold text-base flex items-center gap-2">
                <Eye size={16} style={{ color: 'var(--nia-violet)' }} />
                Seen by {storyViewers.length > 0 ? `· ${storyViewers.length}` : ''}
              </h3>
              <button onClick={() => setShowViewers(false)} className="w-8 h-8 flex items-center justify-center rounded-xl" style={{ background: 'var(--surface-2)' }}>
                <X size={15} />
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-4 space-y-2">
              {storyViewers.length === 0 ? (
                <div className="text-center py-10 space-y-2">
                  <div className="text-3xl">👁️</div>
                  <p className="text-sm font-semibold">No views yet</p>
                  <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>Share your story to get more eyes on it</p>
                </div>
              ) : storyViewers.map((v: any, i: number) => {
                const p = v.profiles
                return (
                  <div key={i} className="flex items-center gap-3 px-2 py-2 rounded-2xl" style={{ background: 'var(--surface-1)' }}>
                    <div className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center text-white font-bold text-sm" style={{ background: 'var(--grad-brand)' }}>
                      {p?.avatar_url ? <img src={p.avatar_url} className="w-full h-full object-cover" alt="" /> : p?.username?.[0]?.toUpperCase()}
                    </div>
                    <span className="text-sm font-semibold">@{p?.username}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Delete story confirmation ─────────────────── */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-300 flex items-center justify-center px-4"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div
            className="w-full max-w-xs rounded-3xl p-6 space-y-4 anim-pop"
            style={{ background: 'var(--surface-0)', boxShadow: 'var(--shadow-lg)' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="text-center space-y-2">
              <div className="text-4xl">🗑️</div>
              <h3 className="font-extrabold text-lg">Delete story?</h3>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                It'll disappear for everyone immediately.
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="btn-ghost flex-1 text-sm py-2.5">
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 py-2.5 rounded-2xl text-sm font-bold text-white transition-all active:scale-95"
                style={{ background: '#ef4444' }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
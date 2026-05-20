'use client'

import { getFlag, getLanguageEmoji } from '@/lib/african-data'
import { useState, useRef, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  MessageCircle, Share2, Languages, Loader2, Play, Pause, Send,
  Repeat2, MoreHorizontal, Pencil, Trash2, X, Check, BadgeCheck,
  ImagePlus, Eye, Link2, VolumeX, UserX, Flag,
} from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import TipButton from '@/components/TipButton'
import PollCard from '@/components/PollCard'
import VideoPlayer from '@/components/VideoPlayer'
import MediaLightbox from '@/components/MediaLightbox'

function timeAgo(date: string) {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (s < 60) return `${s}s`
  if (s < 3600) return `${Math.floor(s / 60)}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  return `${Math.floor(s / 86400)}d`
}

const REACTIONS = ['❤️', '😂', '🔥', '😮', '👏', '😢']
const TENOR_KEY = 'AIzaSyAyimkuYQYF_FXVALexPm_sspTcFcjHFS4'

const FALLBACK_GIFS = [
  { url: 'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif', preview: 'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy_s.gif' },
  { url: 'https://media.giphy.com/media/3o7TKSjRrfIPjeiVyM/giphy.gif', preview: 'https://media.giphy.com/media/3o7TKSjRrfIPjeiVyM/giphy_s.gif' },
  { url: 'https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif', preview: 'https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy_s.gif' },
]

async function fetchGifs(query: string) {
  try {
    const endpoint = query.trim()
      ? `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(query)}&key=${TENOR_KEY}&limit=12&media_filter=gif,tinygif`
      : `https://tenor.googleapis.com/v2/featured?key=${TENOR_KEY}&limit=12&media_filter=gif,tinygif`
    const res = await fetch(endpoint)
    if (!res.ok) return FALLBACK_GIFS
    const data = await res.json()
    const results = (data.results ?? []).map((r: any) => ({
      url: r.media_formats?.gif?.url ?? '',
      preview: r.media_formats?.tinygif?.url ?? '',
    })).filter((g: any) => g.url)
    return results.length ? results : FALLBACK_GIFS
  } catch { return FALLBACK_GIFS }
}

// ── Toast Helper ─────────────────────────────────────────
function Toast({ msg }: { msg: string }) {
  return (
    <div 
      className="fixed bottom-22.5 left-1/2 -translate-x-1/2 bg-(--text-primary) text-(--surface-0) px-5.5 py-2.5 rounded-[40px] text-xs font-semibold z-9999 pointer-events-none whitespace-nowrap shadow-[0_4px_24px_rgba(0,0,0,0.25)] animate-[slide-up_0.2s_ease_forwards]"
    >
      {msg}
    </div>
  )
}

// ── Post Actions Menu ────────────────────────────────────
interface PostMenuProps {
  postId: string
  authorId: string
  currentUserId: string
  authorUsername: string
  content: string
  onEdit: () => void
  onDelete: () => void
}

function PostMenu({ postId, authorId, currentUserId, authorUsername, content, onEdit, onDelete }: PostMenuProps) {
  const [open, setOpen] = useState(false)
  const [toast, setToast] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const supabase = createClient()
  const isOwn = authorId === currentUserId

  useEffect(() => {
    if (!open) return
    const handleClickOutside = (e: MouseEvent) => { 
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) 
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  function showToast(m: string) { 
    setToast(m)
    setTimeout(() => setToast(''), 2400) 
  }

  async function copyLink() {
    await navigator.clipboard.writeText(`${window.location.origin}/posts/${postId}`)
    showToast('Link copied!')
    setOpen(false)
  }
  
  async function mute() {
    await supabase.from('mutes').upsert({ muter_id: currentUserId, muted_id: authorId })
    showToast(`@${authorUsername} muted`)
    setOpen(false)
  }
  
  async function block() {
    if (!confirm(`Block @${authorUsername}?`)) return
    await supabase.from('blocks').upsert({ blocker_id: currentUserId, blocked_id: authorId })
    showToast(`@${authorUsername} blocked`)
    setOpen(false)
  }
  
  function report() { 
    showToast('Report submitted — thank you')
    setOpen(false) 
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={e => { e.stopPropagation(); setOpen(o => !o) }}
        className="w-8 h-8 flex items-center justify-center rounded-xl transition-all active:scale-90 text-(--text-tertiary)"
        style={{ background: open ? 'var(--surface-2)' : 'transparent' }}
        aria-label="More options"
      >
        <MoreHorizontal size={18} />
      </button>

      {open && (
        <div
          onClick={e => e.stopPropagation()}
          className="absolute top-full right-0 mt-1.5 z-100 bg-(--surface-0) border border-(--border) rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.18)] min-w-47.5 overflow-hidden animate-[pop-in_0.18s_cubic-bezier(0.34,1.56,0.64,1)_forwards]"
        >
          <MenuItem icon={<Link2 size={15} />} label="Copy link" onClick={copyLink} />

          {isOwn ? (
            <>
              <Divider />
              {content !== null && <MenuItem icon={<Pencil size={15} />} label="Edit post" onClick={() => { onEdit(); setOpen(false) }} />}
              <MenuItem icon={<Trash2 size={15} />} label="Delete post" onClick={() => { onDelete(); setOpen(false) }} danger />
            </>
          ) : (
            <>
              <Divider />
              <MenuItem icon={<VolumeX size={15} />} label={`Mute @${authorUsername}`} onClick={mute} />
              <MenuItem icon={<UserX size={15} />} label={`Block @${authorUsername}`} onClick={block} />
              <Divider />
              <MenuItem icon={<Flag size={15} />} label="Report post" onClick={report} danger />
            </>
          )}
        </div>
      )}

      {toast && <Toast msg={toast} />}
    </div>
  )
}

function MenuItem({ icon, label, onClick, danger }: { icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2.5 px-4 py-2.5 w-full border-none cursor-pointer text-left text-sm font-semibold transition-colors duration-100
        ${danger ? 'text-red-500 hover:bg-red-500/5' : 'text-(--text-primary) hover:bg-(--surface-1)'}
      `}
    >
      {icon} <span>{label}</span>
    </button>
  )
}

function Divider() { return <div className="h-px bg-(--border) my-1" /> }

// ── Who-Reacted Modal ────────────────────────────────────
function ReactorModal({ postId, onClose }: { postId: string; onClose: () => void }) {
  const supabase = createClient()
  const [reactors, setReactors] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('reactions').select('emoji, profiles:user_id (id, username, avatar_url)').eq('post_id', postId)
      .then(({ data }) => { setReactors(data ?? []); setLoading(false) })
  }, [postId, supabase])

  return (
    <div 
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4 sm:pb-0 bg-black/60 backdrop-blur-xs"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-sm rounded-3xl overflow-hidden animate-[pop-in_0.2s_ease-out_forwards] bg-(--surface-0) shadow-(--shadow-lg) max-h-[70vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-(--border)">
          <h3 className="font-black text-base">Reactions</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl bg-(--surface-2)">
            <X size={15} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 p-4 space-y-2">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 size={20} className="animate-spin text-(--text-tertiary)" />
            </div>
          ) : reactors.length === 0 ? (
            <p className="text-center text-sm py-8 text-(--text-tertiary)">No reactions yet</p>
          ) : reactors.map((r, i) => (
            <Link key={i} href={`/profile/${r.profiles?.id}`} onClick={onClose}>
              <div className="flex items-center gap-3 px-3 py-2.5 rounded-2xl bg-(--surface-1) active:scale-[0.99] transition-transform">
                <div className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center text-white font-bold text-sm bg-(--grad-brand)">
                  {r.profiles?.avatar_url ? <img src={r.profiles.avatar_url} className="w-full h-full object-cover" alt="" /> : r.profiles?.username?.[0]?.toUpperCase()}
                </div>
                <span className="flex-1 text-sm font-bold">@{r.profiles?.username}</span>
                <span className="text-lg">{r.emoji}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Comment Input ─────────────────────────────────────────
interface CommentInputProps {
  onSubmit: (text: string, mediaUrl?: string, mediaType?: string) => Promise<void>
  posting: boolean
}

function CommentInput({ onSubmit, posting }: CommentInputProps) {
  const [text, setText] = useState('')
  const [mediaPreview, setMediaPreview] = useState<{ url: string; type: string } | null>(null)
  const [uploading, setUploading] = useState(false)
  const [showGifPicker, setShowGifPicker] = useState(false)
  const [gifQuery, setGifQuery] = useState('')
  const [gifResults, setGifResults] = useState<{ url: string; preview: string }[]>(FALLBACK_GIFS)
  const [gifLoading, setGifLoading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const isSubmitDisabled = (!text.trim() && !mediaPreview) || posting || uploading

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const path = `comments/${Date.now()}.${file.name.split('.').pop()}`
    const { error } = await supabase.storage.from('media').upload(path, file, { upsert: true })
    if (!error) {
      const { data } = supabase.storage.from('media').getPublicUrl(path)
      setMediaPreview({ url: data.publicUrl, type: file.type.startsWith('video') ? 'video' : 'image' })
    }
    setUploading(false)
    e.target.value = ''
  }

  async function openGifPicker() {
    if (showGifPicker) { setShowGifPicker(false); return }
    setShowGifPicker(true)
    setGifLoading(true)
    setGifResults(await fetchGifs(''))
    setGifLoading(false)
  }

  async function searchGifs(q: string) {
    setGifQuery(q)
    setGifLoading(true)
    setGifResults(await fetchGifs(q))
    setGifLoading(false)
  }

  async function submit() {
    if (isSubmitDisabled) return
    await onSubmit(text.trim(), mediaPreview?.url, mediaPreview?.type)
    setText('')
    setMediaPreview(null)
    setShowGifPicker(false)
  }

  return (
    <div className="p-3 space-y-2">
      {mediaPreview && (
        <div className="relative inline-block">
          {mediaPreview.type === 'video' ? (
            <video src={mediaPreview.url} className="h-28 rounded-xl object-cover" muted />
          ) : (
            <img src={mediaPreview.url} alt="Selected file preview" className="h-28 rounded-xl object-cover border border-(--border)" />
          )}
          <button 
            onClick={() => setMediaPreview(null)} 
            className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-white bg-black/75 transition-transform active:scale-90"
          >
            <X size={12} />
          </button>
        </div>
      )}

      {showGifPicker && (
        <div className="rounded-2xl overflow-hidden border border-(--border) bg-(--surface-1)">
          <div className="p-2">
            <input 
              value={gifQuery} 
              onChange={e => searchGifs(e.target.value)} 
              placeholder="Search GIFs…" 
              className="input w-full text-sm px-3 py-1.5" 
              autoFocus 
            />
          </div>
          <div className="grid grid-cols-4 gap-1 p-2 max-h-44 overflow-y-auto">
            {gifLoading ? (
              <div className="col-span-4 flex justify-center py-4">
                <Loader2 size={18} className="animate-spin text-(--text-tertiary)" />
              </div>
            ) : (
              gifResults.map((g, i) => (
                <button 
                  key={i} 
                  onClick={() => { setMediaPreview({ url: g.url, type: 'gif' }); setShowGifPicker(false) }} 
                  className="rounded-lg overflow-hidden aspect-square active:scale-95 transition-transform"
                >
                  <img src={g.preview || g.url} alt="GIF Result" className="w-full h-full object-cover" loading="lazy" />
                </button>
              ))
            )}
          </div>
          <p className="text-center text-[10px] pb-1.5 text-(--text-tertiary)">Powered by Tenor</p>
        </div>
      )}

      <div className="flex items-end gap-2">
        <div className="flex gap-1 pb-1">
          <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleFile} />
          <button 
            onClick={() => { setShowGifPicker(false); fileRef.current?.click() }} 
            disabled={uploading}
            className="w-8 h-8 flex items-center justify-center rounded-xl transition-all active:scale-90 text-(--text-tertiary) bg-(--surface-2)"
          >
            {uploading ? <Loader2 size={15} className="animate-spin" /> : <ImagePlus size={15} />}
          </button>
          <button 
            onClick={openGifPicker}
            className={`w-8 h-8 flex items-center justify-center rounded-xl transition-all active:scale-90 text-xs font-black
              ${showGifPicker ? 'text-white bg-(--nia-violet)' : 'text-(--text-tertiary) bg-(--surface-2)'}
            `}
          >
            GIF
          </button>
        </div>
        
        <textarea 
          value={text} 
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() } }}
          placeholder="Reply…" 
          rows={1}
          className="flex-1 px-3 py-2 rounded-2xl text-sm outline-none resize-none bg-(--surface-2) text-(--text-primary) border border-transparent min-h-9 max-h-24" 
        />
        
        <button 
          onClick={submit} 
          disabled={isSubmitDisabled}
          className="w-9 h-9 flex items-center justify-center rounded-xl text-white transition-all active:scale-90 disabled:opacity-40 shrink-0 bg-(--grad-brand)"
        >
          {posting ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
        </button>
      </div>
    </div>
  )
}

// ── Comment Row ───────────────────────────────────────────
function CommentRow({ comment: initialComment, currentUserId, onDelete }: { comment: any; currentUserId: string; onDelete: (id: string) => void }) {
  const supabase = createClient()
  const [comment, setComment] = useState(initialComment)
  const [lightbox, setLightbox] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState(comment.content ?? '')
  const [saving, setSaving] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const isOwn = comment.user_id === currentUserId

  async function saveEdit() {
    if (!editText.trim()) return
    setSaving(true)
    const { error } = await supabase.from('comments').update({ content: editText.trim() }).eq('id', comment.id)
    if (!error) {
      setComment((prev: any) => ({ ...prev, content: editText.trim() }))
      setEditing(false)
    }
    setSaving(false)
  }

  return (
    <div className="flex gap-2.5 group select-none">
      <Link href={`/profile/${comment.profiles?.id}`} className="shrink-0">
        <div className="w-7 h-7 rounded-full overflow-hidden flex items-center justify-center text-white font-bold text-xs bg-(--grad-brand)">
          {comment.profiles?.avatar_url ? <img src={comment.profiles.avatar_url} className="w-full h-full object-cover" alt="" /> : comment.profiles?.username?.[0]?.toUpperCase()}
        </div>
      </Link>
      <div className="flex-1 min-w-0 space-y-1">
        <div className="px-3 py-2 rounded-2xl rounded-tl-xs text-sm bg-(--surface-2)">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <Link href={`/profile/${comment.profiles?.id}`} className="font-bold text-xs mr-1.5 max-w-35 truncate inline-block align-bottom text-(--nia-violet)">
                @{comment.profiles?.username}
              </Link>
              {editing ? (
                <div className="mt-1 space-y-1">
                  <textarea 
                    value={editText} 
                    onChange={e => setEditText(e.target.value)} 
                    className="w-full text-sm rounded-lg px-2 py-1 resize-none outline-none bg-(--surface-1) text-(--text-primary) border border-(--border)" 
                    rows={2} 
                    autoFocus 
                  />
                  <div className="flex gap-2">
                    <button onClick={() => setEditing(false)} className="text-xs px-2 py-1 rounded-lg bg-(--surface-1) text-(--text-tertiary)">Cancel</button>
                    <button onClick={saveEdit} disabled={saving} className="text-xs px-2 py-1 rounded-lg text-white bg-(--nia-violet)">{saving ? 'Saving…' : 'Save'}</button>
                  </div>
                </div>
              ) : (
                comment.content && <span className="text-(--text-primary) wrap-break-word">{comment.content}</span>
              )}
            </div>
            
            {isOwn && !editing && (
              <div className="relative shrink-0">
                <button 
                  onClick={() => setShowMenu(!showMenu)} 
                  className="w-6 h-6 flex items-center justify-center rounded-lg opacity-0 group-hover:opacity-100 transition-opacity text-(--text-tertiary) bg-(--surface-1)"
                >
                  <MoreHorizontal size={12} />
                </button>
                {showMenu && (
                  <div className="absolute right-0 top-7 z-20 w-32 rounded-xl overflow-hidden bg-(--surface-0) border border-(--border) shadow-(--shadow-lg) animate-[pop-in_0.15s_ease_forwards]">
                    <button onClick={() => { setEditing(true); setShowMenu(false) }} className="flex items-center gap-2 w-full px-3 py-2 text-xs font-semibold text-left text-(--text-primary)">
                      <Pencil size={12} className="text-(--nia-violet)" /> Edit
                    </button>
                    <button onClick={() => { supabase.from('comments').delete().eq('id', comment.id); onDelete(comment.id); setShowMenu(false) }} className="flex items-center gap-2 w-full px-3 py-2 text-xs font-semibold text-left text-red-500">
                      <Trash2 size={12} /> Delete
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        
        {comment.media_url && (
          <div className="pl-1">
            {comment.media_type === 'video' ? (
              <video src={comment.media_url} controls className="rounded-xl max-h-48 max-w-55 border border-(--border)" />
            ) : (
              <>
                <img 
                  src={comment.media_url} 
                  alt="Comment Attachment" 
                  onClick={() => setLightbox(true)} 
                  className="rounded-xl max-h-48 max-w-55 object-cover cursor-pointer active:scale-[0.98] transition-transform border border-(--border)" 
                />
                {lightbox && <MediaLightbox items={[{ url: comment.media_url, type: 'image' }]} startIndex={0} onClose={() => setLightbox(false)} />}
              </>
            )}
          </div>
        )}
        <div className="text-[10px] pl-1 text-(--text-tertiary)">{timeAgo(comment.created_at)}</div>
      </div>
    </div>
  )
}

// ── Main Postcard ─────────────────────────────────────────
export default function PostCard({ post, currentUserId, defaultShowComments }: any) {
  const supabase = createClient()
  const router = useRouter()

  const reactionCounts: Record<string, number> = {}
  const myReaction = post.reactions?.find((r: any) => r.user_id === currentUserId)?.emoji ?? null
  post.reactions?.forEach((r: any) => { reactionCounts[r.emoji] = (reactionCounts[r.emoji] ?? 0) + 1 })

  const [activeReaction, setActiveReaction] = useState<string | null>(myReaction)
  const [localReactions, setLocalReactions] = useState<Record<string, number>>(reactionCounts)
  const [showReactionPicker, setShowReactionPicker] = useState(false)
  const [showReactorModal, setShowReactorModal] = useState(false)
  const [showComments, setShowComments] = useState(!!defaultShowComments)
  const [comments, setComments] = useState<any[]>([])
  const [loadingComments, setLoadingComments] = useState(!!defaultShowComments)
  const [posting, setPosting] = useState(false)
  const [translation, setTranslation] = useState<string | null>(null)
  const [translating, setTranslating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [reposted, setReposted] = useState(post.reposts?.some((r: any) => r.user_id === currentUserId) ?? false)
  const [repostCount, setRepostCount] = useState(post.reposts?.length ?? 0)
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(post.content ?? '')
  const [editLoading, setEditLoading] = useState(false)
  const [isDeleted, setIsDeleted] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [commentCount, setCommentCount] = useState(post.comments?.length ?? 0)
  const [viewCount, setViewCount] = useState<number>(post.view_count ?? 0)

  const viewTracked = useRef(false)
  const isOwn = post.profiles?.id === currentUserId
  const totalReactions = Object.values(localReactions).reduce((a, b) => a + b, 0)
  const topReactions = Object.entries(localReactions).filter(([, c]) => c > 0).sort(([, a], [, b]) => b - a).slice(0, 3)
  const poll = Array.isArray(post.poll) ? post.poll[0] : post.poll

  // Track viewport impression metrics
  useEffect(() => {
    if (viewTracked.current || !currentUserId) return
    const observer = new IntersectionObserver(async ([entry]) => {
      if (entry.isIntersecting && !viewTracked.current) {
        viewTracked.current = true
        observer.disconnect()
        const { error } = await supabase.from('post_views').insert({ post_id: post.id, user_id: currentUserId })
        if (!error) setViewCount(c => c + 1)
      }
    }, { threshold: 0.6 })
    
    const el = document.getElementById(`post-${post.id}`)
    if (el) observer.observe(el)
    return () => observer.disconnect()
  }, [currentUserId, post.id, supabase])

  // Hydrate explicit comments if on a localized focus frame view
  useEffect(() => {
    if (!defaultShowComments) return
    supabase.from('comments')
      .select('*, profiles:user_id (id, username, avatar_url)')
      .eq('post_id', post.id)
      .order('created_at', { ascending: true })
      .then(({ data }) => { setComments(data ?? []); setLoadingComments(false) })
  }, [defaultShowComments, post.id, supabase])

  async function saveEdit() {
    if (!editContent.trim()) return
    setEditLoading(true)
    const { error } = await supabase.from('posts').update({ content: editContent.trim(), updated_at: new Date().toISOString() }).eq('id', post.id)
    if (!error) { setIsEditing(false); router.refresh() }
    setEditLoading(false)
  }

  async function deletePost() {
    const { error } = await supabase.from('posts').delete().eq('id', post.id)
    if (!error) { setIsDeleted(true); router.refresh() }
    setShowDeleteConfirm(false)
  }

  async function handleReaction(emoji: string) {
    if (!currentUserId) return
    setShowReactionPicker(false)
    const newCounts = { ...localReactions }
    
    if (activeReaction === emoji) {
      await supabase.from('reactions').delete().match({ post_id: post.id, user_id: currentUserId })
      newCounts[emoji] = Math.max((newCounts[emoji] ?? 1) - 1, 0)
      setActiveReaction(null)
    } else {
      if (activeReaction) {
        await supabase.from('reactions').delete().match({ post_id: post.id, user_id: currentUserId })
        newCounts[activeReaction] = Math.max((newCounts[activeReaction] ?? 1) - 1, 0)
      }
      await supabase.from('reactions').insert({ post_id: post.id, user_id: currentUserId, emoji })
      newCounts[emoji] = (newCounts[emoji] ?? 0) + 1
      setActiveReaction(emoji)
    }
    setLocalReactions(newCounts)
  }

  async function handleRepost() {
    if (!currentUserId || reposted || isOwn) return
    await supabase.from('reposts').insert({ post_id: post.id, user_id: currentUserId })
    setReposted(true)
    setRepostCount((c: number) => c + 1)
  }

  async function loadComments() {
    if (showComments) { setShowComments(false); return }
    setLoadingComments(true)
    const { data } = await supabase.from('comments').select('*, profiles:user_id (id, username, avatar_url)').eq('post_id', post.id).order('created_at', { ascending: true })
    setComments(data ?? [])
    setLoadingComments(false)
    setShowComments(true)
  }

  async function submitComment(text: string, mediaUrl?: string, mediaType?: string) {
    if (!currentUserId) return
    setPosting(true)
    const payload: any = { post_id: post.id, user_id: currentUserId }
    if (text) payload.content = text
    if (mediaUrl) { payload.media_url = mediaUrl; payload.media_type = mediaType }
    
    const { data, error } = await supabase.from('comments').insert(payload).select('*, profiles:user_id (id, username, avatar_url)').single()
    if (!error && data) { 
      setComments(prev => [...prev, data])
      setCommentCount((c: number) => c + 1) 
    }
    setPosting(false)
    router.refresh()
  }

  async function handleTranslate() {
    if (translation) { setTranslation(null); return }
    if (!post.content) return
    setTranslating(true)
    try {
      const res = await fetch('/api/translate', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ text: post.content, targetLang: 'en' }) 
      })
      const data = await res.json()
      setTranslation(data.translation ?? null)
    } catch (err) {
      console.error(err)
    } finally { setTranslating(false) }
  }

  async function handleShare() {
    const url = `${window.location.origin}/posts/${post.id}`
    if (navigator.share) {
      try { await navigator.share({ title: `@${post.profiles?.username} on Nia`, text: post.content ?? '', url }) } catch {}
    } else {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleCommentDelete = useCallback((deletedId: string) => {
    setComments(prev => prev.filter(c => c.id !== deletedId))
    setCommentCount((c: number) => Math.max(0, c - 1))
  }, [])

  if (isDeleted) return null

  const displayName = post.is_anonymous ? 'Anonymous 🎭' : `@${post.profiles?.username}`
  const mediaItems: { url: string; type: 'image' | 'video' }[] = post.media_url && (post.media_type === 'image' || post.media_type === 'video')
    ? [{ url: post.media_url, type: post.media_type as 'image' | 'video' }, ...(Array.isArray(post.extra_media) ? post.extra_media : [])]
    : []

  return (
    <>
      <article
        id={`post-${post.id}`}
        className="card card-hover anim-up select-none"
        onClick={() => setShowReactionPicker(false)}
      >
        {/* ── Header ──────────────────────────────────────── */}
        <div className="flex items-start gap-3 p-4 pb-3">
          <Link href={post.is_anonymous ? '#' : `/profile/${post.profiles?.id}`} className="shrink-0">
            <div className="avatar-ring">
              <div className="w-10 h-10 rounded-full overflow-hidden" style={{ background: post.is_anonymous ? 'linear-gradient(135deg, #555, #333)' : 'var(--grad-brand)' }}>
                {!post.is_anonymous && post.profiles?.avatar_url ? (
                  <img src={post.profiles.avatar_url} className="w-full h-full object-cover" alt="Profile avatar" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white font-bold text-sm">
                    {post.is_anonymous ? '🎭' : post.profiles?.username?.[0]?.toUpperCase() ?? '?'}
                  </div>
                )}
              </div>
            </div>
          </Link>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Link href={post.is_anonymous ? '#' : `/profile/${post.profiles?.id}`} className="font-bold text-sm hover:underline max-w-37.5 truncate">
                {displayName}
              </Link>
              {post.profiles?.is_verified && <BadgeCheck size={15} className="text-(--nia-violet)" fill="rgba(168,85,247,0.15)" />}
              {!post.is_anonymous && post.profiles?.country && <span title={post.profiles.country} className="text-base leading-none">{getFlag(post.profiles.country)}</span>}
              {post.circles && (
                <Link href={`/circles/${post.circles.slug}`} className="text-xs font-bold px-2.5 py-0.5 rounded-full max-w-30 truncate bg-linear-to-br from-red-500/15 to-purple-500/15 text-(--nia-violet)">
                  {post.circles.name}
                </Link>
              )}
              {post.language && post.language !== 'english' && (
                <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-(--surface-2) text-(--text-tertiary)">
                  {getLanguageEmoji(post.language)} {post.language}
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-1.5 mt-0.5 text-xs text-(--text-tertiary)">
              {!post.is_anonymous && post.profiles?.country && (
                <span className="max-w-45 truncate">{post.profiles.city ? `${post.profiles.city}, ${post.profiles.country}` : post.profiles.country}</span>
              )}
              {!post.is_anonymous && <span>·</span>}
              <span>{timeAgo(post.created_at)}</span>
              {post.updated_at && post.updated_at !== post.created_at && <span className="italic">· edited</span>}
            </div>
          </div>

          <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
            {!isOwn && !post.is_anonymous && post.profiles?.id && (
              <TipButton recipientUserId={post.profiles.id} recipientUsername={post.profiles.username} />
            )}
            <PostMenu
              postId={post.id}
              authorId={post.profiles?.id ?? ''}
              currentUserId={currentUserId}
              authorUsername={post.profiles?.username ?? ''}
              content={post.content ?? ''}
              onEdit={() => setIsEditing(true)}
              onDelete={() => setShowDeleteConfirm(true)}
            />
          </div>
        </div>

        {/* ── Content Text / Translation Layout ───────────── */}
        <div className="px-4 pb-2 space-y-2">
          {isEditing ? (
            <div className="space-y-2 mt-1" onClick={e => e.stopPropagation()}>
              <textarea
                value={editContent}
                onChange={e => setEditContent(e.target.value)}
                className="w-full text-sm rounded-xl p-3 outline-none resize-none bg-(--surface-2) text-(--text-primary) border border-(--border)"
                rows={3}
              />
              <div className="flex justify-end gap-2">
                <button onClick={() => setIsEditing(false)} className="px-3 py-1.5 text-xs font-bold rounded-xl bg-(--surface-2) text-(--text-secondary)">Cancel</button>
                <button onClick={saveEdit} disabled={editLoading} className="px-3 py-1.5 text-xs font-bold rounded-xl text-white bg-(--nia-violet)">
                  {editLoading ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </div>
          ) : (
            <>
              {post.content && <p className="text-[15px] leading-relaxed text-(--text-primary) wrap-break-word whitespace-pre-wrap">{post.content}</p>}
              {translation && (
                <div className="p-3 rounded-xl border border-dashed border-(--border) bg-(--surface-1) animate-[slide-up_0.15s_ease_forwards]">
                  <p className="text-xs font-black mb-1 text-(--nia-violet) flex items-center gap-1">
                    <Languages size={12} /> Translated to English:
                  </p>
                  <p className="text-sm leading-relaxed text-(--text-secondary) wrap-break-word">{translation}</p>
                </div>
              )}
              {post.content && post.language && post.language !== 'english' && (
                <button
                  onClick={e => { e.stopPropagation(); handleTranslate() }}
                  disabled={translating}
                  className="text-xs font-bold flex items-center gap-1 text-(--nia-violet) hover:underline disabled:opacity-60"
                >
                  {translating ? <Loader2 size={12} className="animate-spin" /> : <Languages size={12} />}
                  {translation ? 'Show original' : 'Translate post'}
                </button>
              )}
            </>
          )}
        </div>

        {/* ── Poll Module Insertion ───────────────────────── */}
        {poll && (
          <div onClick={e => e.stopPropagation()}>
            <PollCard poll={poll} currentUserId={currentUserId} />
          </div>
        )}

        {/* ── Dynamic Media Grid ─────────────────────────── */}
        {mediaItems.length > 0 && (
          <div className="px-4 pb-3" onClick={e => e.stopPropagation()}>
            {mediaItems.length === 1 ? (
              <div className="rounded-2xl overflow-hidden border border-(--border) max-h-95 bg-(--surface-1)">
                {mediaItems[0].type === 'video' ? (
                  <VideoPlayer src={mediaItems[0].url} />
                ) : (
                  <img
                    src={mediaItems[0].url}
                    alt="Post media card"
                    className="w-full h-full object-cover cursor-pointer hover:opacity-95 transition-opacity"
                    onClick={() => setLightboxIndex(0)}
                  />
                )}
              </div>
            ) : (
              <div className={`grid gap-1.5 rounded-2xl overflow-hidden border border-(--border) bg-(--surface-1) ${mediaItems.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                {mediaItems.slice(0, 3).map((item, idx) => (
                  <div key={idx} className="aspect-square relative overflow-hidden bg-black/5">
                    {item.type === 'video' ? (
                      <video src={item.url} className="w-full h-full object-cover" muted playsInline />
                    ) : (
                      <img
                        src={item.url}
                        alt=""
                        className="w-full h-full object-cover cursor-pointer hover:scale-[1.02] transition-transform duration-200"
                        onClick={() => setLightboxIndex(idx)}
                      />
                    )}
                    {idx === 2 && mediaItems.length > 3 && (
                      <div 
                        className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-lg font-black pointer-events-none"
                      >
                        +{mediaItems.length - 3}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Reactions & Social Counters Toolbar ─────────── */}
        <div className="flex items-center justify-between px-4 py-1 border-t border-(--border) text-xs text-(--text-tertiary)">
          <button
            onClick={e => { e.stopPropagation(); if (totalReactions > 0) setShowReactorModal(true) }}
            className="flex items-center gap-1.5 py-1 hover:underline font-medium"
          >
            {topReactions.length > 0 && (
              <div className="flex items-center -space-x-1">
                {topReactions.map(([emoji]) => <span key={emoji} className="text-sm leading-none">{emoji}</span>)}
              </div>
            )}
            <span>{totalReactions > 0 ? `${totalReactions.toLocaleString()} reactions` : 'No reactions yet'}</span>
          </button>
          
          <div className="flex items-center gap-3 font-semibold">
            <span className="flex items-center gap-1"><Eye size={13} /> {viewCount.toLocaleString()}</span>
            <span>{commentCount} replies</span>
            <span>{repostCount} reposts</span>
          </div>
        </div>

        {/* ── Bottom Call To Action Action Bar ────────────── */}
        <div className="flex items-center justify-between px-2 py-1.5 border-t border-(--border) bg-(--surface-1)/30">
          <div className="relative flex-1 flex justify-center" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setShowReactionPicker(!showReactionPicker)}
              className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold w-full transition-all active:scale-95
                ${activeReaction ? 'text-(--nia-violet)' : 'text-(--text-secondary) hover:bg-(--surface-2)'}
              `}
            >
              <span className="text-base leading-none">{activeReaction ?? '❤️'}</span>
              <span>{activeReaction ? 'Reacted' : 'React'}</span>
            </button>
            
            {showReactionPicker && (
              <div className="absolute bottom-full mb-2 left-4 bg-(--surface-0) border border-(--border) rounded-2xl p-1.5 shadow-(--shadow-lg) flex items-center gap-1 z-30 animate-[pop-in_0.15s_ease_forwards]">
                {REACTIONS.map(emoji => (
                  <button
                    key={emoji}
                    onClick={() => handleReaction(emoji)}
                    className="text-xl p-1 rounded-xl hover:bg-(--surface-2) active:scale-125 transition-all duration-100"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex-1 flex justify-center">
            <button
              onClick={e => { e.stopPropagation(); loadComments() }}
              className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold w-full transition-all active:scale-95 text-(--text-secondary) hover:bg-(--surface-2)
                ${showComments ? 'text-(--nia-violet)' : ''}
              `}
            >
              <MessageCircle size={18} />
              <span>Reply</span>
            </button>
          </div>

          <div className="flex-1 flex justify-center">
            <button
              onClick={e => { e.stopPropagation(); handleRepost() }}
              disabled={reposted || isOwn}
              className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold w-full transition-all active:scale-95 disabled:opacity-40 disabled:active:scale-100
                ${reposted ? 'text-green-500' : 'text-(--text-secondary) hover:bg-(--surface-2)'}
              `}
            >
              <Repeat2 size={18} />
              <span>{reposted ? 'Reposted' : 'Repost'}</span>
            </button>
          </div>

          <div className="flex-1 flex justify-center">
            <button
              onClick={e => { e.stopPropagation(); handleShare() }}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-sm font-bold text-(--text-secondary) hover:bg-(--surface-2) w-full transition-all active:scale-95"
            >
              <Share2 size={18} />
              <span>Share</span>
            </button>
          </div>
        </div>

        {/* ── Active Comment Feed Drawer Section ──────────── */}
        {showComments && (
          <div className="border-t border-(--border) bg-(--surface-1)/10" onClick={e => e.stopPropagation()}>
            <CommentInput onSubmit={submitComment} posting={posting} />
            
            {loadingComments ? (
              <div className="flex justify-center py-6">
                <Loader2 size={20} className="animate-spin text-(--text-tertiary)" />
              </div>
            ) : (
              comments.length > 0 && (
                <div className="px-4 pb-4 pt-2 space-y-3 border-t border-(--border)/60 max-h-85 overflow-y-auto custom-scrollbar">
                  {comments.map(comment => (
                    <CommentRow
                      key={comment.id}
                      comment={comment}
                      currentUserId={currentUserId}
                      onDelete={handleCommentDelete}
                    />
                  ))}
                </div>
              )
            )}
          </div>
        )}
      </article>

      {/* ── Lightboxes & Modals Portals ─────────────────── */}
      {showReactorModal && <ReactorModal postId={post.id} onClose={() => setShowReactorModal(false)} />}
      
      {lightboxIndex !== null && (
        <MediaLightbox
          items={mediaItems}
          startIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}

      {/* Delete Confirmation Modal Layer */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-100 flex items-center justify-center bg-black/60 backdrop-blur-xs px-4" onClick={() => setShowDeleteConfirm(false)}>
          <div className="bg-(--surface-0) border border-(--border) w-full max-w-sm rounded-3xl p-5 shadow-(--shadow-2xl) space-y-4 animate-[pop-in_0.18s_ease_forwards]" onClick={e => e.stopPropagation()}>
            <div className="space-y-1">
              <h4 className="font-black text-base text-(--text-primary)">Delete Post?</h4>
              <p className="text-xs text-(--text-tertiary)">This action cannot be undone. This post will permanently disappear from the feed streams.</p>
            </div>
            <div className="flex gap-2.5">
              <button onClick={() => setShowDeleteConfirm(false)} className="flex-1 py-2.5 text-xs font-bold rounded-xl bg-(--surface-2) text-(--text-secondary) active:scale-95 transition-transform">Cancel</button>
              <button onClick={deletePost} className="flex-1 py-2.5 text-xs font-bold rounded-xl text-white bg-red-500 active:scale-95 transition-transform">Delete</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
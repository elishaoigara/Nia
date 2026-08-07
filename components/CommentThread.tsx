'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Heart, MoreHorizontal, Play, Trash2, MessageCircle, ImagePlus, X, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { Comment, CommentNode, GifApiResult, UserReference } from '@/types/domain'

interface CommentMedia {
  url:  string
  type: 'image' | 'video' | 'gif'
}

interface CommentThreadProps {
  comments:      Comment[]
  currentUserId: string
  postId:        string
  postOwnerId?:  string
  currentUserProfile?: { avatar_url?: string | null; username?: string }
}

interface GifResult {
  url:     string
  preview: string
}

const TENOR_KEY = process.env.NEXT_PUBLIC_TENOR_API_KEY ?? ''

// Soft-delete sentinel: deleting a comment overwrites its content with this
// marker instead of removing the row, so replies underneath keep their
// place in the thread instead of becoming orphaned root comments.
const DELETED_MARKER = '__deleted__'

const FALLBACK_GIFS: GifResult[] = [
  { url: 'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif', preview: 'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy_s.gif' },
  { url: 'https://media.giphy.com/media/3o7TKSjRrfIPjeiVyM/giphy.gif', preview: 'https://media.giphy.com/media/3o7TKSjRrfIPjeiVyM/giphy_s.gif' },
  { url: 'https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy.gif',  preview: 'https://media.giphy.com/media/26ufdipQqU2lhNA4g/giphy_s.gif' },
  { url: 'https://media.giphy.com/media/l46CyJmS9KUbokzsI/giphy.gif',  preview: 'https://media.giphy.com/media/l46CyJmS9KUbokzsI/giphy_s.gif' },
]

function timeAgo(date: string) {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (s < 60)    return `${s}s`
  if (s < 3600)  return `${Math.floor(s / 60)}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  return `${Math.floor(s / 86400)}d`
}

function buildMedia(comment: Comment): CommentMedia[] {
  const out: CommentMedia[] = []
  if (comment.media_url && comment.media_type) {
    out.push({ url: comment.media_url, type: comment.media_type })
  }
  if (Array.isArray(comment.extra_media)) {
    for (const m of comment.extra_media) {
      if (m?.url && m?.type) out.push({ url: m.url, type: m.type })
    }
  }
  return out
}

function CommentMediaGrid({ media }: { media: CommentMedia[] }) {
  if (media.length === 0) return null
  const m = media[0]
  return (
    <div className="comment-media">
      {media.length === 1 ? (
        m.type === 'video'
          ? <video src={m.url} controls style={{ width: '100%', display: 'block', maxHeight: 240, objectFit: 'cover' }} />
          : <img src={m.url} alt={m.type === 'gif' ? 'GIF' : ''} loading="lazy" />
      ) : (
        <div className="comment-media-grid">
          {media.slice(0, 4).map((item, i) => (
            <div key={i} style={{ position: 'relative' }}>
              {item.type === 'video' ? (
                <>
                  <video src={item.url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.3)' }}>
                    <Play size={20} fill="#fff" color="#fff" />
                  </div>
                </>
              ) : (
                <img src={item.url} alt="" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Inline reply composer ─────────────────────────── */
function InlineReplyBox({
  postId, parentId, replyingTo, currentUserId, currentUserProfile, postOwnerId, onCancel, onSuccess,
}: {
  postId:              string
  parentId:            string
  replyingTo:          string
  currentUserId:       string
  currentUserProfile?: { avatar_url?: string | null; username?: string }
  postOwnerId?:        string
  onCancel:            () => void
  onSuccess:           () => void
}) {
  const supabase  = createClient()
  const [text,       setText]       = useState(`@${replyingTo} `)
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState('')
  const [media,      setMedia]      = useState<{ file?: File; preview: string; type: 'image' | 'gif'; gifUrl?: string }[]>([])
  const [showGifs,   setShowGifs]   = useState(false)
  const [gifQuery,   setGifQuery]   = useState('')
  const [gifResults, setGifResults] = useState<GifResult[]>([])
  const [gifLoading, setGifLoading] = useState(false)

  const textRef     = useRef<HTMLTextAreaElement>(null)
  const imageRef    = useRef<HTMLInputElement>(null)
  const gifPanelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    textRef.current?.focus()
    const len = textRef.current?.value.length ?? 0
    textRef.current?.setSelectionRange(len, len)
  }, [])

  // Close GIF panel on outside click
  useEffect(() => {
    if (!showGifs) return
    function handle(e: MouseEvent) {
      if (gifPanelRef.current && !gifPanelRef.current.contains(e.target as Node)) setShowGifs(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [showGifs])

  const searchGifs = useCallback(async (q: string) => {
    setGifLoading(true)
    try {
      const url = q
        ? `https://tenor.googleapis.com/v2/search?q=${encodeURIComponent(q)}&key=${TENOR_KEY}&limit=12&media_filter=gif,tinygif`
        : `https://tenor.googleapis.com/v2/featured?key=${TENOR_KEY}&limit=12&media_filter=gif,tinygif`
      const res = await fetch(url)
      if (!res.ok) { setGifResults(FALLBACK_GIFS); return }
      const json = await res.json() as { results?: GifApiResult[] }
      const results: GifResult[] = (json.results ?? []).map(result => ({
        url: result.media_formats?.gif?.url ?? result.media_formats?.tinygif?.url ?? '',
        preview: result.media_formats?.tinygif?.url ?? result.media_formats?.gif?.url ?? '',
      })).filter(result => result.url)
      setGifResults(results.length ? results : FALLBACK_GIFS)
    } catch {
      setGifResults(FALLBACK_GIFS)
    } finally {
      setGifLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!showGifs) return
    const timer = window.setTimeout(() => void searchGifs(gifQuery), 200)
    return () => window.clearTimeout(timer)
  }, [showGifs, gifQuery, searchGifs])

  function pickGif(gif: GifResult) {
    // Only one GIF at a time, replaces any existing GIF
    setMedia(prev => [...prev.filter(m => m.type !== 'gif'), { preview: gif.preview, type: 'gif', gifUrl: gif.url }])
    setShowGifs(false)
  }

  function autoGrow() {
    const el = textRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 100) + 'px'
  }

  function addImages(files: FileList | null) {
    if (!files) return
    const canAdd = 4 - media.filter(m => m.type === 'image').length
    const items  = Array.from(files).slice(0, canAdd)
    setMedia(prev => [...prev, ...items.map(f => ({ file: f, preview: URL.createObjectURL(f), type: 'image' as const }))])
    if (imageRef.current) imageRef.current.value = ''
  }

  function removeMedia(i: number) {
    setMedia(prev => {
      if (prev[i].file) URL.revokeObjectURL(prev[i].preview)
      return prev.filter((_, j) => j !== i)
    })
  }

  const hasGif     = media.some(m => m.type === 'gif')
  const imageCount = media.filter(m => m.type === 'image').length
  const canSend    = !loading && (text.replace(`@${replyingTo}`, '').trim().length > 0 || media.length > 0)

  async function submit() {
    if (!canSend) return
    setLoading(true); setError('')
    try {
      let media_url:   string | null = null
      let media_type:  string | null = null
      let extra_media: { url: string; type: string }[] = []

      if (media.length > 0) {
        const uploaded: { url: string; type: string }[] = []
        for (const item of media) {
          if (item.type === 'gif' && item.gifUrl) {
            uploaded.push({ url: item.gifUrl, type: 'gif' })
          } else if (item.file) {
            const ext  = item.file.name.split('.').pop() ?? 'jpg'
            const path = `${currentUserId}/reply_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
            const { error: upErr } = await supabase.storage.from('post-media').upload(path, item.file, { contentType: item.file.type })
            if (upErr) { setError('Upload failed'); setLoading(false); return }
            uploaded.push({ url: supabase.storage.from('post-media').getPublicUrl(path).data.publicUrl, type: 'image' })
          }
        }
        if (uploaded.length > 0) {
          media_url   = uploaded[0].url
          media_type  = uploaded[0].type
          extra_media = uploaded.slice(1)
        }
      }

      const payload: {
        post_id: string
        user_id: string
        content: string | null
        media_url: string | null
        media_type: string | null
        extra_media: { url: string; type: string }[] | null
        parent_id?: string
      } = {
        post_id:     postId,
        user_id:     currentUserId,
        content:     text.trim() || null,
        media_url,
        media_type,
        extra_media: extra_media.length ? extra_media : null,
        parent_id:   parentId,
      }

      const { error: insertErr } = await supabase.from('comments').insert(payload)
      if (insertErr) {
        if (insertErr.code === '42703') {
          delete payload.parent_id
          const { error: retryErr } = await supabase.from('comments').insert(payload)
          if (retryErr) { setError(retryErr.message); setLoading(false); return }
        } else {
          setError(insertErr.message); setLoading(false); return
        }
      }

      // Notify post owner — skip self-comment
      if (postOwnerId && postOwnerId !== currentUserId) {
        await supabase.from('notifications').insert({
          user_id: postOwnerId,
          actor_id: currentUserId,
          type: 'comment',
          entity_id: postId,
          message: `${currentUserProfile?.username ?? 'Someone'} commented on your post`,
          is_read: false,
        })
      }

      media.forEach(m => { if (m.file) URL.revokeObjectURL(m.preview) })
      onSuccess()
    } catch (e) {
      console.error(e); setError('Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const initials = currentUserProfile?.username?.[0]?.toUpperCase() ?? '?'

  return (
    <div className="inline-reply-box">
      <div className="inline-reply-line" />

      <div className="inline-reply-inner">
        {/* Avatar */}
        <div className="inline-reply-avatar">
          {currentUserProfile?.avatar_url
            ? <img src={currentUserProfile.avatar_url} alt="" />
            : initials
          }
        </div>

        <div style={{ flex: 1, minWidth: 0, position: 'relative' }}>
          {error && <p style={{ fontSize: 12, color: '#f43f5e', margin: '0 0 4px' }}>{error}</p>}

          <textarea
            ref={textRef}
            className="inline-reply-input"
            value={text}
            rows={1}
            onChange={e => { setText(e.target.value); autoGrow() }}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() } }}
            disabled={loading}
            placeholder={`Reply to @${replyingTo}…`}
          />

          {/* Media previews */}
          {media.length > 0 && (
            <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
              {media.map((m, i) => (
                <div key={i} style={{ position: 'relative' }}>
                  <img src={m.preview} alt="" style={{ width: 64, height: 64, borderRadius: 10, objectFit: 'cover', border: '1px solid var(--border)', display: 'block' }} />
                  {m.type === 'gif' && (
                    <span style={{ position: 'absolute', bottom: 3, left: 3, background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 9, fontWeight: 800, borderRadius: 4, padding: '1px 4px', letterSpacing: 0.5 }}>GIF</span>
                  )}
                  <button onClick={() => removeMedia(i)} style={{ position: 'absolute', top: -4, right: -4, width: 17, height: 17, borderRadius: '50%', background: '#0f172a', border: '1.5px solid #fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
                    <X size={9} color="#fff" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* GIF picker panel */}
          {showGifs && (
            <div ref={gifPanelRef} style={{
              position: 'absolute', bottom: '100%', left: 0, right: 0, marginBottom: 6,
              background: 'var(--surface-1)', border: '1px solid var(--border)',
              borderRadius: 14, padding: 10, boxShadow: '0 -8px 24px rgba(0,0,0,0.2)', zIndex: 60,
            }}>
              <input
                type="text"
                placeholder="Search GIFs…"
                value={gifQuery}
                onChange={e => setGifQuery(e.target.value)}
                style={{
                  width: '100%', boxSizing: 'border-box', background: 'var(--surface-2)',
                  border: 'none', borderRadius: 20, padding: '7px 12px',
                  fontSize: 13, color: 'var(--text-primary)', outline: 'none',
                  marginBottom: 8, fontFamily: 'inherit',
                }}
              />
              {gifLoading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 12 }}>
                  <Loader2 size={18} className="animate-spin" style={{ color: 'var(--text-tertiary)' }} />
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 3, maxHeight: 180, overflowY: 'auto' }}>
                  {gifResults.map((g, i) => (
                    <button key={i} onClick={() => pickGif(g)} style={{
                      border: 'none', padding: 0, cursor: 'pointer', borderRadius: 8,
                      overflow: 'hidden', aspectRatio: '1', background: 'var(--surface-2)',
                    }}>
                      <img src={g.preview} alt="GIF" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Action row */}
          <div className="inline-reply-actions">
            <input ref={imageRef} type="file" accept="image/*" multiple hidden onChange={e => addImages(e.target.files)} />

            {/* Image button — disabled when GIF is attached */}
            <button
              onClick={() => imageRef.current?.click()}
              disabled={hasGif || imageCount >= 4}
              className="inline-reply-btn"
              aria-label="Add image"
              title={hasGif ? "Remove GIF to add images" : "Add image"}
              style={{ opacity: (hasGif || imageCount >= 4) ? 0.4 : 1 }}
            >
              <ImagePlus size={15} />
            </button>

            {/* GIF button — disabled when images are attached */}
            <button
              onClick={() => setShowGifs(p => !p)}
              disabled={imageCount > 0}
              className="inline-reply-btn"
              aria-label="Add GIF"
              title={imageCount > 0 ? "Remove images to add a GIF" : "Add GIF"}
              style={{
                fontWeight: 800, fontSize: 11,
                color: showGifs ? 'var(--nia-violet)' : 'var(--text-tertiary)',
                opacity: imageCount > 0 ? 0.4 : 1,
              }}
            >
              GIF
            </button>

            <div style={{ flex: 1 }} />

            <button onClick={onCancel} className="inline-reply-btn" style={{ fontSize: 12, padding: '4px 10px', borderRadius: 20 }}>
              Cancel
            </button>
            <button onClick={submit} disabled={!canSend} className="inline-reply-send">
              {loading ? <Loader2 size={13} className="animate-spin" /> : 'Reply'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Single comment row ────────────────────────────── */
function CommentRow({
  comment,
  hasChildren,
  currentUserId,
  currentUserProfile,
  postId,
  postOwnerId,
  depth,
}: {
  comment:             CommentNode
  hasChildren:         boolean
  currentUserId:       string
  currentUserProfile?: { avatar_url?: string | null; username?: string }
  postId:              string
  postOwnerId?:        string
  depth:               number
}) {
  const supabase  = createClient()
  const router    = useRouter()
  const profile   = comment.profiles
  const likesList = (comment.likes ?? []) as UserReference[]

  const [liked,       setLiked]       = useState(() => likesList.some(like => like.user_id === currentUserId))
  const [likeCount,   setLikeCount]   = useState(likesList.length)
  const [showMenu,    setShowMenu]    = useState(false)
  const [softDeleted, setSoftDeleted] = useState(false)
  const [replying,    setReplying]    = useState(false)
  const [showReplies, setShowReplies] = useState(true)

  const menuRef = useRef<HTMLDivElement>(null)
  const isOwner = currentUserId === comment.user_id

  useEffect(() => {
    if (!showMenu) return
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false)
    }
    function handleKey(e: KeyboardEvent) { if (e.key === 'Escape') setShowMenu(false) }
    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKey)
    return () => { document.removeEventListener('mousedown', handleClick); document.removeEventListener('keydown', handleKey) }
  }, [showMenu])

  const media     = buildMedia(comment)
  const children = comment.children
  const initials  = profile?.username?.[0]?.toUpperCase() ?? '?'
  const isDeleted = softDeleted || comment.content === DELETED_MARKER

  async function toggleLike() {
    let nowLiked = false
    setLiked(prev => { nowLiked = !prev; return !prev })
    setLikeCount((prev: number) => nowLiked ? prev + 1 : prev - 1)
    if (liked) {
      await supabase.from('comment_likes').delete().eq('comment_id', comment.id).eq('user_id', currentUserId)
    } else {
      await supabase.from('comment_likes').insert({ comment_id: comment.id, user_id: currentUserId })
    }
  }

  async function deleteComment() {
    setShowMenu(false)
    // Soft-delete: overwrite content/media instead of removing the row, so
    // any replies underneath this comment keep their place in the thread
    // rather than becoming orphaned root comments after the next refresh.
    setSoftDeleted(true)
    await supabase
      .from('comments')
      .update({ content: DELETED_MARKER, media_url: null, media_type: null, extra_media: null })
      .eq('id', comment.id)
      .eq('user_id', currentUserId)
    router.refresh()
  }

  // max indent depth = 2 (keeps layout clean on mobile)
  const canNestDeeper = depth < 2

  return (
    <div className={`comment-row-wrap${depth > 0 ? ' comment-row-nested' : ''}`}>
      <div className="comment-row">
        {/* Left: avatar + connecting line */}
        <div className="comment-left">
          <Link href={`/profile/${profile?.id}`} className="comment-avatar">
            {profile?.avatar_url ? <img src={profile.avatar_url} alt={profile.username} /> : initials}
          </Link>
          {/* show line if has children/replies or has inline reply box open */}
          {(hasChildren || replying || (children.length > 0 && showReplies)) && (
            <div className="comment-line" />
          )}
        </div>

        {/* Right: body */}
        <div className="comment-body">
          {isDeleted ? (
            <p style={{
              fontSize: 13, fontStyle: 'italic', color: 'var(--text-tertiary)',
              padding: '6px 0', margin: 0,
            }}>
              [deleted]
            </p>
          ) : (
            <>
              <div className="comment-meta">
                <Link href={`/profile/${profile?.id}`} className="comment-username">
                  {profile?.full_name ?? profile?.username ?? 'unknown'}
                </Link>
                <span className="comment-handle">@{profile?.username ?? 'unknown'}</span>
                <span className="comment-dot">·</span>
                <span className="comment-time">{timeAgo(comment.created_at)}</span>

                {isOwner && (
                  <div ref={menuRef} style={{ marginLeft: 'auto', position: 'relative' }}>
                    <button
                      onClick={() => setShowMenu(p => !p)}
                      className="comment-more-btn"
                      aria-label="More"
                    >
                      <MoreHorizontal size={14} />
                    </button>
                    {showMenu && (
                      <div className="comment-menu">
                        <button onClick={deleteComment} className="comment-menu-item comment-menu-danger">
                          <Trash2 size={13} />
                          Delete reply
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {comment.content && (
                <p className="comment-text">{comment.content}</p>
              )}

              {media.length > 0 && <CommentMediaGrid media={media} />}

              <div className="comment-actions">
                {/* Like */}
                <button className={`comment-action-btn${liked ? ' liked' : ''}`} onClick={toggleLike} aria-label="Like">
                  <Heart size={14} strokeWidth={liked ? 0 : 1.75} fill={liked ? '#f43f5e' : 'none'} />
                  {likeCount > 0 && <span>{likeCount}</span>}
                </button>

                {/* Reply */}
                <button
                  className="comment-action-btn"
                  onClick={() => setReplying(p => !p)}
                  aria-label="Reply"
                >
                  <MessageCircle size={14} strokeWidth={1.75} />
                  {children.length > 0 && <span>{children.length}</span>}
                </button>

                {/* Toggle nested replies if collapsed */}
                {children.length > 0 && !showReplies && (
                  <button
                    className="comment-action-btn"
                    onClick={() => setShowReplies(true)}
                    style={{ fontSize: 11, color: 'var(--nia-violet)' }}
                  >
                    Show {children.length} {children.length === 1 ? 'reply' : 'replies'}
                  </button>
                )}
                {children.length > 0 && showReplies && (
                  <button
                    className="comment-action-btn"
                    onClick={() => setShowReplies(false)}
                    style={{ fontSize: 11 }}
                  >
                    Hide replies
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Inline reply composer */}
      {replying && !isDeleted && (
        <InlineReplyBox
          postId={postId}
          parentId={comment.id}
          replyingTo={profile?.username ?? 'user'}
          currentUserId={currentUserId}
          currentUserProfile={currentUserProfile}
          postOwnerId={postOwnerId}
          onCancel={() => setReplying(false)}
          onSuccess={() => { setReplying(false); router.refresh() }}
        />
      )}

      {/* Nested children — always rendered, even if this comment is deleted,
          so replies underneath keep their place in the thread. */}
      {children.length > 0 && showReplies && (
        <div className="comment-children">
          {children.map(child => (
            <CommentRow
              key={child.id}
              comment={child}
              hasChildren={(child.children ?? []).length > 0}
              currentUserId={currentUserId}
              currentUserProfile={currentUserProfile}
              postId={postId}
              postOwnerId={postOwnerId}
              depth={canNestDeeper ? depth + 1 : depth}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Build tree from flat list ─────────────────────── */
export function buildCommentTree(comments: Comment[]): CommentNode[] {
  const map = new Map<string, CommentNode>()
  const roots: CommentNode[] = []

  // First pass: index all comments
  for (const c of comments) {
    map.set(c.id, { ...c, children: [] })
  }

  // Second pass: attach children to parents
  for (const c of comments) {
    const node = map.get(c.id)
    const parent = c.parent_id ? map.get(c.parent_id) : undefined
    if (!node) continue
    if (parent) {
      parent.children.push(node)
    } else {
      roots.push(node)
    }
  }

  return roots
}

/* ── Export ────────────────────────────────────────── */
export default function CommentThread({ comments, currentUserId, postId, postOwnerId, currentUserProfile }: CommentThreadProps) {
  const tree = buildCommentTree(comments)

  return (
    <div className="comment-section">
      {tree.map(comment => (
        <CommentRow
          key={comment.id}
          comment={comment}
          hasChildren={comment.children.length > 0}
          currentUserId={currentUserId}
          currentUserProfile={currentUserProfile}
          postId={postId}
          postOwnerId={postOwnerId}
          depth={0}
        />
      ))}
    </div>
  )
}
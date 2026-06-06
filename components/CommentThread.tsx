'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Heart, MoreHorizontal, Play, Trash2, MessageCircle, Send, ImagePlus, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface CommentMedia {
  url:  string
  type: 'image' | 'video' | 'gif'
}

interface CommentThreadProps {
  comments:      any[]
  currentUserId: string
  postId:        string
  currentUserProfile?: { avatar_url?: string | null; username?: string }
}

function timeAgo(date: string) {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (s < 60)    return `${s}s`
  if (s < 3600)  return `${Math.floor(s / 60)}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  return `${Math.floor(s / 86400)}d`
}

function buildMedia(comment: any): CommentMedia[] {
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
  postId,
  parentId,
  replyingTo,
  currentUserId,
  currentUserProfile,
  onCancel,
  onSuccess,
}: {
  postId:              string
  parentId:            string
  replyingTo:          string
  currentUserId:       string
  currentUserProfile?: { avatar_url?: string | null; username?: string }
  onCancel:            () => void
  onSuccess:           () => void
}) {
  const supabase  = createClient()
  const [text,    setText]    = useState(`@${replyingTo} `)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [media,   setMedia]   = useState<{ file: File; preview: string }[]>([])
  const textRef  = useRef<HTMLTextAreaElement>(null)
  const imageRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    textRef.current?.focus()
    // place cursor at end
    const len = textRef.current?.value.length ?? 0
    textRef.current?.setSelectionRange(len, len)
  }, [])

  function autoGrow() {
    const el = textRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 100) + 'px'
  }

  function addImages(files: FileList | null) {
    if (!files) return
    const items = Array.from(files).slice(0, 4 - media.length)
    setMedia(prev => [...prev, ...items.map(f => ({ file: f, preview: URL.createObjectURL(f) }))])
    if (imageRef.current) imageRef.current.value = ''
  }

  function removeMedia(i: number) {
    setMedia(prev => { URL.revokeObjectURL(prev[i].preview); return prev.filter((_, j) => j !== i) })
  }

  const canSend = !loading && text.replace(`@${replyingTo}`, '').trim().length > 0 || media.length > 0

  async function submit() {
    if (!canSend) return
    setLoading(true); setError('')
    try {
      let media_url: string | null = null
      let media_type: string | null = null
      let extra_media: { url: string; type: string }[] = []

      if (media.length > 0) {
        const uploaded: { url: string; type: string }[] = []
        for (const item of media) {
          const ext  = item.file.name.split('.').pop() ?? 'jpg'
          const path = `${currentUserId}/reply_${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
          const { error: upErr } = await supabase.storage.from('post-media').upload(path, item.file, { contentType: item.file.type })
          if (upErr) { setError('Upload failed'); setLoading(false); return }
          uploaded.push({ url: supabase.storage.from('post-media').getPublicUrl(path).data.publicUrl, type: 'image' })
        }
        media_url   = uploaded[0].url
        media_type  = uploaded[0].type
        extra_media = uploaded.slice(1)
      }

      const payload: any = {
        post_id:    postId,
        user_id:    currentUserId,
        content:    text.trim(),
        media_url,
        media_type,
        extra_media: extra_media.length ? extra_media : null,
        parent_id:  parentId,
      }

      const { error: insertErr } = await supabase.from('comments').insert(payload)
      if (insertErr) {
        // If parent_id column doesn't exist yet, retry without it
        if (insertErr.code === '42703') {
          delete payload.parent_id
          const { error: retryErr } = await supabase.from('comments').insert(payload)
          if (retryErr) { setError(retryErr.message); setLoading(false); return }
        } else {
          setError(insertErr.message); setLoading(false); return
        }
      }

      media.forEach(m => URL.revokeObjectURL(m.preview))
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
      {/* thread line on left */}
      <div className="inline-reply-line" />

      <div className="inline-reply-inner">
        {/* avatar */}
        <div className="inline-reply-avatar">
          {currentUserProfile?.avatar_url
            ? <img src={currentUserProfile.avatar_url} alt="" />
            : initials
          }
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
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

          {/* media previews */}
          {media.length > 0 && (
            <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
              {media.map((m, i) => (
                <div key={i} style={{ position: 'relative' }}>
                  <img src={m.preview} alt="" style={{ width: 56, height: 56, borderRadius: 8, objectFit: 'cover', border: '1px solid var(--border)' }} />
                  <button onClick={() => removeMedia(i)} style={{ position: 'absolute', top: -4, right: -4, width: 16, height: 16, borderRadius: '50%', background: '#0f172a', border: '1.5px solid #fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>
                    <X size={9} color="#fff" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="inline-reply-actions">
            <input ref={imageRef} type="file" accept="image/*" multiple hidden onChange={e => addImages(e.target.files)} />
            <button onClick={() => imageRef.current?.click()} className="inline-reply-btn" aria-label="Add image" title="Add image">
              <ImagePlus size={15} />
            </button>
            <div style={{ flex: 1 }} />
            <button onClick={onCancel} className="inline-reply-btn" style={{ fontSize: 12, padding: '4px 10px', borderRadius: 20 }}>
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={!canSend}
              className="inline-reply-send"
            >
              {loading ? '…' : 'Reply'}
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
  isLast,
  currentUserId,
  currentUserProfile,
  postId,
  depth,
}: {
  comment:             any
  hasChildren:         boolean
  isLast:              boolean
  currentUserId:       string
  currentUserProfile?: { avatar_url?: string | null; username?: string }
  postId:              string
  depth:               number
}) {
  const supabase  = createClient()
  const router    = useRouter()
  const profile   = comment.profiles
  const likesList = (comment.likes ?? []) as any[]

  const [liked,       setLiked]       = useState(() => likesList.some((l: any) => l.user_id === currentUserId))
  const [likeCount,   setLikeCount]   = useState(likesList.length)
  const [showMenu,    setShowMenu]    = useState(false)
  const [deleted,     setDeleted]     = useState(false)
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

  const media    = buildMedia(comment)
  const children = (comment.children ?? []) as any[]
  const initials = profile?.username?.[0]?.toUpperCase() ?? '?'

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
    await supabase.from('comments').delete().eq('id', comment.id)
    setDeleted(true)
    router.refresh()
  }

  if (deleted) return null

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
        </div>
      </div>

      {/* Inline reply composer */}
      {replying && (
        <InlineReplyBox
          postId={postId}
          parentId={comment.id}
          replyingTo={profile?.username ?? 'user'}
          currentUserId={currentUserId}
          currentUserProfile={currentUserProfile}
          onCancel={() => setReplying(false)}
          onSuccess={() => { setReplying(false); router.refresh() }}
        />
      )}

      {/* Nested children */}
      {children.length > 0 && showReplies && (
        <div className="comment-children">
          {children.map((child: any, i: number) => (
            <CommentRow
              key={child.id}
              comment={child}
              hasChildren={(child.children ?? []).length > 0}
              isLast={i === children.length - 1}
              currentUserId={currentUserId}
              currentUserProfile={currentUserProfile}
              postId={postId}
              depth={canNestDeeper ? depth + 1 : depth}
            />
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Build tree from flat list ─────────────────────── */
function buildTree(comments: any[]): any[] {
  const map = new Map<string, any>()
  const roots: any[] = []

  // First pass: index all comments
  for (const c of comments) {
    map.set(c.id, { ...c, children: [] })
  }

  // Second pass: attach children to parents
  for (const c of comments) {
    const node = map.get(c.id)!
    if (c.parent_id && map.has(c.parent_id)) {
      map.get(c.parent_id)!.children.push(node)
    } else {
      roots.push(node)
    }
  }

  return roots
}

/* ── Export ────────────────────────────────────────── */
export default function CommentThread({ comments, currentUserId, postId, currentUserProfile }: CommentThreadProps) {
  const tree = buildTree(comments)

  return (
    <div className="comment-section">
      {tree.map((comment, i) => (
        <CommentRow
          key={comment.id}
          comment={comment}
          hasChildren={comment.children.length > 0}
          isLast={i === tree.length - 1}
          currentUserId={currentUserId}
          currentUserProfile={currentUserProfile}
          postId={postId}
          depth={0}
        />
      ))}
    </div>
  )
}
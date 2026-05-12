'use client'

import {
  getFlag,
  getLanguageEmoji,
} from '@/lib/african-data'

import { useState, useRef } from 'react'

import { createClient } from '@/lib/supabase/client'

import {
  MessageCircle,
  Share2,
  Languages,
  Loader2,
  Play,
  Pause,
  Send,
  Repeat2,
  MoreHorizontal,
  Pencil,
  Trash2,
  X,
  Check,
  BadgeCheck,
} from 'lucide-react'

import Link from 'next/link'
import { useRouter } from 'next/navigation'

import TipButton from '@/components/TipButton'
import PollCard from '@/components/PollCard'

function timeAgo(date: string) {
  const s = Math.floor(
    (Date.now() - new Date(date).getTime()) / 1000
  )

  if (s < 60) return `${s}s`
  if (s < 3600) return `${Math.floor(s / 60)}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h`

  return `${Math.floor(s / 86400)}d`
}

const REACTIONS = [
  '❤️',
  '😂',
  '🔥',
  '😮',
  '👏',
  '😢',
]

export default function PostCard({
  post,
  currentUserId,
}: any) {
  const supabase = createClient()
  const router = useRouter()

  const reactionCounts: Record<string, number> = {}

  const myReaction: string | null =
    post.reactions?.find(
      (r: any) => r.user_id === currentUserId
    )?.emoji ?? null

  post.reactions?.forEach((r: any) => {
    reactionCounts[r.emoji] =
      (reactionCounts[r.emoji] ?? 0) + 1
  })

  const [activeReaction, setActiveReaction] =
    useState<string | null>(myReaction)

  const [localReactions, setLocalReactions] =
    useState<Record<string, number>>(
      reactionCounts
    )

  const [showReactionPicker, setShowReactionPicker] =
    useState(false)

  const [showComments, setShowComments] =
    useState(false)

  const [comments, setComments] = useState<any[]>(
    []
  )

  const [newComment, setNewComment] =
    useState('')

  const [loadingComments, setLoadingComments] =
    useState(false)

  const [posting, setPosting] =
    useState(false)

  const [translation, setTranslation] =
    useState<string | null>(null)

  const [translating, setTranslating] =
    useState(false)

  const [isPlaying, setIsPlaying] =
    useState(false)

  const [copied, setCopied] =
    useState(false)

  const [reposted, setReposted] = useState(
    post.reposts?.some(
      (r: any) => r.user_id === currentUserId
    ) ?? false
  )

  const [repostCount, setRepostCount] =
    useState(post.reposts?.length ?? 0)

  // Edit / Delete state
  const [showMenu, setShowMenu] =
    useState(false)

  const [isEditing, setIsEditing] =
    useState(false)

  const [editContent, setEditContent] =
    useState(post.content ?? '')

  const [editLoading, setEditLoading] =
    useState(false)

  const [isDeleted, setIsDeleted] =
    useState(false)

  const [
    showDeleteConfirm,
    setShowDeleteConfirm,
  ] = useState(false)

  const audioRef =
    useRef<HTMLAudioElement | null>(null)

  const commentRef =
    useRef<HTMLInputElement>(null)

  const menuRef =
    useRef<HTMLDivElement>(null)

  const totalReactions = Object.values(
    localReactions
  ).reduce((a, b) => a + b, 0)

  const isOwn =
    post.profiles?.id === currentUserId

  // ── Edit ─────────────────────────────
  async function saveEdit() {
    if (!editContent.trim()) return

    setEditLoading(true)

    const { error } = await supabase
      .from('posts')
      .update({
        content: editContent.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', post.id)

    if (!error) {
      setIsEditing(false)
      router.refresh()
    }

    setEditLoading(false)
  }

  // ── Delete ───────────────────────────
  async function deletePost() {
    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', post.id)

    if (!error) {
      setIsDeleted(true)
      router.refresh()
    }

    setShowDeleteConfirm(false)
  }

  // ── Reactions ────────────────────────
  async function handleReaction(
    emoji: string
  ) {
    if (!currentUserId) return

    setShowReactionPicker(false)

    const newCounts = {
      ...localReactions,
    }

    if (activeReaction === emoji) {
      await supabase
        .from('reactions')
        .delete()
        .match({
          post_id: post.id,
          user_id: currentUserId,
        })

      newCounts[emoji] = Math.max(
        (newCounts[emoji] ?? 1) - 1,
        0
      )

      setActiveReaction(null)
    } else {
      if (activeReaction) {
        await supabase
          .from('reactions')
          .delete()
          .match({
            post_id: post.id,
            user_id: currentUserId,
          })

        newCounts[activeReaction] =
          Math.max(
            (newCounts[
              activeReaction
            ] ?? 1) - 1,
            0
          )
      }

      await supabase
        .from('reactions')
        .insert({
          post_id: post.id,
          user_id: currentUserId,
          emoji,
        })

      newCounts[emoji] =
        (newCounts[emoji] ?? 0) + 1

      setActiveReaction(emoji)
    }

    setLocalReactions(newCounts)
  }

  async function handleRepost() {
    if (
      !currentUserId ||
      reposted ||
      isOwn
    )
      return

    await supabase.from('reposts').insert({
      post_id: post.id,
      user_id: currentUserId,
    })

    setReposted(true)

    setRepostCount((c: number) => c + 1)
  }

  async function loadComments() {
    if (showComments) {
      setShowComments(false)
      return
    }

    setLoadingComments(true)

    const { data } = await supabase
      .from('comments')
      .select(
        '*, profiles:user_id (id, username, avatar_url)'
      )
      .eq('post_id', post.id)
      .order('created_at', {
        ascending: true,
      })

    setComments(data ?? [])

    setLoadingComments(false)
    setShowComments(true)

    setTimeout(() => {
      commentRef.current?.focus()
    }, 100)
  }

  async function submitComment() {
    if (
      !newComment.trim() ||
      !currentUserId
    )
      return

    setPosting(true)

    const { data, error } = await supabase
      .from('comments')
      .insert({
        post_id: post.id,
        user_id: currentUserId,
        content: newComment.trim(),
      })
      .select(
        '*, profiles:user_id (id, username, avatar_url)'
      )
      .single()

    if (!error && data) {
      setComments((prev) => [
        ...prev,
        data,
      ])

      setNewComment('')
    }

    setPosting(false)
    router.refresh()
  }

  async function handleTranslate() {
    if (translation) {
      setTranslation(null)
      return
    }

    if (!post.content) return

    setTranslating(true)

    try {
      const res = await fetch(
        '/api/translate',
        {
          method: 'POST',
          headers: {
            'Content-Type':
              'application/json',
          },
          body: JSON.stringify({
            text: post.content,
            targetLang: 'en',
          }),
        }
      )

      const data = await res.json()

      setTranslation(
        data.translation ?? null
      )
    } finally {
      setTranslating(false)
    }
  }

  async function handleShare() {
    const url = `${window.location.origin}/posts/${post.id}`

    if (navigator.share) {
      try {
        await navigator.share({
          title: `@${post.profiles?.username} on Nia`,
          text: post.content ?? '',
          url,
        })
      } catch {}
    } else {
      await navigator.clipboard.writeText(
        url
      )

      setCopied(true)

      setTimeout(() => {
        setCopied(false)
      }, 2000)
    }
  }

  function toggleAudio() {
    if (!audioRef.current) return

    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }

    setIsPlaying(!isPlaying)
  }

  // Hidden if deleted
  if (isDeleted) return null

  const displayName = post.is_anonymous
    ? 'Anonymous 🎭'
    : `@${post.profiles?.username}`

  const topReactions = Object.entries(
    localReactions
  )
    .filter(([, c]) => c > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)

  return (
    <article
      className="card card-hover overflow-hidden anim-up"
      onClick={() => {
        if (showMenu)
          setShowMenu(false)
      }}
    >
      {/* Header */}
      <div className="flex items-start gap-3 p-4 pb-3">
        <Link
          href={
            post.is_anonymous
              ? '#'
              : `/profile/${post.profiles?.id}`
          }
          className="flex-shrink-0"
        >
          <div className="avatar-ring">
            <div
              className="w-10 h-10 rounded-full overflow-hidden"
              style={{
                background:
                  post.is_anonymous
                    ? 'linear-gradient(135deg,#555,#333)'
                    : 'var(--grad-brand)',
              }}
            >
              {!post.is_anonymous &&
              post.profiles
                ?.avatar_url ? (
                <img
                  src={
                    post.profiles.avatar_url
                  }
                  className="w-full h-full object-cover"
                  alt=""
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white font-bold text-sm">
                  {post.is_anonymous
                    ? '🎭'
                    : post.profiles?.username?.[
                        0
                      ]?.toUpperCase() ??
                      '?'}
                </div>
              )}
            </div>
          </div>
        </Link>

        <div className="flex-1 min-w-0">
          {/* Updated header */}
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href={
                post.is_anonymous
                  ? '#'
                  : `/profile/${post.profiles?.id}`
              }
              className="font-bold text-sm hover:underline"
            >
              {displayName}
            </Link>

            {post.profiles
              ?.is_verified && (
              <BadgeCheck
                size={15}
                style={{
                  color:
                    'var(--nia-violet)',
                }}
                fill="rgba(168,85,247,0.15)"
              />
            )}

            {!post.is_anonymous &&
              post.profiles
                ?.country && (
                <span
                  title={
                    post.profiles.country
                  }
                  className="text-base leading-none"
                >
                  {getFlag(
                    post.profiles.country
                  )}
                </span>
              )}

            {post.circles && (
              <Link
                href={`/circles/${post.circles.slug}`}
                className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
                style={{
                  background:
                    'linear-gradient(135deg,rgba(255,107,107,0.15),rgba(168,85,247,0.15))',
                  color:
                    'var(--nia-violet)',
                }}
              >
                {post.circles.name}
              </Link>
            )}

            {post.language &&
              post.language !==
                'english' && (
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{
                    background:
                      'var(--surface-2)',
                    color:
                      'var(--text-tertiary)',
                  }}
                >
                  {getLanguageEmoji(
                    post.language
                  )}{' '}
                  {post.language}
                </span>
              )}
          </div>

          <div className="flex items-center gap-1.5 mt-0.5">
            {!post.is_anonymous &&
              post.profiles
                ?.country && (
                <span
                  className="text-xs flex items-center gap-0.5"
                  style={{
                    color:
                      'var(--text-tertiary)',
                  }}
                >
                  <span>
                    {post.profiles.city
                      ? `${post.profiles.city}, ${post.profiles.country}`
                      : post.profiles
                          .country}
                  </span>
                </span>
              )}

            {!post.is_anonymous && (
              <span
                style={{
                  color:
                    'var(--text-tertiary)',
                }}
              >
                ·
              </span>
            )}

            <span
              className="text-xs"
              style={{
                color:
                  'var(--text-tertiary)',
              }}
            >
              {timeAgo(
                post.created_at
              )}
            </span>

            {post.updated_at &&
              post.updated_at !==
                post.created_at && (
                <span
                  className="text-xs italic"
                  style={{
                    color:
                      'var(--text-tertiary)',
                  }}
                >
                  · edited
                </span>
              )}
          </div>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {!isOwn &&
            !post.is_anonymous &&
            post.profiles?.id && (
              <TipButton
                recipientUserId={
                  post.profiles.id
                }
                recipientUsername={
                  post.profiles.username
                }
              />
            )}

          {/* Menu */}
          {isOwn && (
            <div
              className="relative"
              ref={menuRef}
            >
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setShowMenu(
                    !showMenu
                  )
                }}
                className="w-8 h-8 flex items-center justify-center rounded-xl transition-all active:scale-90"
                style={{
                  color:
                    'var(--text-tertiary)',
                  background:
                    showMenu
                      ? 'var(--surface-2)'
                      : 'transparent',
                }}
              >
                <MoreHorizontal
                  size={18}
                />
              </button>

              {showMenu && (
                <div
                  className="absolute right-0 top-10 z-30 w-40 rounded-2xl overflow-hidden anim-pop"
                  style={{
                    background:
                      'var(--surface-0)',
                    boxShadow:
                      'var(--shadow-lg)',
                    border:
                      '1px solid var(--border)',
                  }}
                  onClick={(e) =>
                    e.stopPropagation()
                  }
                >
                  {post.content !==
                    null && (
                    <button
                      onClick={() => {
                        setIsEditing(
                          true
                        )
                        setShowMenu(
                          false
                        )
                      }}
                      className="flex items-center gap-2.5 w-full px-4 py-3 text-sm font-semibold transition-colors text-left hover:bg-[var(--surface-2)]"
                      style={{
                        color:
                          'var(--text-primary)',
                      }}
                    >
                      <Pencil
                        size={15}
                        style={{
                          color:
                            'var(--nia-violet)',
                        }}
                      />
                      Edit post
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setShowDeleteConfirm(
                        true
                      )
                      setShowMenu(false)
                    }}
                    className="flex items-center gap-2.5 w-full px-4 py-3 text-sm font-semibold transition-colors text-left hover:bg-[var(--surface-2)]"
                    style={{
                      color: '#ef4444',
                    }}
                  >
                    <Trash2
                      size={15}
                    />
                    Delete post
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Edit Mode */}
      {isEditing ? (
        <div className="px-4 pb-3 space-y-2">
          <textarea
            value={editContent}
            onChange={(e) =>
              setEditContent(
                e.target.value
              )
            }
            rows={3}
            className="input resize-none text-[15px] w-full"
            autoFocus
          />

          <div className="flex gap-2">
            <button
              onClick={() => {
                setIsEditing(false)
                setEditContent(
                  post.content ?? ''
                )
              }}
              className="btn-ghost flex items-center gap-1.5 px-3 py-2 text-sm flex-1 justify-center"
            >
              <X size={14} />
              Cancel
            </button>

            <button
              onClick={saveEdit}
              disabled={
                !editContent.trim() ||
                editLoading
              }
              className="btn-primary flex items-center gap-1.5 px-3 py-2 text-sm flex-1 justify-center"
              style={{
                borderRadius: '12px',
              }}
            >
              {editLoading ? (
                <Loader2
                  size={14}
                  className="animate-spin"
                />
              ) : (
                <Check size={14} />
              )}

              Save
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Content */}
          {post.content && (
            <div className="px-4 pb-3">
              <p
                className="text-[15px] leading-relaxed"
                style={{
                  color:
                    'var(--text-primary)',
                }}
              >
                {post.content
                  .split(/(\s+)/)
                  .map(
                    (
                      word: string,
                      i: number
                    ) =>
                      word.startsWith(
                        '#'
                      ) ? (
                        <Link
                          key={i}
                          href={`/tags/${word
                            .slice(1)
                            .toLowerCase()}`}
                          className="font-bold"
                          style={{
                            color:
                              'var(--nia-violet)',
                          }}
                        >
                          {word}
                        </Link>
                      ) : (
                        word
                      )
                  )}
              </p>

              {translation && (
                <div
                  className="mt-2 text-sm italic px-3 py-2.5 rounded-xl"
                  style={{
                    background:
                      'var(--surface-2)',
                    color:
                      'var(--text-secondary)',
                    borderLeft:
                      '3px solid var(--nia-violet)',
                  }}
                >
                  {translation}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Poll */}
      {post.poll && (
        <PollCard
          poll={post.poll}
          currentUserId={currentUserId}
        />
      )}
    </article>
  )
}
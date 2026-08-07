/**
 * Nia Feed Scorer
 * Inspired by X's open-source algorithm:
 *   - Weighted engagement scoring (likes, comments, reposts, video)
 *   - Age decay (HackerNews-style log decay)
 *   - In-network boost for followed authors
 *   - Author diversity decay (prevent feed flooding by one person)
 *   - Language match bonus (African language affinity)
 *   - Locality bonus (same country)
 *   - Blocked/muted authors hard-filtered to score 0
 */

import type { Post } from '@/types/domain'

// ── Weights (mirrors X's ScoringWeights, tuned for Nia) ──────────────────────
export const FEED_WEIGHTS = {
  baseline:    0.10,   // ensures new posts can enter the feed before engagement
  like:        0.30,
  comment:     0.50,   // highest — replies show real engagement
  repost:      0.20,
  video_bonus: 0.15,   // flat bonus for video posts (encourages Reels content)
  image_bonus: 0.05,

  // Multipliers
  in_network:     1.50,  // following the author
  out_of_network: 0.75,  // don't follow — slight penalty, like X's OON weight
  same_language:  1.20,  // post language matches user's preferred language
  same_country:   1.15,  // author from same country

  // Author diversity decay (X: exponential decay per repeated author)
  diversity_decay: 0.40, // each extra post from same author × 0.4
  diversity_floor: 0.10, // never decay below 10% of original score

  // Age decay — log(hours + 2) in denominator, same as HackerNews
  age_decay_gravity: 1.2,
}

export interface ScorerPost extends Post {
  likes: { user_id: string }[]
  comments: { id: string }[]
  reposts: { user_id: string }[]
}

export interface UserContext {
  userId: string
  followingIds: Set<string>
  blockedIds: Set<string>
  mutedIds: Set<string>
  country: string | null
  language: string | null   // preferred language code e.g. 'swahili'
}

// ── Age decay ────────────────────────────────────────────────────────────────
function ageDecay(createdAt: string, gravity = FEED_WEIGHTS.age_decay_gravity): number {
  const createdAtMs = new Date(createdAt).getTime()
  if (!Number.isFinite(createdAtMs)) return 0
  const hours = Math.max(0, (Date.now() - createdAtMs) / 3_600_000)
  return 1 / Math.pow(Math.log(hours + 2), gravity)
}

// ── Base engagement score ────────────────────────────────────────────────────
function engagementScore(post: ScorerPost): number {
  const likes    = post.likes?.length    ?? 0
  const comments = post.comments?.length ?? 0
  const reposts  = post.reposts?.length  ?? 0

  let score =
    FEED_WEIGHTS.baseline +
    likes    * FEED_WEIGHTS.like +
    comments * FEED_WEIGHTS.comment +
    reposts  * FEED_WEIGHTS.repost

  if (post.media_type === 'video') score += FEED_WEIGHTS.video_bonus
  if (post.media_type === 'image') score += FEED_WEIGHTS.image_bonus

  return score
}

// ── Network multiplier ───────────────────────────────────────────────────────
function networkMultiplier(post: ScorerPost, ctx: UserContext): number {
  if (post.user_id === ctx.userId) return 0           // never show own posts
  if (ctx.blockedIds.has(post.user_id)) return 0      // hard block
  if (ctx.mutedIds.has(post.user_id))  return 0       // hard mute
  return ctx.followingIds.has(post.user_id)
    ? FEED_WEIGHTS.in_network
    : FEED_WEIGHTS.out_of_network
}

// ── Affinity bonuses ─────────────────────────────────────────────────────────
function affinityMultiplier(post: ScorerPost, ctx: UserContext): number {
  let m = 1.0
  const authorCountry = post.profiles?.country ?? null
  if (ctx.language && post.language === ctx.language) m *= FEED_WEIGHTS.same_language
  if (ctx.country  && authorCountry === ctx.country)  m *= FEED_WEIGHTS.same_country
  return m
}

// ── Score a batch and apply author diversity ──────────────────────────────────
export function scorePosts(
  posts: ScorerPost[],
  ctx: UserContext,
): ScorerPost[] {
  // 1. Compute raw score for every post
  const rawScores = posts.map(post => {
    const net = networkMultiplier(post, ctx)
    if (net === 0) return { post, score: 0 }   // blocked / own post

    const base    = engagementScore(post)
    const age     = ageDecay(post.created_at)
    const affinity = affinityMultiplier(post, ctx)
    const score   = base * age * net * affinity
    return { post, score }
  })

  // 2. Sort by raw score descending (needed for diversity pass)
  rawScores.sort((a, b) => b.score - a.score)

  // 3. Author diversity decay (mirrors X's apply_author_diversity)
  //    Each additional post from the same author gets decayed exponentially
  const authorSeen = new Map<string, number>()
  const diversified = rawScores.map(({ post, score }) => {
    const count = authorSeen.get(post.user_id) ?? 0
    authorSeen.set(post.user_id, count + 1)
    const multiplier =
      (1 - FEED_WEIGHTS.diversity_floor) *
      Math.pow(FEED_WEIGHTS.diversity_decay, count) +
      FEED_WEIGHTS.diversity_floor
    return { post, score: score * multiplier }
  })

  // 4. Re-sort by final score and strip zero-scored posts
  diversified.sort((a, b) => b.score - a.score)

  return diversified
    .filter(({ score }) => score > 0)
    .map(({ post }) => post)
}

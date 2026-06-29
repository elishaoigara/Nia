// Nia-main/lib/flicks-scorer.ts
import type { ScorerPost, UserContext } from './feed-scorer'

export const FLICKS_WEIGHTS = {
  like: 0.25,
  comment: 0.42,
  repost: 0.18,
  completion: 0.48,        // Most important
  watch_time: 0.32,        // Bonus for actual watch time

  same_country: 1.22,
  same_language: 1.28,
  in_network: 1.65,

  age_gravity: 1.48,       // Videos decay faster
  diversity_decay: 0.40,
}

function ageDecay(createdAt: string): number {
  const hours = (Date.now() - new Date(createdAt).getTime()) / 3600000
  return 1 / Math.pow(Math.log(hours + 3), FLICKS_WEIGHTS.age_gravity)
}

export function scoreFlicks(
  flicks: Array<ScorerPost & {
    completion_rate?: number
    total_watch_time?: number
  }>,
  ctx: UserContext
): ScorerPost[] {
  const scored = flicks.map(flick => {
    if (ctx.blockedIds.has(flick.user_id) || ctx.mutedIds.has(flick.user_id)) {
      return { flick, score: 0 }
    }

    const engagement =
      (flick.likes?.length ?? 0) * FLICKS_WEIGHTS.like +
      (flick.comments?.length ?? 0) * FLICKS_WEIGHTS.comment +
      (flick.reposts?.length ?? 0) * FLICKS_WEIGHTS.repost

    const videoScore =
      (flick.completion_rate ?? 0) * FLICKS_WEIGHTS.completion +
      ((flick.total_watch_time ?? 0) / 60) * FLICKS_WEIGHTS.watch_time

    let score = (engagement + videoScore) * ageDecay(flick.created_at)

    // Boosts
    if (ctx.followingIds.has(flick.user_id)) score *= FLICKS_WEIGHTS.in_network
    if (flick.profiles?.country === ctx.country) score *= FLICKS_WEIGHTS.same_country
    if (flick.language === ctx.language) score *= FLICKS_WEIGHTS.same_language

    return { flick, score }
  })

  // Author diversity
  const authorCount = new Map()
  const final = scored.map(({ flick, score }) => {
    const count = authorCount.get(flick.user_id) ?? 0
    authorCount.set(flick.user_id, count + 1)
    return { flick, score: score * Math.pow(FLICKS_WEIGHTS.diversity_decay, count) }
  })

  return final
    .sort((a, b) => b.score - a.score)
    .filter(s => s.score > 0.01)
    .map(s => s.flick)
}
#!/usr/bin/env node
/**
 * Seed Flicks + Long Flicks with real stock video content from Pexels.
 *
 * WHAT THIS DOES
 *   1. Searches Pexels for a handful of clips per category (comedy, music, etc.)
 *   2. Downloads them locally
 *   3. SHORT flicks: uses a single clip as-is (trimmed to <=55s if needed)
 *      LONG flicks: concatenates 3-5 clips from the same category back-to-back
 *                   with ffmpeg until the result clears ~90s. This is a
 *                   placeholder trick for seed/demo data only — stock APIs
 *                   don't really have long-form content, so "long flicks"
 *                   here are literally several short clips stitched together.
 *                   Fine for exercising the grid/search/category filter UI;
 *                   not something to represent as real creator content.
 *   4. Extracts a poster-frame thumbnail with ffmpeg
 *   5. Uploads both files to a Supabase Storage bucket
 *   6. Inserts the `posts` row (with `category` set) + one matching hashtag
 *
 * REQUIREMENTS (you run this yourself — it needs network access and secrets
 * I don't have access to from this sandbox):
 *   - Node.js 18+ (for global fetch)
 *   - ffmpeg + ffprobe on PATH        → https://ffmpeg.org/download.html
 *   - npm i @supabase/supabase-js
 *   - A free Pexels API key           → https://www.pexels.com/api/
 *   - A Supabase Storage bucket to hold seeded media (see SUPABASE_BUCKET
 *     below) — create it in the dashboard and mark it Public, or adjust
 *     getPublicUrl()/uploads below to use signed URLs instead.
 *
 * ENV VARS (put these in a local .env and `node --env-file=.env scripts/seed-flicks-from-pexels.mjs`,
 * or export them in your shell):
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY   ← service role, NOT the anon key (this script
 *                                  bypasses RLS to insert posts as arbitrary users)
 *   PEXELS_API_KEY
 *
 * USAGE
 *   node scripts/seed-flicks-from-pexels.mjs             # 1 short + 1 long per category
 *   node scripts/seed-flicks-from-pexels.mjs --short=2 --long=1
 *   node scripts/seed-flicks-from-pexels.mjs --only=comedy,music --long=0   # short-only, faster test run
 */

import { createClient } from '@supabase/supabase-js'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { mkdtemp, rm } from 'node:fs/promises'
import { createWriteStream } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { randomUUID } from 'node:crypto'

const exec = promisify(execFile)

// ── Config ──────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const PEXELS_API_KEY = process.env.PEXELS_API_KEY
const SUPABASE_BUCKET = process.env.SUPABASE_BUCKET ?? 'flicks'

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !PEXELS_API_KEY) {
  console.error(
    'Missing env vars. Need SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, PEXELS_API_KEY.\n' +
    'See the header comment in this file for where to get each one.'
  )
  process.exit(1)
}

if (process.env.NIA_ENVIRONMENT !== 'staging' || process.env.NIA_STAGING_URL !== SUPABASE_URL) throw new Error('Set an explicit isolated staging URL and NIA_ENVIRONMENT=staging before seeding.')

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// Reuse the same 5 demo profiles from the earlier Flicks seed SQL.
// Swap these for real profile UUIDs from your `profiles` table if different.
const PROFILE_IDS = [
  'aaaaaaaa-0001-0001-0001-aaaaaaaaaaaa', // amara
  'aaaaaaaa-0002-0002-0002-aaaaaaaaaaaa', // kofi
  'aaaaaaaa-0003-0003-0003-aaaaaaaaaaaa', // zara
  'aaaaaaaa-0004-0004-0004-aaaaaaaaaaaa', // seun
  'aaaaaaaa-0005-0005-0005-aaaaaaaaaaaa', // naledi
]

// category id -> [Pexels search query, caption template, country for hashtag row]
const CATEGORIES = {
  comedy:    { query: 'stand up comedy laughing',   caption: 'This had me in tears 😂',                 country: 'Nigeria' },
  music:     { query: 'music concert dance',         caption: 'The energy at this show was unreal 🎵🔥', country: 'Ghana' },
  sports:    { query: 'football soccer stadium',     caption: 'Matchday atmosphere never disappoints ⚽', country: 'Kenya' },
  news:      { query: 'city street busy',            caption: 'What\u2019s happening around town this week 📰', country: 'Nigeria' },
  education: { query: 'classroom teaching students', caption: 'Learning something new today 🎓',          country: 'Kenya' },
  culture:   { query: 'african market culture',      caption: 'Culture on full display today 🌍',         country: 'Senegal' },
  tech:      { query: 'startup office coding',        caption: 'Building in public — small demo 💻',       country: 'Nigeria' },
  vlogs:     { query: 'daily life vlog city',         caption: 'A day in my life, come along 📹',          country: 'South Africa' },
  other:     { query: 'lifestyle travel',             caption: 'Just vibes ✨',                              country: 'Ghana' },
}

const HASHTAG_LOOKUP = {
  comedy: 'Comedy', music: 'Afrobeats', sports: 'Football', news: 'News',
  education: 'Learning', culture: 'Culture', tech: 'Tech', vlogs: 'Vlog', other: 'Lifestyle',
}

const LONG_FLICK_MIN_SECONDS = 90

// ── CLI args ─────────────────────────────────────────────────────────────────

const args = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const [k, v] = a.replace(/^--/, '').split('=')
    return [k, v ?? true]
  })
)
const SHORT_PER_CATEGORY = Number(args.short ?? 1)
const LONG_PER_CATEGORY = Number(args.long ?? 1)
const ONLY = args.only ? String(args.only).split(',') : Object.keys(CATEGORIES)

// ── Pexels ───────────────────────────────────────────────────────────────────

async function searchPexelsVideos(query, perPage = 6) {
  const res = await fetch(
    `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=${perPage}&orientation=portrait`,
    { headers: { Authorization: PEXELS_API_KEY } }
  )
  if (!res.ok) throw new Error(`Pexels search failed (${res.status}): ${await res.text()}`)
  const data = await res.json()
  return data.videos ?? []
}

// Pick a reasonably-sized mp4 rendition — avoid the 4K originals, they're slow
// to download and we don't need the resolution for a Flicks-style feed.
function pickRendition(video) {
  const mp4s = (video.video_files ?? []).filter(f => f.file_type === 'video/mp4')
  const sorted = mp4s.sort((a, b) => (a.height ?? 0) - (b.height ?? 0))
  return sorted.find(f => (f.height ?? 0) >= 480) ?? sorted[sorted.length - 1]
}

async function downloadFile(url, destPath) {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`Download failed (${res.status}): ${url}`)
  await new Promise((resolve, reject) => {
    const stream = createWriteStream(destPath)
    res.body.pipeTo(
      new WritableStream({
        write(chunk) { stream.write(chunk) },
        close() { stream.end(); resolve() },
        abort(err) { reject(err) },
      })
    ).catch(reject)
  })
}

// ── ffmpeg helpers ───────────────────────────────────────────────────────────

async function getDuration(filePath) {
  const { stdout } = await exec('ffprobe', [
    '-v', 'error', '-show_entries', 'format=duration',
    '-of', 'default=noprint_wrappers=1:nokey=1', filePath,
  ])
  return parseFloat(stdout.trim())
}

async function extractThumbnail(videoPath, thumbPath) {
  await exec('ffmpeg', ['-y', '-ss', '00:00:01', '-i', videoPath, '-frames:v', '1', '-q:v', '3', thumbPath])
}

async function trimTo(videoPath, outPath, seconds) {
  await exec('ffmpeg', ['-y', '-i', videoPath, '-t', String(seconds), '-c', 'copy', outPath])
}

// Concatenate clips using the concat demuxer (fast, stream-copy — works when
// codecs/resolutions match closely, which same-query Pexels results usually do).
// Falls back to a re-encoding concat filter if the fast path fails.
async function concatClips(clipPaths, outPath, workDir) {
  const listFile = path.join(workDir, 'concat-list.txt')
  const { writeFile } = await import('node:fs/promises')
  await writeFile(listFile, clipPaths.map(p => `file '${p}'`).join('\n'))

  try {
    await exec('ffmpeg', ['-y', '-f', 'concat', '-safe', '0', '-i', listFile, '-c', 'copy', outPath])
  } catch {
    // Fast path failed (mismatched codecs/params) — re-encode instead.
    const inputs = clipPaths.flatMap(p => ['-i', p])
    const filter = clipPaths.map((_, i) => `[${i}:v:0][${i}:a:0]`).join('') +
      `concat=n=${clipPaths.length}:v=1:a=1[outv][outa]`
    await exec('ffmpeg', [
      '-y', ...inputs,
      '-filter_complex', filter,
      '-map', '[outv]', '-map', '[outa]',
      outPath,
    ])
  }
}

// ── Supabase ─────────────────────────────────────────────────────────────────

async function uploadToBucket(localPath, destPath, contentType) {
  const { readFile } = await import('node:fs/promises')
  const buffer = await readFile(localPath)
  const { error } = await supabase.storage.from(SUPABASE_BUCKET).upload(destPath, buffer, {
    contentType, upsert: true,
  })
  if (error) throw error
  const { data } = supabase.storage.from(SUPABASE_BUCKET).getPublicUrl(destPath)
  return data.publicUrl
}

async function insertPost({ userId, content, mediaUrl, thumbnailUrl, duration, category, createdAt }) {
  const { data, error } = await supabase
    .from('posts')
    .insert({
      user_id: userId,
      content,
      media_url: mediaUrl,
      media_type: 'video',
      video_duration: Math.round(duration),
      thumbnail_url: thumbnailUrl,
      category,
      language: 'english',
      created_at: createdAt,
    })
    .select('id')
    .single()
  if (error) throw error
  return data.id
}

async function insertHashtag(tag, postId, userId, country) {
  const { error } = await supabase.from('hashtags').insert({ tag, post_id: postId, user_id: userId, country })
  if (error) console.warn(`  ⚠ hashtag insert failed for ${tag}:`, error.message)
}

// ── Main per-category pipeline ───────────────────────────────────────────────

let profileCursor = 0
function nextProfile() {
  const id = PROFILE_IDS[profileCursor % PROFILE_IDS.length]
  profileCursor += 1
  return id
}

async function makeShortFlick(categoryId, workDir) {
  const { query, caption, country } = CATEGORIES[categoryId]
  const results = await searchPexelsVideos(query, 4)
  if (results.length === 0) { console.warn(`  ⚠ no Pexels results for "${query}"`); return }

  const video = results[Math.floor(Math.random() * results.length)]
  const rendition = pickRendition(video)
  if (!rendition) return

  const raw = path.join(workDir, `${randomUUID()}-raw.mp4`)
  await downloadFile(rendition.link, raw)

  let duration = await getDuration(raw)
  let finalPath = raw
  if (duration > 55) {
    finalPath = path.join(workDir, `${randomUUID()}-trimmed.mp4`)
    await trimTo(raw, finalPath, 45)
    duration = 45
  }

  const thumbPath = path.join(workDir, `${randomUUID()}.jpg`)
  await extractThumbnail(finalPath, thumbPath)

  const id = randomUUID()
  const mediaUrl = await uploadToBucket(finalPath, `seed/${id}.mp4`, 'video/mp4')
  const thumbnailUrl = await uploadToBucket(thumbPath, `seed/${id}.jpg`, 'image/jpeg')

  const userId = nextProfile()
  const postId = await insertPost({
    userId, content: caption, mediaUrl, thumbnailUrl, duration, category: categoryId,
    createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 3600 * 1000).toISOString(),
  })
  await insertHashtag(HASHTAG_LOOKUP[categoryId], postId, userId, country)
  console.log(`  ✓ short flick [${categoryId}] → ${postId}`)
}

async function makeLongFlick(categoryId, workDir) {
  const { query, caption, country } = CATEGORIES[categoryId]
  const results = await searchPexelsVideos(query, 8)
  if (results.length < 3) { console.warn(`  ⚠ not enough Pexels results to build a long flick for "${query}"`); return }

  const clipPaths = []
  let totalDuration = 0
  for (const video of results) {
    if (totalDuration >= LONG_FLICK_MIN_SECONDS) break
    const rendition = pickRendition(video)
    if (!rendition) continue
    const clipPath = path.join(workDir, `${randomUUID()}-clip.mp4`)
    await downloadFile(rendition.link, clipPath)
    clipPaths.push(clipPath)
    totalDuration += await getDuration(clipPath)
  }
  if (clipPaths.length < 2) { console.warn(`  ⚠ couldn't gather enough clips for "${query}"`); return }

  const combined = path.join(workDir, `${randomUUID()}-long.mp4`)
  await concatClips(clipPaths, combined, workDir)
  const duration = await getDuration(combined)

  const thumbPath = path.join(workDir, `${randomUUID()}.jpg`)
  await extractThumbnail(combined, thumbPath)

  const id = randomUUID()
  const mediaUrl = await uploadToBucket(combined, `seed/${id}.mp4`, 'video/mp4')
  const thumbnailUrl = await uploadToBucket(thumbPath, `seed/${id}.jpg`, 'image/jpeg')

  const userId = nextProfile()
  const postId = await insertPost({
    userId,
    content: `${caption} — full episode`,
    mediaUrl, thumbnailUrl, duration, category: categoryId,
    createdAt: new Date(Date.now() - Math.random() * 14 * 24 * 3600 * 1000).toISOString(),
  })
  await insertHashtag(HASHTAG_LOOKUP[categoryId], postId, userId, country)
  console.log(`  ✓ long flick  [${categoryId}] → ${postId} (${Math.round(duration)}s from ${clipPaths.length} clips)`)
}

// ── Run ──────────────────────────────────────────────────────────────────────

async function main() {
  const { data: approved, error: approvedError } = await supabase.from('test_profiles').select('user_id')
  if (approvedError || PROFILE_IDS.some(id => !approved?.some(p => p.user_id === id))) throw new Error('Every seed author must be explicitly enrolled in test_profiles.')
  const workDir = await mkdtemp(path.join(tmpdir(), 'nia-flicks-seed-'))
  console.log(`Working dir: ${workDir}`)
  console.log(`Categories: ${ONLY.join(', ')} | short/cat: ${SHORT_PER_CATEGORY} | long/cat: ${LONG_PER_CATEGORY}\n`)

  try {
    for (const categoryId of ONLY) {
      if (!CATEGORIES[categoryId]) { console.warn(`Skipping unknown category "${categoryId}"`); continue }
      console.log(`[${categoryId}]`)
      for (let i = 0; i < SHORT_PER_CATEGORY; i++) {
        await makeShortFlick(categoryId, workDir).catch(e => console.error(`  ✗ short flick failed:`, e.message))
      }
      for (let i = 0; i < LONG_PER_CATEGORY; i++) {
        await makeLongFlick(categoryId, workDir).catch(e => console.error(`  ✗ long flick failed:`, e.message))
      }
    }
  } finally {
    await rm(workDir, { recursive: true, force: true })
  }

  console.log('\nDone.')
}

main().catch(err => { console.error(err); process.exit(1) })

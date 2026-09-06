import { createClient } from '@/lib/supabase/server'
import { getServerSupabaseEnv } from '@/lib/env'

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams
  const bucket = params.get('bucket') ?? ''
  const path = params.get('path') ?? ''
  if (!['post-media', 'message-media', 'media', 'flicks'].includes(bucket) || !path || path.includes('..') || path.length > 1024) {
    return new Response('Invalid media reference', { status: 400 })
  }
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) return new Response('Unauthorized', { status: 401 })
  const { url, anonKey } = getServerSupabaseEnv()
  const headers: Record<string, string> = { Authorization: `Bearer ${session.access_token}`, apikey: anonKey }
  const range = request.headers.get('range')
  if (range && /^bytes=\d*-\d*$/.test(range)) headers.Range = range
  const upstream = await fetch(`${url}/storage/v1/object/authenticated/${bucket}/${path.split('/').map(encodeURIComponent).join('/')}`, { headers, cache: 'no-store', signal: request.signal })
  if (!upstream.ok) return new Response('Media unavailable', { status: upstream.status === 416 ? 416 : 404 })
  const responseHeaders = new Headers({ 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff', 'Content-Security-Policy': "default-src 'none'; sandbox", 'Vary': 'Cookie' })
  for (const name of ['content-type', 'content-length', 'content-range', 'accept-ranges']) {
    const value = upstream.headers.get(name)
    if (value) responseHeaders.set(name, value)
  }
  const type = upstream.headers.get('content-type') ?? ''
  if (!/^(image\/(jpeg|png|webp|gif|avif)|video\/|audio\/)/.test(type)) responseHeaders.set('Content-Disposition', 'attachment')
  return new Response(upstream.body, { status: upstream.status, headers: responseHeaders })
}

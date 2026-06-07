import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Derive the canonical app URL server-side using the same priority as lib/app-url.ts
function getCanonicalOrigin(requestOrigin: string): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')
  }
  if (process.env.NEXT_PUBLIC_VERCEL_URL) {
    return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
  }
  // Fall back to request origin (correct in prod, may be localhost in dev — acceptable)
  return requestOrigin
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const canonicalOrigin = getCanonicalOrigin(origin)

  if (code) {
    const supabase = await createClient()
    await supabase.auth.exchangeCodeForSession(code)

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase
        .from('profiles').select('id').eq('id', user.id).single()
      const destination = profile ? '/' : '/onboarding'
      return NextResponse.redirect(`${canonicalOrigin}${destination}`)
    }
  }

  // Fallback — onboarding is the safest default
  return NextResponse.redirect(`${canonicalOrigin}/onboarding`)
}
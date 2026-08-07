import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

function getCanonicalOrigin(requestOrigin: string): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')
  }
  if (process.env.NEXT_PUBLIC_VERCEL_URL) {
    return `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`
  }
  return requestOrigin
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const canonicalOrigin = getCanonicalOrigin(origin)
  const code = searchParams.get('code')

  if (!code) {
    return NextResponse.redirect(`${canonicalOrigin}/login?error=missing_auth_code`)
  }

  const supabase = await createClient()
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)
  if (exchangeError) {
    console.error('[auth] code exchange failed', exchangeError)
    return NextResponse.redirect(`${canonicalOrigin}/login?error=auth_callback_failed`)
  }

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (!user || userError) {
    return NextResponse.redirect(`${canonicalOrigin}/login?error=auth_callback_failed`)
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) {
    console.error('[auth] profile lookup failed', profileError)
    return NextResponse.redirect(`${canonicalOrigin}/login?error=profile_lookup_failed`)
  }

  return NextResponse.redirect(`${canonicalOrigin}${profile ? '/' : '/onboarding'}`)
}

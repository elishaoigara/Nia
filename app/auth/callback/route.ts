import { safeNext } from '@/lib/auth-next'
import { getAuthRequestOrigin } from '@/lib/auth-origin'
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const origin = getAuthRequestOrigin(request)
  // The exchanged session cookies belong to the host that received this request.
  const canonicalOrigin = origin
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

  if (safeNext(searchParams.get('next')) === '/reset-password') {
    return NextResponse.redirect(`${origin}/reset-password`)
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

  return NextResponse.redirect(`${canonicalOrigin}${profile ? safeNext(searchParams.get('next')) : '/onboarding?next=' + encodeURIComponent(safeNext(searchParams.get('next')))}`)
}

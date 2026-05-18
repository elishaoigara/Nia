import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')

  if (code) {
    const supabase = await createClient()
    await supabase.auth.exchangeCodeForSession(code)

    // After exchanging the code we know who the user is.
    // If they already have a profile (returning user, re-verification, etc.)
    // send them straight to the feed — otherwise start onboarding so the
    // profile row gets created before they can post.
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase
        .from('profiles').select('id').eq('id', user.id).single()
      const destination = profile ? '/' : '/onboarding'
      return NextResponse.redirect(`${origin}${destination}`)
    }
  }

  // Fallback (no code or no session) — onboarding is the safest default
  return NextResponse.redirect(`${origin}/onboarding`)
}
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { safeNext } from '@/lib/auth-next'
import { getAuthRequestOrigin } from '@/lib/auth-origin'

/** Token-hash email templates work when opened in another browser/device. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const origin = getAuthRequestOrigin(request)
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const failure = () => NextResponse.redirect(new URL('/login?error=auth_link_expired', origin))
  if (!tokenHash || (type !== 'email' && type !== 'recovery')) return failure()

  const supabase = await createClient()
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
  if (error) return failure()

  return NextResponse.redirect(new URL(type === 'recovery' ? '/reset-password' : safeNext(searchParams.get('next')), origin))
}

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { getServerSupabaseEnv } from '@/lib/env'

export async function updateSession(request: NextRequest, allowAnonymous = false) {
  let response = NextResponse.next({ request })
  const { url, anonKey } = getServerSupabaseEnv()

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: cookiesToSet => {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        response = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options)
        })
      },
    },
  })

  const { data: { user }, error } = await supabase.auth.getUser()
  response.headers.set('Cache-Control', 'private, no-store')
  if (allowAnonymous || (user && !error)) return response

  function withSessionCookies(next: NextResponse) {
    response.cookies.getAll().forEach(cookie => next.cookies.set(cookie))
    next.headers.set('Cache-Control', 'private, no-store')
    return next
  }

  if (request.nextUrl.pathname.startsWith('/api/')) {
    return withSessionCookies(NextResponse.json({ error: 'Unauthorized' }, { status: 401 }))
  }

  const loginUrl = request.nextUrl.clone()
  loginUrl.pathname = '/login'
  loginUrl.search = ''
  if (request.method === 'GET') {
    loginUrl.searchParams.set('next', `${request.nextUrl.pathname}${request.nextUrl.search}`)
  }

  return withSessionCookies(NextResponse.redirect(loginUrl))
}

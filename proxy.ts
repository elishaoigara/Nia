import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { publicSupabaseEnv } from '@/lib/env';
import { NextResponse } from 'next/server';
import { isPublicRoute } from '@/lib/public-routes';

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (pathname === '/setup') return;

  if (isPublicRoute(pathname)) {
    if (pathname === '/' && publicSupabaseEnv.isConfigured) return updateSession(request, true);
    return NextResponse.next();
  }

  if (!publicSupabaseEnv.isConfigured) {
    const setupUrl = request.nextUrl.clone();
    setupUrl.pathname = '/setup';
    setupUrl.search = '';
    return NextResponse.redirect(setupUrl);
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

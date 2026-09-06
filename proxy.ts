import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';
import { publicSupabaseEnv } from '@/lib/env';
import { NextResponse } from 'next/server';

const publicPaths = [
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/auth/callback',
];

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (pathname === '/setup') return;

  if (!publicSupabaseEnv.isConfigured) {
    const setupUrl = request.nextUrl.clone();
    setupUrl.pathname = '/setup';
    setupUrl.search = '';
    return NextResponse.redirect(setupUrl);
  }

  const isPublic = publicPaths.some(
    (path) => pathname === path || pathname.startsWith(path + '/')
  );

  if (isPublic) {
    return;
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};

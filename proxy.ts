import { type NextRequest } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

const publicPaths = [
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/auth/callback',
  '/api/mpesa/callback',
];

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

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
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getAppUrl, getAuthUrl } from './app-url'
import { safeNext } from './auth-next'
import { getAuthRequestOrigin } from './auth-origin'
import { isPublicRoute } from './public-routes'
import robots from '@/app/robots'
import sitemap from '@/app/sitemap'

const mock = vi.hoisted(() => ({
  exchangeCodeForSession: vi.fn(), getUser: vi.fn(), verifyOtp: vi.fn(), maybeSingle: vi.fn(), from: vi.fn(),
}))
vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn(async () => ({
  auth: mock,
  from: mock.from,
})) }))
import { GET as callback } from '@/app/auth/callback/route'
import { GET as confirm } from '@/app/auth/confirm/route'

beforeEach(() => {
  vi.clearAllMocks()
  mock.exchangeCodeForSession.mockResolvedValue({ error: null })
  mock.verifyOtp.mockResolvedValue({ error: null })
  mock.getUser.mockResolvedValue({ data: { user: { id: 'member' } }, error: null })
  mock.maybeSingle.mockResolvedValue({ data: { id: 'member' }, error: null })
  mock.from.mockReturnValue({ select: () => ({ eq: () => ({ maybeSingle: mock.maybeSingle }) }) })
})
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals() })

describe('launch URLs and public boundaries', () => {
  it('uses the browser loopback host instead of an internal listening address', () => {
    vi.stubEnv('VERCEL', '')
    expect(getAuthRequestOrigin(new Request('http://0.0.0.0:3000/auth/callback', { headers: { host: '127.0.0.1:3000' } }))).toBe('http://127.0.0.1:3000')
  })
  it('allows the exact Vercel deployment host but ignores untrusted forwarded hosts', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://niaapp.app')
    vi.stubEnv('VERCEL', '1')
    vi.stubEnv('VERCEL_URL', 'nia-preview.vercel.app')
    expect(getAuthRequestOrigin(new Request('http://0.0.0.0:3000/auth/callback', { headers: { 'x-forwarded-host': 'nia-preview.vercel.app' } }))).toBe('https://nia-preview.vercel.app')
    expect(getAuthRequestOrigin(new Request('http://0.0.0.0:3000/auth/callback', { headers: { 'x-forwarded-host': 'evil.example', host: 'evil.example' } }))).toBe('https://niaapp.app')
  })
  it('uses niaapp.app for canonical URLs, keeping auth on the initiating browser host', () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', '')
    expect(getAppUrl()).toBe('https://niaapp.app')
    vi.stubGlobal('window', { location: { origin: 'https://nia-preview.vercel.app' } })
    expect(getAuthUrl('/auth/callback')).toBe('https://nia-preview.vercel.app/auth/callback')
  })
  it('exposes information and metadata without exposing member routes or prefix lookalikes', () => {
    for (const path of ['/', '/help', '/terms', '/privacy', '/auth/confirm', '/robots.txt', '/sitemap.xml', '/manifest.webmanifest']) expect(isPublicRoute(path)).toBe(true)
    for (const path of ['/messages', '/api/account', '/settings', '/moderation', '/help/private', '/auth/confirm/anything']) expect(isPublicRoute(path)).toBe(false)
  })
  it('never lists private content and excludes previews from search', () => {
    expect(sitemap().some(item => /messages|profile|posts/.test(item.url))).toBe(false)
    vi.stubEnv('VERCEL_ENV', 'preview')
    expect(sitemap()).toEqual([])
    expect(robots()).toEqual({ rules: { userAgent: '*', disallow: '/' } })
  })
  it.each(['https://evil.example', '//evil.example', '/\\evil.example', '/\n/evil.example'])('rejects unsafe return path %s', path => {
    expect(safeNext(path)).toBe('/')
  })
})

describe('authentication completion', () => {
  it('keeps an OAuth session on the host that receives its cookies', async () => {
    vi.stubEnv('NEXT_PUBLIC_APP_URL', 'https://niaapp.app')
    const result = await callback(new Request('https://preview.vercel.app/auth/callback?code=test&next=/messages'))
    expect(result.headers.get('location')).toBe('https://preview.vercel.app/messages')
  })
  it('sends new members to onboarding with their destination intact', async () => {
    mock.maybeSingle.mockResolvedValue({ data: null, error: null })
    const result = await callback(new Request('https://niaapp.app/auth/callback?code=test&next=/circles'))
    expect(result.headers.get('location')).toBe('https://niaapp.app/onboarding?next=%2Fcircles')
  })
  it('allows password recovery before a user has completed a profile', async () => {
    const result = await callback(new Request('https://niaapp.app/auth/callback?code=test&next=/reset-password'))
    expect(result.headers.get('location')).toBe('https://niaapp.app/reset-password')
    expect(mock.from).not.toHaveBeenCalled()
  })
  it('exchanges token hashes without needing a PKCE verifier on the new device', async () => {
    const result = await confirm(new Request('https://niaapp.app/auth/confirm?token_hash=test&type=email&next=//evil.example'))
    expect(mock.verifyOtp).toHaveBeenCalledWith({ token_hash: 'test', type: 'email' })
    expect(result.headers.get('location')).toBe('https://niaapp.app/')
  })
  it('forces recovery tokens to the password form', async () => {
    const result = await confirm(new Request('https://niaapp.app/auth/confirm?token_hash=test&type=recovery&next=/messages'))
    expect(result.headers.get('location')).toBe('https://niaapp.app/reset-password')
  })
  it('rejects unsupported token types before verification', async () => {
    const result = await confirm(new Request('https://niaapp.app/auth/confirm?token_hash=test&type=invite'))
    expect(mock.verifyOtp).not.toHaveBeenCalled()
    expect(result.headers.get('location')).toContain('error=auth_link_expired')
  })
  it('does not grant a session when a link has expired', async () => {
    mock.verifyOtp.mockResolvedValue({ error: { message: 'expired' } })
    const result = await confirm(new Request('https://niaapp.app/auth/confirm?token_hash=test&type=email'))
    expect(result.headers.get('location')).toContain('error=auth_link_expired')
  })
})

import { beforeEach, describe, expect, it, vi } from 'vitest'
const mocks = vi.hoisted(() => ({ getUser: vi.fn(), getSession: vi.fn(), fetch: vi.fn() }))
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({ auth: mocks }) }))
vi.mock('@/lib/env', () => ({ getServerSupabaseEnv: () => ({ url: 'https://test.supabase.co', anonKey: 'public-key' }) }))
import { GET } from '@/app/api/media/route'
const request = (bucket = 'post-media', headers: HeadersInit = { 'If-None-Match': '"image-v1"' }) => new Request(`https://nia.test/api/media?bucket=${bucket}&path=owner/photo.jpg`, { headers })
beforeEach(() => {
  vi.resetAllMocks()
  vi.stubGlobal('fetch', mocks.fetch)
  mocks.getUser.mockResolvedValue({ data: { user: { id: 'viewer' } } })
  mocks.getSession.mockResolvedValue({ data: { session: { access_token: 'viewer-token' } } })
  mocks.fetch.mockImplementation(async () => new Response('image-bytes', { headers: { ETag: '"image-v1"', 'Content-Type': 'image/jpeg' } }))
})
describe('authenticated media reuse', () => {
  it('returns 304 only after Storage authorizes a matching version', async () => {
    const response = await GET(request())
    expect(response.status).toBe(304)
    expect(await response.text()).toBe('')
    expect(mocks.fetch).toHaveBeenCalledWith(expect.stringContaining('/authenticated/post-media/'), expect.objectContaining({ cache: 'no-store', headers: { Authorization: 'Bearer viewer-token', apikey: 'public-key' } }))
    expect(response.headers.get('cache-control')).toBe('private, no-cache, must-revalidate')
    expect(response.headers.get('vary')).toBe('Cookie')
  })
  it('returns bytes for a new version', async () => {
    const response = await GET(request('post-media', { 'If-None-Match': '"old"' }))
    expect(response.status).toBe(200); expect(await response.text()).toBe('image-bytes')
  })
  it('never reuses media after access is revoked', async () => {
    mocks.fetch.mockResolvedValue(new Response('denied', { status: 403 }))
    expect((await GET(request())).status).toBe(404)
  })
  it('rejects a signed-out viewer before touching Storage', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } })
    expect((await GET(request())).status).toBe(401); expect(mocks.fetch).not.toHaveBeenCalled()
  })
  it('never caches direct-message attachments', async () => {
    const response = await GET(request('message-media'))
    expect(response.status).toBe(200); expect(response.headers.get('cache-control')).toBe('private, no-store'); expect(response.headers.has('etag')).toBe(false)
  })
  it('preserves video range responses instead of returning 304', async () => {
    mocks.fetch.mockResolvedValue(new Response('part', { status: 206, headers: { ETag: '"image-v1"', 'Content-Range': 'bytes 0-3/100', 'Accept-Ranges': 'bytes' } }))
    const response = await GET(request('post-media', { Range: 'bytes=0-3', 'If-None-Match': '"image-v1"' }))
    expect(response.status).toBe(206); expect(response.headers.get('content-range')).toBe('bytes 0-3/100')
  })
})

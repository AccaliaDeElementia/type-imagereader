'use sanity'

import { DEFAULT_ICON_TTL_MS, IconFetchError, Internals, MAX_ICON_TTL_MS } from '#routes/weather.js'
import { cast } from '#testutils/typeGuards.js'
import type { MockInstance } from 'vitest'

interface FakeResponse {
  ok: boolean
  status: number
  headers: { get: (name: string) => string | null }
  arrayBuffer: () => Promise<ArrayBuffer>
}

const makeBuffer = (text: string): ArrayBuffer => new TextEncoder().encode(text).buffer

const makeOkResponse = (
  overrides: Partial<{ contentType: string; cacheControl: string | null; body: string }> = {},
): FakeResponse => {
  const { contentType = 'image/png', cacheControl = null, body = 'PNGDATA' } = overrides
  return {
    ok: true,
    status: 200,
    headers: {
      get: (name: string): string | null => {
        if (name.toLowerCase() === 'content-type') return contentType
        if (name.toLowerCase() === 'cache-control') return cacheControl
        return null
      },
    },
    arrayBuffer: async () => await Promise.resolve(makeBuffer(body)),
  }
}

const makeErrorResponse = (status: number): FakeResponse => ({
  ok: false,
  status,
  headers: { get: () => null },
  arrayBuffer: async () => await Promise.resolve(makeBuffer('')),
})

describe('routes/weather fetchIcon()', () => {
  let fetchStub: MockInstance = vi.fn()
  beforeEach(() => {
    fetchStub = vi.spyOn(global, 'fetch').mockResolvedValue(cast<globalThis.Response>(makeOkResponse()))
  })
  it('should request the openweathermap icon URL for the given code', async () => {
    await Internals.fetchIcon('01d')
    expect(fetchStub.mock.calls[0]?.[0]).toBe('https://openweathermap.org/img/w/01d.png')
  })
  it('should pass an AbortSignal in the fetch options', async () => {
    const sentinelSignal = cast<AbortSignal>({})
    vi.spyOn(AbortSignal, 'timeout').mockReturnValue(sentinelSignal)
    await Internals.fetchIcon('01d')
    expect(cast<{ signal: unknown }>(fetchStub.mock.calls[0]?.[1]).signal).toBe(sentinelSignal)
  })
  it('should return a Buffer with the response body bytes', async () => {
    fetchStub.mockResolvedValue(cast<globalThis.Response>(makeOkResponse({ body: 'HELLO' })))
    const result = await Internals.fetchIcon('01d')
    expect(result.buffer.toString('utf8')).toBe('HELLO')
  })
  it('should return the content-type from the response', async () => {
    fetchStub.mockResolvedValue(cast<globalThis.Response>(makeOkResponse({ contentType: 'image/jpeg' })))
    const result = await Internals.fetchIcon('01d')
    expect(result.contentType).toBe('image/jpeg')
  })
  it('should default content-type to image/png when missing', async () => {
    fetchStub.mockResolvedValue(
      cast<globalThis.Response>({
        ok: true,
        status: 200,
        headers: { get: () => null },
        arrayBuffer: async () => await Promise.resolve(makeBuffer('x')),
      }),
    )
    const result = await Internals.fetchIcon('01d')
    expect(result.contentType).toBe('image/png')
  })
  it('should use max-age from response Cache-Control', async () => {
    fetchStub.mockResolvedValue(cast<globalThis.Response>(makeOkResponse({ cacheControl: 'public, max-age=600' })))
    const result = await Internals.fetchIcon('01d')
    expect(result.ttlMs).toBe(600_000)
  })
  it('should fall back to default TTL when Cache-Control absent', async () => {
    const result = await Internals.fetchIcon('01d')
    expect(result.ttlMs).toBe(DEFAULT_ICON_TTL_MS)
  })
  it('should clamp TTL at the maximum', async () => {
    fetchStub.mockResolvedValue(
      cast<globalThis.Response>(makeOkResponse({ cacheControl: `max-age=${MAX_ICON_TTL_MS}` })),
    )
    const result = await Internals.fetchIcon('01d')
    expect(result.ttlMs).toBe(MAX_ICON_TTL_MS)
  })
  it('should throw IconFetchError with status 404 when upstream returns 404', async () => {
    fetchStub.mockResolvedValue(cast<globalThis.Response>(makeErrorResponse(404)))
    await expect(Internals.fetchIcon('01d')).rejects.toBeInstanceOf(IconFetchError)
  })
  it('should preserve the 404 status code on the IconFetchError', async () => {
    fetchStub.mockResolvedValue(cast<globalThis.Response>(makeErrorResponse(404)))
    await expect(Internals.fetchIcon('01d')).rejects.toHaveProperty('statusCode', 404)
  })
  it('should preserve the 403 status code on the IconFetchError', async () => {
    fetchStub.mockResolvedValue(cast<globalThis.Response>(makeErrorResponse(403)))
    await expect(Internals.fetchIcon('01d')).rejects.toHaveProperty('statusCode', 403)
  })
  it('should map 500 upstream errors to status 502 on the IconFetchError', async () => {
    fetchStub.mockResolvedValue(cast<globalThis.Response>(makeErrorResponse(500)))
    await expect(Internals.fetchIcon('01d')).rejects.toHaveProperty('statusCode', 502)
  })
  it('should propagate network errors from fetch', async () => {
    const err = new Error('network')
    fetchStub.mockRejectedValue(err)
    await expect(Internals.fetchIcon('01d')).rejects.toBe(err)
  })
})

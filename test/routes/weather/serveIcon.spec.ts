'use sanity'

import {
  BROWSER_ICON_CACHE_SECONDS,
  IconCache,
  IconFetchError,
  Internals,
  type IconCacheEntry,
} from '#routes/weather.js'
import type { Request } from 'express'
import { cast } from '#testutils/typeGuards.js'
import { createResponseFake } from '#testutils/express.js'
import type { MockInstance } from 'vitest'

const makeEntry = (overrides: Partial<IconCacheEntry> = {}): IconCacheEntry => ({
  buffer: Buffer.from('PNG-CACHED'),
  contentType: 'image/png',
  expiresAt: 1_000_000,
  ...overrides,
})

const makeRequest = (code: string): Request => cast<Request>({ params: { code } })

describe('routes/weather serveIcon()', () => {
  let { stub: responseStub, fake: responseFake } = createResponseFake()
  let fetchIconStub: MockInstance = vi.fn()
  let nowStub: MockInstance = vi.fn()
  const now = 1_000
  beforeEach(() => {
    IconCache.entries.clear()
    ;({ stub: responseStub, fake: responseFake } = createResponseFake())
    fetchIconStub = vi.spyOn(Internals, 'fetchIcon').mockResolvedValue({
      buffer: Buffer.from('PNG-FRESH'),
      contentType: 'image/png',
      ttlMs: 60_000,
    })
    nowStub = vi.spyOn(Date, 'now').mockReturnValue(now)
  })
  afterEach(() => {
    IconCache.entries.clear()
    nowStub.mockReset()
  })

  describe('input validation', () => {
    const invalidCodes = ['', 'foo', '01x', '1d', '011d', 'abc', '../etc/passwd', '01d/extra']
    invalidCodes.forEach((code) => {
      it(`should respond 400 for invalid code "${code}"`, async () => {
        await Internals.serveIcon(makeRequest(code), responseFake)
        expect(responseStub.status.mock.calls[0]?.[0]).toBe(400)
      })
    })
    it('should not call fetchIcon on invalid code', async () => {
      await Internals.serveIcon(makeRequest('bad'), responseFake)
      expect(fetchIconStub.mock.calls.length).toBe(0)
    })
    const validCodes = ['01d', '01n', '02d', '13n', '50d', '50n']
    validCodes.forEach((code) => {
      it(`should accept valid code "${code}"`, async () => {
        await Internals.serveIcon(makeRequest(code), responseFake)
        expect(responseStub.status.mock.calls[0]?.[0]).toBe(200)
      })
    })
  })

  describe('cache miss (cold)', () => {
    it('should call fetchIcon with the requested code', async () => {
      await Internals.serveIcon(makeRequest('01d'), responseFake)
      expect(fetchIconStub.mock.calls[0]?.[0]).toBe('01d')
    })
    it('should store fetched entry in IconCache.entries', async () => {
      await Internals.serveIcon(makeRequest('01d'), responseFake)
      expect(IconCache.entries.has('01d')).toBe(true)
    })
    it('should store the fetched buffer in the cache entry', async () => {
      await Internals.serveIcon(makeRequest('01d'), responseFake)
      expect(IconCache.entries.get('01d')?.buffer.toString('utf8')).toBe('PNG-FRESH')
    })
    it('should store the fetched contentType in the cache entry', async () => {
      fetchIconStub.mockResolvedValue({ buffer: Buffer.from('x'), contentType: 'image/jpeg', ttlMs: 60_000 })
      await Internals.serveIcon(makeRequest('01d'), responseFake)
      expect(IconCache.entries.get('01d')?.contentType).toBe('image/jpeg')
    })
    it('should compute expiresAt as now + ttlMs', async () => {
      fetchIconStub.mockResolvedValue({ buffer: Buffer.from('x'), contentType: 'image/png', ttlMs: 60_000 })
      await Internals.serveIcon(makeRequest('01d'), responseFake)
      expect(IconCache.entries.get('01d')?.expiresAt).toBe(now + 60_000)
    })
    it('should respond 200', async () => {
      await Internals.serveIcon(makeRequest('01d'), responseFake)
      expect(responseStub.status.mock.calls[0]?.[0]).toBe(200)
    })
    it('should send the fetched buffer', async () => {
      await Internals.serveIcon(makeRequest('01d'), responseFake)
      expect(cast<Buffer>(responseStub.send.mock.calls[0]?.[0]).toString('utf8')).toBe('PNG-FRESH')
    })
  })

  describe('cache hit (warm, not expired)', () => {
    beforeEach(() => {
      IconCache.entries.set(
        '01d',
        makeEntry({ buffer: Buffer.from('PNG-CACHED'), contentType: 'image/png', expiresAt: now + 30_000 }),
      )
    })
    it('should not call fetchIcon', async () => {
      await Internals.serveIcon(makeRequest('01d'), responseFake)
      expect(fetchIconStub.mock.calls.length).toBe(0)
    })
    it('should respond 200', async () => {
      await Internals.serveIcon(makeRequest('01d'), responseFake)
      expect(responseStub.status.mock.calls[0]?.[0]).toBe(200)
    })
    it('should send the cached buffer', async () => {
      await Internals.serveIcon(makeRequest('01d'), responseFake)
      expect(cast<Buffer>(responseStub.send.mock.calls[0]?.[0]).toString('utf8')).toBe('PNG-CACHED')
    })
    it('should set Content-Type from the cache entry', async () => {
      IconCache.entries.set('01d', makeEntry({ contentType: 'image/jpeg', expiresAt: now + 30_000 }))
      await Internals.serveIcon(makeRequest('01d'), responseFake)
      expect(responseStub.set.mock.calls.some((c) => c[0] === 'Content-Type' && c[1] === 'image/jpeg')).toBe(true)
    })
    it('should set Cache-Control with a 6-hour max-age', async () => {
      await Internals.serveIcon(makeRequest('01d'), responseFake)
      expect(
        responseStub.set.mock.calls.some(
          (c) => c[0] === 'Cache-Control' && c[1] === `public, max-age=${BROWSER_ICON_CACHE_SECONDS}`,
        ),
      ).toBe(true)
    })
  })

  describe('cache hit (expired)', () => {
    beforeEach(() => {
      IconCache.entries.set('01d', makeEntry({ buffer: Buffer.from('STALE'), expiresAt: now - 1 }))
    })
    it('should call fetchIcon', async () => {
      await Internals.serveIcon(makeRequest('01d'), responseFake)
      expect(fetchIconStub.mock.calls[0]?.[0]).toBe('01d')
    })
    it('should overwrite the cache entry with fresh bytes', async () => {
      await Internals.serveIcon(makeRequest('01d'), responseFake)
      expect(IconCache.entries.get('01d')?.buffer.toString('utf8')).toBe('PNG-FRESH')
    })
    it('should send the fresh buffer', async () => {
      await Internals.serveIcon(makeRequest('01d'), responseFake)
      expect(cast<Buffer>(responseStub.send.mock.calls[0]?.[0]).toString('utf8')).toBe('PNG-FRESH')
    })
  })

  describe('upstream errors', () => {
    it('should respond 403 when fetchIcon throws IconFetchError with statusCode 403', async () => {
      fetchIconStub.mockRejectedValue(new IconFetchError(403))
      await Internals.serveIcon(makeRequest('01d'), responseFake)
      expect(responseStub.status.mock.calls[0]?.[0]).toBe(403)
    })
    it('should respond 404 when fetchIcon throws IconFetchError with statusCode 404', async () => {
      fetchIconStub.mockRejectedValue(new IconFetchError(404))
      await Internals.serveIcon(makeRequest('01d'), responseFake)
      expect(responseStub.status.mock.calls[0]?.[0]).toBe(404)
    })
    it('should respond 502 when fetchIcon throws IconFetchError with statusCode 502', async () => {
      fetchIconStub.mockRejectedValue(new IconFetchError(502))
      await Internals.serveIcon(makeRequest('01d'), responseFake)
      expect(responseStub.status.mock.calls[0]?.[0]).toBe(502)
    })
    it('should respond 502 when fetchIcon rejects with a non-IconFetchError', async () => {
      fetchIconStub.mockRejectedValue(new Error('network'))
      await Internals.serveIcon(makeRequest('01d'), responseFake)
      expect(responseStub.status.mock.calls[0]?.[0]).toBe(502)
    })
    it('should not cache 404 responses', async () => {
      fetchIconStub.mockRejectedValue(new IconFetchError(404))
      await Internals.serveIcon(makeRequest('01d'), responseFake)
      expect(IconCache.entries.has('01d')).toBe(false)
    })
    it('should not cache 502 responses', async () => {
      fetchIconStub.mockRejectedValue(new IconFetchError(502))
      await Internals.serveIcon(makeRequest('01d'), responseFake)
      expect(IconCache.entries.has('01d')).toBe(false)
    })
    it('should not cache network failures', async () => {
      fetchIconStub.mockRejectedValue(new Error('network'))
      await Internals.serveIcon(makeRequest('01d'), responseFake)
      expect(IconCache.entries.has('01d')).toBe(false)
    })
  })
})

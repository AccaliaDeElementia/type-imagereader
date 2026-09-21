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

const ICON_CODE = '01d'
const NOW = 1_000
const TTL_MS = 60_000
const UNEXPIRED_MS = 30_000
const FRESH_BYTES = 'PNG-FRESH'
const CACHED_BYTES = 'PNG-CACHED'

const makeEntry = (overrides: Partial<IconCacheEntry> = {}): IconCacheEntry => ({
  buffer: Buffer.from(CACHED_BYTES),
  contentType: 'image/png',
  expiresAt: 1_000_000,
  ...overrides,
})

const makeRequest = (code: string): Request => cast<Request>({ params: { code } })

interface RefreshScenario {
  scenario: string
  seedCache: () => void
}

const refreshScenarios: RefreshScenario[] = [
  { scenario: 'the cache is cold', seedCache: () => undefined },
  {
    scenario: 'the cached entry has expired',
    seedCache: () => {
      IconCache.entries.set(ICON_CODE, makeEntry({ buffer: Buffer.from('STALE'), expiresAt: NOW - 1 }))
    },
  },
]

interface UpstreamFailure {
  failure: string
  rejection: () => Error
  expectedStatus: number
}

const upstreamFailures: UpstreamFailure[] = [
  { failure: 'IconFetchError 403', rejection: () => new IconFetchError(403), expectedStatus: 403 },
  { failure: 'IconFetchError 404', rejection: () => new IconFetchError(404), expectedStatus: 404 },
  { failure: 'IconFetchError 502', rejection: () => new IconFetchError(502), expectedStatus: 502 },
  { failure: 'a network error', rejection: () => new Error('network'), expectedStatus: 502 },
]

describe('routes/weather serveIcon()', () => {
  let { stub: responseStub, fake: responseFake } = createResponseFake()
  let fetchIconStub: MockInstance = vi.fn()
  let nowStub: MockInstance = vi.fn()
  beforeEach(() => {
    IconCache.entries.clear()
    ;({ stub: responseStub, fake: responseFake } = createResponseFake())
    fetchIconStub = vi.spyOn(Internals, 'fetchIcon').mockResolvedValue({
      buffer: Buffer.from(FRESH_BYTES),
      contentType: 'image/png',
      ttlMs: TTL_MS,
    })
    nowStub = vi.spyOn(Date, 'now').mockReturnValue(NOW)
  })
  afterEach(() => {
    IconCache.entries.clear()
    nowStub.mockReset()
  })

  const serve = async (code: string = ICON_CODE): Promise<void> => {
    await Internals.serveIcon(makeRequest(code), responseFake)
  }
  const sentBody = (): string => cast<Buffer>(responseStub.send.mock.calls[0]?.[0]).toString('utf8')
  const sentStatus = (): unknown => responseStub.status.mock.calls[0]?.[0]

  describe('input validation', () => {
    const invalidCodes = ['', 'foo', '01x', '1d', '011d', 'abc', '../etc/passwd', '01d/extra']
    invalidCodes.forEach((code: string): void => {
      it(`should reject invalid code "${code}" without reaching upstream`, async () => {
        await serve(code)
        expect({ status: sentStatus(), fetches: fetchIconStub.mock.calls.length }).toEqual({ status: 400, fetches: 0 })
      })
    })
    const validCodes = ['01d', '01n', '02d', '13n', '50d', '50n']
    validCodes.forEach((code: string): void => {
      it(`should accept valid code "${code}"`, async () => {
        await serve(code)
        expect(sentStatus()).toBe(200)
      })
    })
  })

  refreshScenarios.forEach(({ scenario, seedCache }: RefreshScenario): void => {
    describe(`when ${scenario}`, () => {
      beforeEach(() => {
        seedCache()
      })
      it('should request the icon upstream exactly once by code', async () => {
        await serve()
        expect(fetchIconStub.mock.calls).toEqual([[ICON_CODE]])
      })
      it('should cache the fetched bytes, content type and expiry', async () => {
        fetchIconStub.mockResolvedValue({ buffer: Buffer.from(FRESH_BYTES), contentType: 'image/jpeg', ttlMs: TTL_MS })
        await serve()
        expect(IconCache.entries.get(ICON_CODE)).toEqual({
          buffer: Buffer.from(FRESH_BYTES),
          contentType: 'image/jpeg',
          expiresAt: NOW + TTL_MS,
        })
      })
      it('should respond 200 with the freshly fetched bytes', async () => {
        await serve()
        expect({ status: sentStatus(), body: sentBody() }).toEqual({ status: 200, body: FRESH_BYTES })
      })
    })
  })

  describe('when the cached entry is still valid', () => {
    beforeEach(() => {
      IconCache.entries.set(
        ICON_CODE,
        makeEntry({ buffer: Buffer.from(CACHED_BYTES), contentType: 'image/jpeg', expiresAt: NOW + UNEXPIRED_MS }),
      )
    })
    it('should respond 200 with the cached bytes without reaching upstream', async () => {
      await serve()
      expect({ status: sentStatus(), body: sentBody(), fetches: fetchIconStub.mock.calls.length }).toEqual({
        status: 200,
        body: CACHED_BYTES,
        fetches: 0,
      })
    })
    it("should set the entry's content type and the browser cache lifetime", async () => {
      await serve()
      expect(responseStub.set.mock.calls).toEqual([
        ['Content-Type', 'image/jpeg'],
        ['Cache-Control', `public, max-age=${BROWSER_ICON_CACHE_SECONDS}`],
      ])
    })
  })

  describe('upstream errors', () => {
    upstreamFailures.forEach(({ failure, rejection, expectedStatus }: UpstreamFailure): void => {
      it(`should respond ${expectedStatus} and cache nothing when fetchIcon rejects with ${failure}`, async () => {
        fetchIconStub.mockRejectedValue(rejection())
        await serve()
        expect({ status: sentStatus(), cached: IconCache.entries.has(ICON_CODE) }).toEqual({
          status: expectedStatus,
          cached: false,
        })
      })
    })
  })
})

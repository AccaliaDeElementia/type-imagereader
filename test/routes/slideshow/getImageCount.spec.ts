'use sanity'

import { createKnexChainFake } from '#testutils/knex.js'
import { getImageCount, Imports } from '#routes/slideshow.js'
import type { MockInstance } from 'vitest'

describe('routes/slideshow getImageCount()', () => {
  describe('with default unreadOnly', () => {
    let {
      instance: knexInstanceStub,
      stub: knexStub,
      fake: knexFake,
    } = createKnexChainFake(['count'] as const, ['where'] as const)
    beforeEach(() => {
      ;({
        instance: knexInstanceStub,
        stub: knexStub,
        fake: knexFake,
      } = createKnexChainFake(['count'] as const, ['where'] as const))
    })

    describe('query shape', () => {
      beforeEach(async () => {
        await getImageCount(knexFake, '/slideshow/path')
      })
      it('should query knex once', () => {
        expect(knexStub.mock.calls.length).toBe(1)
      })
      it('should query pictures folder', () => {
        expect(knexStub.mock.calls[0]).toEqual(['pictures'])
      })
      it('should count result rows', () => {
        expect(knexInstanceStub.count.mock.calls.length).toBe(1)
      })
      it('should count results by path column', () => {
        expect(knexInstanceStub.count.mock.calls[0]).toEqual([{ count: 'path' }])
      })
      it('should filter results with where clause', () => {
        expect(knexInstanceStub.where.mock.calls.length).toBe(1)
      })
      it('should filter results on paths prefixed with parameter', () => {
        expect(knexInstanceStub.where.mock.calls[0]).toEqual(['path', 'like', '/slideshow/path%'])
      })
    })

    const resultsTests: Array<[string, unknown, number]> = [
      ['default value for no results', [], 0],
      ['default value for undefined results', undefined, 0],
      ['default value for null results', null, 0],
      ['default value for undefined results row', [undefined], 0],
      ['default value for null results row', [null], 0],
      ['default value for number results', [42], 0],
      ['default value for missing key results', [{}], 0],
      ['default value for undefined results key', [{ count: undefined }], 0],
      ['default value for null results key', [{ count: null }], 0],
      ['first result only', [{ count: 72 }, { count: 89 }], 72],
      ['number results ', [{ count: 12 }], 12],
      ['string results ', [{ count: '24' }], 24],
    ]
    resultsTests.forEach(([title, result, expected]) => {
      it(`should resolve ${title}`, async () => {
        knexInstanceStub.where.mockResolvedValue(result)
        const actual = await getImageCount(knexFake, '/foo')
        expect(actual).toBe(expected)
      })
    })
    it('should escape % in path for LIKE query', async () => {
      await getImageCount(knexFake, '/foo%bar/')
      expect(knexInstanceStub.where.mock.calls[0]).toEqual(['path', 'like', '/foo\\%bar/%'])
    })
  })

  describe("with filter = 'all'", () => {
    let {
      instance: knexInstanceStub,
      stub: knexStub,
      fake: knexFake,
    } = createKnexChainFake(['count'] as const, ['where'] as const)
    beforeEach(() => {
      ;({
        instance: knexInstanceStub,
        stub: knexStub,
        fake: knexFake,
      } = createKnexChainFake(['count'] as const, ['where'] as const))
    })
    it('should query knex once', async () => {
      await getImageCount(knexFake, '/slideshow/path', 'all')
      expect(knexStub.mock.calls.length).toBe(1)
    })
    it('should filter results with where clause', async () => {
      await getImageCount(knexFake, '/slideshow/path', 'all')
      expect(knexInstanceStub.where.mock.calls.length).toBe(1)
    })
    it('should resolve number results', async () => {
      knexInstanceStub.where.mockResolvedValue([{ count: 12 }])
      const actual = await getImageCount(knexFake, '/foo', 'all')
      expect(actual).toBe(12)
    })
  })

  describe("with filter = 'unread'", () => {
    let {
      instance: knexInstanceStub,
      stub: knexStub,
      fake: knexFake,
    } = createKnexChainFake(['count', 'where'] as const, ['andWhere'] as const)
    beforeEach(() => {
      ;({
        instance: knexInstanceStub,
        stub: knexStub,
        fake: knexFake,
      } = createKnexChainFake(['count', 'where'] as const, ['andWhere'] as const))
    })

    describe('query shape', () => {
      beforeEach(async () => {
        await getImageCount(knexFake, '/slideshow/path', 'unread')
      })
      it('should query knex once', () => {
        expect(knexStub.mock.calls.length).toBe(1)
      })
      it('should query pictures folder', () => {
        expect(knexStub.mock.calls[0]).toEqual(['pictures'])
      })
      it('should count result rows', () => {
        expect(knexInstanceStub.count.mock.calls.length).toBe(1)
      })
      it('should count results by path column', () => {
        expect(knexInstanceStub.count.mock.calls[0]).toEqual([{ count: 'path' }])
      })
      it('should filter results with where clause', () => {
        expect(knexInstanceStub.where.mock.calls.length).toBe(1)
      })
      it('should filter results on paths prefixed with parameter', () => {
        expect(knexInstanceStub.where.mock.calls[0]).toEqual(['path', 'like', '/slideshow/path%'])
      })
      it('should additionally filter results with andWhere()', () => {
        expect(knexInstanceStub.andWhere.mock.calls.length).toBe(1)
      })
      it('should filter results on only unseen', () => {
        expect(knexInstanceStub.andWhere.mock.calls[0]).toEqual(['seen', '=', false])
      })
    })

    const resultsTests: Array<[string, unknown, number]> = [
      ['default value for no results', [], 0],
      ['default value for undefined results', undefined, 0],
      ['default value for null results', null, 0],
      ['default value for undefined results row', [undefined], 0],
      ['default value for null results row', [null], 0],
      ['default value for number results', [42], 0],
      ['default value for missing key results', [{}], 0],
      ['default value for undefined results key', [{ count: undefined }], 0],
      ['default value for null results key', [{ count: null }], 0],
      ['first result only', [{ count: 72 }, { count: 89 }], 72],
      ['number results ', [{ count: 12 }], 12],
      ['string results ', [{ count: '24' }], 24],
    ]
    resultsTests.forEach(([title, result, expected]) => {
      it(`should resolve ${title}`, async () => {
        knexInstanceStub.andWhere.mockResolvedValue(result)
        const actual = await getImageCount(knexFake, '/foo', 'unread')
        expect(actual).toBe(expected)
      })
    })
    it('should escape % in path for LIKE query', async () => {
      await getImageCount(knexFake, '/foo%bar/', 'unread')
      expect(knexInstanceStub.where.mock.calls[0]).toEqual(['path', 'like', '/foo\\%bar/%'])
    })
  })

  describe('when the query rejects', () => {
    let {
      instance: knexInstanceStub,
      stub: knexStub,
      fake: knexFake,
    } = createKnexChainFake(['count'] as const, ['where'] as const)
    let loggerStub: MockInstance = vi.fn()
    beforeEach(() => {
      ;({
        instance: knexInstanceStub,
        stub: knexStub,
        fake: knexFake,
      } = createKnexChainFake(['count'] as const, ['where'] as const))
      knexInstanceStub.where.mockRejectedValue(new Error('db exploded'))
      loggerStub = vi.spyOn(Imports, 'logger').mockImplementation((..._args: unknown[]) => undefined)
    })
    afterEach(() => {
      vi.restoreAllMocks()
    })
    it('should still resolve to ZERO_COUNT as a safe fallback', async () => {
      const actual = await getImageCount(knexFake, '/foo')
      expect(actual).toBe(0)
    })
    it('should log the query failure', async () => {
      await getImageCount(knexFake, '/foo')
      const hasLog = loggerStub.mock.calls.some((c) => c[0] === 'getImageCount query error')
      expect(hasLog).toBe(true)
    })
    it('should include the rejection error in the log arguments', async () => {
      const err = new Error('db exploded')
      knexInstanceStub.where.mockRejectedValue(err)
      await getImageCount(knexFake, '/foo')
      const logCall = loggerStub.mock.calls.find((c) => c[0] === 'getImageCount query error')
      expect(logCall?.[1]).toBe(err)
    })
    it('should still call the query once before logging', async () => {
      await getImageCount(knexFake, '/foo')
      expect(knexStub.mock.calls.length).toBe(1)
    })
  })
})

'use sanity'

import { createKnexChainFake } from '#testutils/knex.js'
import Sinon from 'sinon'
import { getImageCount, Imports } from '#routes/slideshow.js'

const sandbox = Sinon.createSandbox()

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
        expect(knexStub.callCount).toBe(1)
      })
      it('should query pictures folder', () => {
        expect(knexStub.firstCall.args).toEqual(['pictures'])
      })
      it('should count result rows', () => {
        expect(knexInstanceStub.count.callCount).toBe(1)
      })
      it('should count results by path column', () => {
        expect(knexInstanceStub.count.firstCall.args).toEqual([{ count: 'path' }])
      })
      it('should filter results with where clause', () => {
        expect(knexInstanceStub.where.callCount).toBe(1)
      })
      it('should filter results on paths prefixed with parameter', () => {
        expect(knexInstanceStub.where.firstCall.args).toEqual(['path', 'like', '/slideshow/path%'])
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
        knexInstanceStub.where.resolves(result)
        const actual = await getImageCount(knexFake, '/foo')
        expect(actual).toBe(expected)
      })
    })
    it('should escape % in path for LIKE query', async () => {
      await getImageCount(knexFake, '/foo%bar/')
      expect(knexInstanceStub.where.firstCall.args).toEqual(['path', 'like', '/foo\\%bar/%'])
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
      expect(knexStub.callCount).toBe(1)
    })
    it('should filter results with where clause', async () => {
      await getImageCount(knexFake, '/slideshow/path', 'all')
      expect(knexInstanceStub.where.callCount).toBe(1)
    })
    it('should resolve number results', async () => {
      knexInstanceStub.where.resolves([{ count: 12 }])
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
        expect(knexStub.callCount).toBe(1)
      })
      it('should query pictures folder', () => {
        expect(knexStub.firstCall.args).toEqual(['pictures'])
      })
      it('should count result rows', () => {
        expect(knexInstanceStub.count.callCount).toBe(1)
      })
      it('should count results by path column', () => {
        expect(knexInstanceStub.count.firstCall.args).toEqual([{ count: 'path' }])
      })
      it('should filter results with where clause', () => {
        expect(knexInstanceStub.where.callCount).toBe(1)
      })
      it('should filter results on paths prefixed with parameter', () => {
        expect(knexInstanceStub.where.firstCall.args).toEqual(['path', 'like', '/slideshow/path%'])
      })
      it('should additionally filter results with andWhere()', () => {
        expect(knexInstanceStub.andWhere.callCount).toBe(1)
      })
      it('should filter results on only unseen', () => {
        expect(knexInstanceStub.andWhere.firstCall.args).toEqual(['seen', '=', false])
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
        knexInstanceStub.andWhere.resolves(result)
        const actual = await getImageCount(knexFake, '/foo', 'unread')
        expect(actual).toBe(expected)
      })
    })
    it('should escape % in path for LIKE query', async () => {
      await getImageCount(knexFake, '/foo%bar/', 'unread')
      expect(knexInstanceStub.where.firstCall.args).toEqual(['path', 'like', '/foo\\%bar/%'])
    })
  })

  describe('when the query rejects', () => {
    let {
      instance: knexInstanceStub,
      stub: knexStub,
      fake: knexFake,
    } = createKnexChainFake(['count'] as const, ['where'] as const)
    let loggerStub = sandbox.stub()
    beforeEach(() => {
      ;({
        instance: knexInstanceStub,
        stub: knexStub,
        fake: knexFake,
      } = createKnexChainFake(['count'] as const, ['where'] as const))
      knexInstanceStub.where.rejects(new Error('db exploded'))
      loggerStub = sandbox.stub(Imports, 'logger')
    })
    afterEach(() => {
      sandbox.restore()
    })
    it('should still resolve to ZERO_COUNT as a safe fallback', async () => {
      const actual = await getImageCount(knexFake, '/foo')
      expect(actual).toBe(0)
    })
    it('should log the query failure', async () => {
      await getImageCount(knexFake, '/foo')
      const hasLog = loggerStub.getCalls().some((c) => c.args[0] === 'getImageCount query error')
      expect(hasLog).toBe(true)
    })
    it('should include the rejection error in the log arguments', async () => {
      const err = new Error('db exploded')
      knexInstanceStub.where.rejects(err)
      await getImageCount(knexFake, '/foo')
      const logCall = loggerStub.getCalls().find((c) => c.args[0] === 'getImageCount query error')
      expect(logCall?.args[1]).toBe(err)
    })
    it('should still call the query once before logging', async () => {
      await getImageCount(knexFake, '/foo')
      expect(knexStub.callCount).toBe(1)
    })
  })
})

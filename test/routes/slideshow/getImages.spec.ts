'use sanity'

import { createKnexChainFake } from '#testutils/knex.js'
import { getImages } from '#routes/slideshow.js'

describe('routes/slideshow getImages()', () => {
  let {
    instance: knexInstanceStub,
    stub: knexStub,
    fake: knexFake,
  } = createKnexChainFake(['select', 'where', 'orderBy', 'offset'] as const, ['limit'] as const, [
    { path: '1' },
    { path: '2' },
    { path: '3' },
    { path: '4' },
    { path: '5' },
  ])
  beforeEach(() => {
    ;({
      instance: knexInstanceStub,
      stub: knexStub,
      fake: knexFake,
    } = createKnexChainFake(['select', 'where', 'orderBy', 'offset'] as const, ['limit'] as const, [
      { path: '1' },
      { path: '2' },
      { path: '3' },
      { path: '4' },
      { path: '5' },
    ]))
  })

  describe('when called with page=0 and limit=40', () => {
    let images: string[] = []
    beforeEach(async () => {
      images = await getImages(knexFake, '/foo/bar', 0, 40)
    })
    it('should make a knex query', () => {
      expect(knexStub.callCount).toBe(1)
    })
    it('should operate on pictures table', () => {
      expect(knexStub.firstCall.args).toEqual(['pictures'])
    })
    it('should select data', () => {
      expect(knexInstanceStub.select.callCount).toBe(1)
    })
    it('should select only path column', () => {
      expect(knexInstanceStub.select.firstCall.args).toEqual(['path'])
    })
    it('should filter records with where clause', () => {
      expect(knexInstanceStub.where.callCount).toBe(1)
    })
    it('should filter by path prefix', () => {
      expect(knexInstanceStub.where.firstCall.args).toEqual(['path', 'like', '/foo/bar%'])
    })
    it('should order by first and second order sorts', () => {
      expect(knexInstanceStub.orderBy.callCount).toBe(2)
    })
    it('should sort first by seen flag', () => {
      expect(knexInstanceStub.orderBy.firstCall.args).toEqual(['seen'])
    })
    it('should sort second by pathHash column', () => {
      expect(knexInstanceStub.orderBy.secondCall.args).toEqual(['pathHash'])
    })
    it('should offset into results', () => {
      expect(knexInstanceStub.offset.callCount).toBe(1)
    })
    it('should limit results', () => {
      expect(knexInstanceStub.limit.callCount).toBe(1)
    })
    it('should limit results to expected limit', () => {
      expect(knexInstanceStub.limit.firstCall.args).toEqual([40])
    })
    it('should extract paths from results', () => {
      expect(images).toEqual(['1', '2', '3', '4', '5'])
    })
  })

  describe('when called with page=3', () => {
    it('should offset by expected amount', async () => {
      await getImages(knexFake, '/foo/bar', 3, 40)
      expect(knexInstanceStub.offset.firstCall.args).toEqual([120])
    })
  })

  it('should escape % in path for LIKE query', async () => {
    await getImages(knexFake, '/foo%bar', 0, 40)
    expect(knexInstanceStub.where.firstCall.args).toEqual(['path', 'like', '/foo\\%bar%'])
  })
})

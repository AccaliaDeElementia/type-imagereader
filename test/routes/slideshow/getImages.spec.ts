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
  const tests: Array<[string, number, number, (data: string[]) => void]> = [
    [
      'make a knex query',
      0,
      40,
      () => {
        expect(knexStub.callCount).toBe(1)
      },
    ],
    [
      'operate on pictures table',
      0,
      40,
      () => {
        expect(knexStub.firstCall.args).toEqual(['pictures'])
      },
    ],
    [
      'select data',
      0,
      40,
      () => {
        expect(knexInstanceStub.select.callCount).toBe(1)
      },
    ],
    [
      'select only path column',
      0,
      40,
      () => {
        expect(knexInstanceStub.select.firstCall.args).toEqual(['path'])
      },
    ],
    [
      'filter records with where clause',
      0,
      40,
      () => {
        expect(knexInstanceStub.where.callCount).toBe(1)
      },
    ],
    [
      'filter by path prefix',
      0,
      40,
      () => {
        expect(knexInstanceStub.where.firstCall.args).toEqual(['path', 'like', '/foo/bar%'])
      },
    ],
    [
      'order by first and second order sorts',
      0,
      40,
      () => {
        expect(knexInstanceStub.orderBy.callCount).toBe(2)
      },
    ],
    [
      'sort first by see flag',
      0,
      40,
      () => {
        expect(knexInstanceStub.orderBy.firstCall.args).toEqual(['seen'])
      },
    ],
    [
      'sort second by pathHash column',
      0,
      40,
      () => {
        expect(knexInstanceStub.orderBy.secondCall.args).toEqual(['pathHash'])
      },
    ],
    [
      'offset into results',
      0,
      40,
      () => {
        expect(knexInstanceStub.offset.callCount).toBe(1)
      },
    ],
    [
      'offset by expected amount',
      3,
      40,
      () => {
        expect(knexInstanceStub.offset.firstCall.args).toEqual([120])
      },
    ],
    [
      'limit results',
      0,
      40,
      () => {
        expect(knexInstanceStub.limit.callCount).toBe(1)
      },
    ],
    [
      'limit results to expected limit',
      0,
      40,
      () => {
        expect(knexInstanceStub.limit.firstCall.args).toEqual([40])
      },
    ],
    [
      'extract paths from results',
      0,
      40,
      (data) => {
        expect(data).toEqual(['1', '2', '3', '4', '5'])
      },
    ],
  ]
  tests.forEach(([title, page, limit, validationFn]) => {
    it(`should ${title}`, async () => {
      const images = await getImages(knexFake, '/foo/bar', page, limit)
      validationFn(images)
    })
  })
  it('should escape % in path for LIKE query', async () => {
    await getImages(knexFake, '/foo%bar', 0, 40)
    expect(knexInstanceStub.where.firstCall.args).toEqual(['path', 'like', '/foo\\%bar%'])
  })
})

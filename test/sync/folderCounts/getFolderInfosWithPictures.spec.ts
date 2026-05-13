'use sanity'

import { type FolderInfo, getFolderInfosWithPictures } from '#sync/folderCounts.js'
import { cast, stubToKnex } from '#testutils/typeGuards.js'
import type { MockInstance } from 'vitest'

describe('sync/folderCounts getFolderInfosWithPictures()', () => {
  let knexStub = {
    select: vi.fn().mockImplementation(function (this: object): unknown {
      return this
    }),
    count: vi.fn().mockImplementation(function (this: object): unknown {
      return this
    }),
    sum: vi.fn().mockImplementation(function (this: object): unknown {
      return this
    }),
    groupBy: vi.fn().mockResolvedValue([]),
  }
  let knexFnStub: MockInstance & { raw?: MockInstance } = vi.fn().mockReturnValue(knexStub)
  let knexFnFake = stubToKnex(knexFnStub)
  beforeEach(() => {
    knexStub = {
      select: vi.fn().mockImplementation(function (this: object): unknown {
        return this
      }),
      count: vi.fn().mockImplementation(function (this: object): unknown {
        return this
      }),
      sum: vi.fn().mockImplementation(function (this: object): unknown {
        return this
      }),
      groupBy: vi.fn().mockResolvedValue([]),
    }
    knexFnStub = vi.fn().mockReturnValue(knexStub)
    knexFnFake = stubToKnex(knexFnStub)
    knexFnStub.raw = vi.fn()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })
  it('should handle empty results gracefully', async () => {
    const result = await getFolderInfosWithPictures(knexFnFake)
    expect(result).toEqual([])
  })
  it('should resolve to exact result from knex', async () => {
    const expected: FolderInfo[] = []
    knexStub.groupBy.mockResolvedValue(expected)
    const result = await getFolderInfosWithPictures(knexFnFake)
    expect(result).toBe(expected)
  })
  it('should not alter totalCount of valid results', async () => {
    const expected: FolderInfo[] = [
      {
        path: 'foo',
        totalCount: 31415926,
        seenCount: 0,
      },
    ]
    knexStub.groupBy.mockResolvedValue(expected)
    await getFolderInfosWithPictures(knexFnFake)
    expect(expected[0]?.totalCount).toBe(31415926)
  })
  it('should correct totalCount to number for invalid results', async () => {
    const data = [
      cast<FolderInfo>({
        path: 'foo',
        totalCount: '31415926',
        seenCount: 0,
      }),
    ]
    knexStub.groupBy.mockResolvedValue(data)
    await getFolderInfosWithPictures(knexFnFake)
    expect(data[0]?.totalCount).toBe(31415926)
  })
  it('should not alter seenCount of valid results', async () => {
    const expected: FolderInfo[] = [
      {
        path: 'foo',
        seenCount: 31415926,
        totalCount: 0,
      },
    ]
    knexStub.groupBy.mockResolvedValue(expected)
    await getFolderInfosWithPictures(knexFnFake)
    expect(expected[0]?.seenCount).toBe(31415926)
  })
  it('should correct seenCount to number for invalid results', async () => {
    const data = [
      cast<FolderInfo>({
        path: 'foo',
        seenCount: '31415926',
        totalCount: 0,
      }),
    ]
    knexStub.groupBy.mockResolvedValue(data)
    await getFolderInfosWithPictures(knexFnFake)
    expect(data[0]?.seenCount).toBe(31415926)
  })
  it('should query knexFn', async () => {
    await getFolderInfosWithPictures(knexFnFake)
    expect(knexFnStub.mock.calls.length).toBe(1)
  })
  it('should start knex query from pictures', async () => {
    await getFolderInfosWithPictures(knexFnFake)
    expect(knexFnStub.mock.calls[0]).toEqual(['pictures'])
  })
  it('should call select query builder', async () => {
    await getFolderInfosWithPictures(knexFnFake)
    expect(knexStub.select.mock.calls.length).toBe(1)
  })
  it('should select folder with rename to path', async () => {
    await getFolderInfosWithPictures(knexFnFake)
    expect(knexStub.select.mock.calls[0]).toEqual(['folder as path'])
  })
  it('should call `count` query builder', async () => {
    await getFolderInfosWithPictures(knexFnFake)
    expect(knexStub.count.mock.calls.length).toBe(1)
  })
  it('should count splat as totalCount', async () => {
    await getFolderInfosWithPictures(knexFnFake)
    expect(knexStub.count.mock.calls[0]).toEqual(['* as totalCount'])
  })
  it('should embed raw query in query builder chain', async () => {
    const rawQuery = { random: Math.random() }
    knexFnStub.raw?.mockReturnValue(rawQuery)
    await getFolderInfosWithPictures(knexFnFake)
    expect(knexFnStub.raw?.mock.calls.length).toBe(1)
  })
  it('should use case when to count based on boolean field in raw subquery', async () => {
    const rawQuery = { random: Math.random() }
    knexFnStub.raw?.mockReturnValue(rawQuery)
    await getFolderInfosWithPictures(knexFnFake)
    expect(knexFnStub.raw?.mock.calls[0]).toEqual(['CASE WHEN seen THEN 1 ELSE 0 END'])
  })
  it('should use sum querybuilder in query chain', async () => {
    const rawQuery = { random: Math.random() }
    knexFnStub.raw?.mockReturnValue(rawQuery)
    await getFolderInfosWithPictures(knexFnFake)
    expect(knexStub.sum.mock.calls.length).toBe(1)
  })
  it('should sum seenCount from raw sub query', async () => {
    const rawQuery = { random: Math.random() }
    knexFnStub.raw?.mockReturnValue(rawQuery)
    await getFolderInfosWithPictures(knexFnFake)
    expect(knexStub.sum.mock.calls[0]).toEqual([{ seenCount: rawQuery }])
  })
  it('should group by as part of qery chain', async () => {
    const rawQuery = { random: Math.random() }
    knexFnStub.raw?.mockReturnValue(rawQuery)
    await getFolderInfosWithPictures(knexFnFake)
    expect(knexStub.groupBy.mock.calls.length).toBe(1)
  })
  it('should group by folders field', async () => {
    const rawQuery = { random: Math.random() }
    knexFnStub.raw?.mockReturnValue(rawQuery)
    await getFolderInfosWithPictures(knexFnFake)
    expect(knexStub.groupBy.mock.calls[0]).toEqual(['folder'])
  })
})

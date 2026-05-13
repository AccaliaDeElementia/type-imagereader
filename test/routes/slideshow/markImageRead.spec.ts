'use sanity'

import { stubToKnex } from '#testutils/typeGuards.js'
import { markImageRead, Imports } from '#routes/slideshow.js'
import type { MockInstance } from 'vitest'

describe('routes/slideshow markImageRead()', () => {
  let conditionalUpdate = {
    update: vi.fn().mockImplementation(function (this: object): unknown {
      return this
    }),
    where: vi.fn().mockResolvedValue(0),
  }
  let incrementer = {
    increment: vi.fn().mockImplementation(function (this: object): unknown {
      return this
    }),
    whereIn: vi.fn().mockResolvedValue(undefined),
  }
  let knexStub = vi.fn().mockReturnValueOnce(conditionalUpdate).mockReturnValueOnce(incrementer)
  let knexFake = stubToKnex(knexStub)
  let getParentFoldersStub: MockInstance = vi.fn()
  beforeEach(() => {
    conditionalUpdate = {
      update: vi.fn().mockImplementation(function (this: object): unknown {
        return this
      }),
      where: vi.fn().mockResolvedValue(0),
    }
    incrementer = {
      increment: vi.fn().mockImplementation(function (this: object): unknown {
        return this
      }),
      whereIn: vi.fn().mockResolvedValue(undefined),
    }
    knexStub = vi.fn().mockReturnValueOnce(conditionalUpdate).mockReturnValueOnce(incrementer)
    knexFake = stubToKnex(knexStub)
    getParentFoldersStub = vi.spyOn(Imports, 'getParentFolders').mockReturnValue(['/foo/bar/', '/foo/', '/'])
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ---- Conditional UPDATE on pictures ----

  it('should call knex with the pictures table for the conditional UPDATE', async () => {
    await markImageRead(knexFake, '/foo/bar/baz.png')
    expect(knexStub.mock.calls[0]).toEqual(['pictures'])
  })
  it('should call update once on the conditional UPDATE', async () => {
    await markImageRead(knexFake, '/foo/bar/baz.png')
    expect(conditionalUpdate.update.mock.calls.length).toBe(1)
  })
  it('should set seen=true on the conditional UPDATE', async () => {
    await markImageRead(knexFake, '/foo/bar/baz.png')
    expect(conditionalUpdate.update.mock.calls[0]).toEqual([{ seen: true }])
  })
  it('should atomically gate the conditional UPDATE on path AND seen=false', async () => {
    await markImageRead(knexFake, '/foo/bar/baz.png')
    expect(conditionalUpdate.where.mock.calls[0]).toEqual([{ path: '/foo/bar/baz.png', seen: false }])
  })

  // ---- Conditional update flipped 0 rows (already seen / lost the race) ----

  it('should make only one knex call when conditional update flips zero rows', async () => {
    conditionalUpdate.where.mockResolvedValue(0)
    await markImageRead(knexFake, '/foo/bar/baz.png')
    expect(knexStub.mock.calls.length).toBe(1)
  })
  it('should not call getParentFolders when conditional update flips zero rows', async () => {
    conditionalUpdate.where.mockResolvedValue(0)
    await markImageRead(knexFake, '/foo/bar/baz.png')
    expect(getParentFoldersStub.mock.calls.length).toBe(0)
  })

  // ---- Conditional update flipped a row (caller is the flipper) ----

  it('should make two knex calls when conditional update flips a row', async () => {
    conditionalUpdate.where.mockResolvedValue(1)
    await markImageRead(knexFake, '/foo/bar/baz.png')
    expect(knexStub.mock.calls.length).toBe(2)
  })
  it('should query the folders table to increment seenCount when conditional update flips a row', async () => {
    conditionalUpdate.where.mockResolvedValue(1)
    await markImageRead(knexFake, '/foo/bar/baz.png')
    expect(knexStub.mock.calls[1]).toEqual(['folders'])
  })
  it('should call increment once when conditional update flips a row', async () => {
    conditionalUpdate.where.mockResolvedValue(1)
    await markImageRead(knexFake, '/foo/bar/baz.png')
    expect(incrementer.increment.mock.calls.length).toBe(1)
  })
  it('should increment seenCount by 1 when conditional update flips a row', async () => {
    conditionalUpdate.where.mockResolvedValue(1)
    await markImageRead(knexFake, '/foo/bar/baz.png')
    expect(incrementer.increment.mock.calls[0]).toEqual(['seenCount', 1])
  })
  it('should call getParentFolders once when conditional update flips a row', async () => {
    conditionalUpdate.where.mockResolvedValue(1)
    await markImageRead(knexFake, '/foo/bar/baz.png')
    expect(getParentFoldersStub.mock.calls.length).toBe(1)
  })
  it('should pass the image path to getParentFolders when conditional update flips a row', async () => {
    conditionalUpdate.where.mockResolvedValue(1)
    await markImageRead(knexFake, '/foo/bar/baz.png')
    expect(getParentFoldersStub.mock.calls[0]).toEqual(['/foo/bar/baz.png'])
  })
  it('should call whereIn once when filtering ancestor folders for the increment', async () => {
    conditionalUpdate.where.mockResolvedValue(1)
    await markImageRead(knexFake, '/foo/bar/baz.png')
    expect(incrementer.whereIn.mock.calls.length).toBe(1)
  })
  it('should filter ancestor folders using the result of getParentFolders', async () => {
    conditionalUpdate.where.mockResolvedValue(1)
    await markImageRead(knexFake, '/foo/bar/baz.png')
    expect(incrementer.whereIn.mock.calls[0]).toEqual(['path', ['/foo/bar/', '/foo/', '/']])
  })
})

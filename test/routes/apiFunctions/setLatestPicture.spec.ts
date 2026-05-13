'use sanity'

import { setLatestPicture, Imports } from '#routes/apiFunctions.js'
import { stubToKnex } from '#testutils/typeGuards.js'
import type { MockInstance } from 'vitest'
interface KnexStub {
  select: MockInstance
  increment: MockInstance
  update: MockInstance
  whereIn: MockInstance
  orWhere: MockInstance
  where: MockInstance
  limit: MockInstance
}
const makeKnexInstance = (): KnexStub => {
  // `where` defaults to chainable (returns the instance) but uses callsFake instead of
  // returnsThis() so that per-test overrides like `.mockResolvedValue(N)` can replace it cleanly.
  const inst: KnexStub = {
    select: vi.fn().mockImplementation(function (this: object): unknown {
      return this
    }),
    increment: vi.fn().mockImplementation(function (this: object): unknown {
      return this
    }),
    update: vi.fn().mockImplementation(function (this: object): unknown {
      return this
    }),
    whereIn: vi.fn().mockResolvedValue([]),
    orWhere: vi.fn().mockResolvedValue([]),
    limit: vi.fn().mockResolvedValue([]),
    where: vi.fn(),
  }
  inst.where.mockImplementation(() => inst)
  return inst
}
describe('routes/apiFunctions setLatestPicture', () => {
  let knexStub: MockInstance = vi.fn()
  let knexFake = stubToKnex(knexStub)
  let getParentFoldersStub: MockInstance = vi.fn()
  let loggerStub: MockInstance = vi.fn()
  beforeEach(() => {
    knexStub = vi.fn().mockImplementation(() => stubToKnex(makeKnexInstance()))
    knexFake = stubToKnex(knexStub)
    getParentFoldersStub = vi.spyOn(Imports, 'getParentFolders').mockReturnValue([])
    loggerStub = vi.spyOn(Imports, 'logger').mockImplementation((..._args: unknown[]) => undefined)
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  // ---- Existence-check chain ----

  it('should call knex with the pictures table when checking existence', async () => {
    await setLatestPicture(knexFake, '/foo/bar/image.pdf')
    expect(knexStub.mock.calls[0]).toEqual(['pictures'])
  })
  it('should call select once when checking picture existence', async () => {
    const instance = makeKnexInstance()
    knexStub.mockReturnValueOnce(instance)
    await setLatestPicture(knexFake, '/foo/bar/image.pdf')
    expect(instance.select.mock.calls.length).toBe(1)
  })
  it('should select path column when checking picture existence', async () => {
    const instance = makeKnexInstance()
    knexStub.mockReturnValueOnce(instance)
    await setLatestPicture(knexFake, '/foo/bar/image.pdf')
    expect(instance.select.mock.calls[0]).toEqual(['path'])
  })
  it('should call where once when filtering existence-check by path', async () => {
    const instance = makeKnexInstance()
    knexStub.mockReturnValueOnce(instance)
    await setLatestPicture(knexFake, '/foo/bar/image.pdf')
    expect(instance.where.mock.calls.length).toBe(1)
  })
  it('should filter existence-check by provided path', async () => {
    const instance = makeKnexInstance()
    knexStub.mockReturnValueOnce(instance)
    await setLatestPicture(knexFake, '/foo/bar/image.pdf')
    expect(instance.where.mock.calls[0]).toEqual([{ path: '/foo/bar/image.pdf' }])
  })
  it('should call limit when checking picture existence', async () => {
    const instance = makeKnexInstance()
    knexStub.mockReturnValueOnce(instance)
    await setLatestPicture(knexFake, '/foo/bar/image.pdf')
    expect(instance.limit.mock.calls.length).toBe(1)
  })
  it('should limit existence check to a single record', async () => {
    const instance = makeKnexInstance()
    knexStub.mockReturnValueOnce(instance)
    await setLatestPicture(knexFake, '/foo/bar/image.pdf')
    expect(instance.limit.mock.calls[0]).toEqual([1])
  })

  // ---- Picture not found ----

  it('should resolve to null when path is not found', async () => {
    const result = await setLatestPicture(knexFake, '/foo/bar/image.pdf')
    expect(result).toBe(null)
  })
  it('should make no additional knex calls when picture not found', async () => {
    await setLatestPicture(knexFake, '/foo/bar/image.pdf')
    expect(knexStub.mock.calls.length).toBe(1)
  })
  it('should log when picture is not found', async () => {
    await setLatestPicture(knexFake, '/foo/bar/image.pdf')
    const matched = loggerStub.mock.calls.some((c) => String(c[0]).includes('setLatestPicture: picture not found'))
    expect(matched).toBe(true)
  })

  // ---- Conditional UPDATE on pictures (atomic flip) ----

  const setupExistingPicture = (): KnexStub => {
    const searcher = makeKnexInstance()
    searcher.limit.mockResolvedValue([{ path: '/foo/bar/image.pdf' }])
    knexStub.mockReturnValueOnce(searcher)
    return searcher
  }

  it('should call knex with the pictures table for the conditional UPDATE', async () => {
    setupExistingPicture()
    await setLatestPicture(knexFake, '/foo/bar/image.pdf')
    expect(knexStub.mock.calls[1]).toEqual(['pictures'])
  })
  it('should call update once on the conditional UPDATE', async () => {
    setupExistingPicture()
    const cond = makeKnexInstance()
    knexStub.mockReturnValueOnce(cond)
    await setLatestPicture(knexFake, '/foo/bar/image.pdf')
    expect(cond.update.mock.calls.length).toBe(1)
  })
  it('should set seen=true on the conditional UPDATE', async () => {
    setupExistingPicture()
    const cond = makeKnexInstance()
    knexStub.mockReturnValueOnce(cond)
    await setLatestPicture(knexFake, '/foo/bar/image.pdf')
    expect(cond.update.mock.calls[0]).toEqual([{ seen: true }])
  })
  it('should atomically gate the conditional UPDATE on path AND seen=false', async () => {
    setupExistingPicture()
    const cond = makeKnexInstance()
    knexStub.mockReturnValueOnce(cond)
    await setLatestPicture(knexFake, '/foo/bar/image.pdf')
    expect(cond.where.mock.calls[0]).toEqual([{ path: '/foo/bar/image.pdf', seen: false }])
  })

  // ---- Conditional update flips 0 rows (already seen / lost-the-race) ----

  const setupAlreadySeen = (): KnexStub => {
    setupExistingPicture()
    const cond = makeKnexInstance()
    cond.where.mockResolvedValue(0)
    knexStub.mockReturnValueOnce(cond)
    return cond
  }

  it('should not increment seenCount when conditional update flips zero rows', async () => {
    setupAlreadySeen()
    const folderInst = makeKnexInstance()
    knexStub.mockReturnValueOnce(folderInst)
    await setLatestPicture(knexFake, '/foo/bar/image.pdf')
    expect(folderInst.increment.mock.calls.length).toBe(0)
  })
  it('should call knex three times when conditional update flips zero rows', async () => {
    setupAlreadySeen()
    await setLatestPicture(knexFake, '/foo/bar/image.pdf')
    expect(knexStub.mock.calls.length).toBe(3)
  })
  it('should query folders to update current cover when conditional update flips zero rows', async () => {
    setupAlreadySeen()
    await setLatestPicture(knexFake, '/foo/bar/image.pdf')
    expect(knexStub.mock.calls[2]).toEqual(['folders'])
  })

  // ---- Conditional update flips 1 row (caller is the flipper) ----

  const setupSuccessfulFlip = (): KnexStub => {
    setupExistingPicture()
    const cond = makeKnexInstance()
    cond.where.mockResolvedValue(1)
    knexStub.mockReturnValueOnce(cond)
    return cond
  }

  it('should call knex four times when conditional update flips a row', async () => {
    setupSuccessfulFlip()
    await setLatestPicture(knexFake, '/foo/bar/image.pdf')
    expect(knexStub.mock.calls.length).toBe(4)
  })
  it('should query folders to increment seen count when conditional update flips a row', async () => {
    setupSuccessfulFlip()
    await setLatestPicture(knexFake, '/foo/bar/image.pdf')
    expect(knexStub.mock.calls[2]).toEqual(['folders'])
  })
  it('should call increment once when conditional update flips a row', async () => {
    setupSuccessfulFlip()
    const incrementer = makeKnexInstance()
    knexStub.mockReturnValueOnce(incrementer)
    await setLatestPicture(knexFake, '/foo/bar/image.pdf')
    expect(incrementer.increment.mock.calls.length).toBe(1)
  })
  it('should increment seenCount by 1 when conditional update flips a row', async () => {
    setupSuccessfulFlip()
    const incrementer = makeKnexInstance()
    knexStub.mockReturnValueOnce(incrementer)
    await setLatestPicture(knexFake, '/foo/bar/image.pdf')
    expect(incrementer.increment.mock.calls[0]).toEqual(['seenCount', 1])
  })
  it('should call getParentFolders once when conditional update flips a row', async () => {
    setupSuccessfulFlip()
    await setLatestPicture(knexFake, '/foo/bar/image.pdf')
    expect(getParentFoldersStub.mock.calls.length).toBe(1)
  })
  it('should pass the picture path to getParentFolders when conditional update flips a row', async () => {
    setupSuccessfulFlip()
    await setLatestPicture(knexFake, '/foo/bar/image.pdf')
    expect(getParentFoldersStub.mock.calls[0]).toEqual(['/foo/bar/image.pdf'])
  })
  it('should call whereIn once when filtering ancestor folders for increment', async () => {
    setupSuccessfulFlip()
    const incrementer = makeKnexInstance()
    knexStub.mockReturnValueOnce(incrementer)
    getParentFoldersStub.mockReturnValue('FOOBAR')
    await setLatestPicture(knexFake, '/foo/bar/image.pdf')
    expect(incrementer.whereIn.mock.calls.length).toBe(1)
  })
  it('should filter ancestor folders by path when incrementing seenCount', async () => {
    setupSuccessfulFlip()
    const incrementer = makeKnexInstance()
    knexStub.mockReturnValueOnce(incrementer)
    getParentFoldersStub.mockReturnValue('FOOBAR')
    await setLatestPicture(knexFake, '/foo/bar/image.pdf')
    expect(incrementer.whereIn.mock.calls[0]).toEqual(['path', 'FOOBAR'])
  })

  // ---- Final UPDATE folders.current (runs in both flip and no-flip paths) ----

  it('should query folders to update current cover after flipping', async () => {
    setupSuccessfulFlip()
    await setLatestPicture(knexFake, '/foo/bar/image.pdf')
    expect(knexStub.mock.calls[3]).toEqual(['folders'])
  })
  // setupSuccessfulFlip queues calls 0 and 1. Production also makes a call 2 (folders
  // increment) before reaching call 3 (folders.current update). Pad with a default
  // knex instance so the test's updater lands on call 3 like sinon's onCall(3) did.
  it('should call update once on folders.current after flipping', async () => {
    setupSuccessfulFlip()
    const updater = makeKnexInstance()
    knexStub.mockReturnValueOnce(stubToKnex(makeKnexInstance())).mockReturnValueOnce(updater)
    await setLatestPicture(knexFake, '/foo/bar/image.pdf')
    expect(updater.update.mock.calls.length).toBe(1)
  })
  it('should set folders.current to the picture path after flipping', async () => {
    setupSuccessfulFlip()
    const updater = makeKnexInstance()
    knexStub.mockReturnValueOnce(stubToKnex(makeKnexInstance())).mockReturnValueOnce(updater)
    await setLatestPicture(knexFake, '/foo/bar/image.pdf')
    expect(updater.update.mock.calls[0]).toEqual([{ current: '/foo/bar/image.pdf' }])
  })
  it('should filter folders.current update by parent folder path', async () => {
    setupSuccessfulFlip()
    const updater = makeKnexInstance()
    knexStub.mockReturnValueOnce(stubToKnex(makeKnexInstance())).mockReturnValueOnce(updater)
    await setLatestPicture(knexFake, '/foo/bar/image.pdf')
    expect(updater.where.mock.calls[0]).toEqual([{ path: '/foo/bar/' }])
  })
  it('should set folders.current even when conditional update flips zero rows', async () => {
    setupAlreadySeen()
    const updater = makeKnexInstance()
    knexStub.mockReturnValueOnce(updater)
    await setLatestPicture(knexFake, '/foo/bar/image.pdf')
    expect(updater.update.mock.calls[0]).toEqual([{ current: '/foo/bar/image.pdf' }])
  })
})

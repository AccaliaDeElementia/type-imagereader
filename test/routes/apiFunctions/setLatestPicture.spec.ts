'use sanity'

import { setLatestPicture, Imports, Internals } from '#routes/apiFunctions.js'
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
  let claimUnseenPictureStub: MockInstance = vi.fn()
  let loggerStub: MockInstance = vi.fn()
  beforeEach(() => {
    knexStub = vi.fn().mockImplementation(() => stubToKnex(makeKnexInstance()))
    knexFake = stubToKnex(knexStub)
    claimUnseenPictureStub = vi.spyOn(Internals, 'claimUnseenPicture').mockResolvedValue(undefined)
    loggerStub = vi.spyOn(Imports, 'logger').mockImplementation((..._args: unknown[]) => undefined)
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

  // ---- Claiming the picture (delegated; behaviour covered by claimUnseenPicture.spec) ----

  const setupExistingPicture = (): KnexStub => {
    const searcher = makeKnexInstance()
    searcher.limit.mockResolvedValue([{ path: '/foo/bar/image.pdf' }])
    knexStub.mockReturnValueOnce(searcher)
    return searcher
  }

  it('should claim the picture once when it exists', async () => {
    setupExistingPicture()
    await setLatestPicture(knexFake, '/foo/bar/image.pdf')
    expect(claimUnseenPictureStub.mock.calls.length).toBe(1)
  })
  it('should claim the picture with the provided knex and path', async () => {
    setupExistingPicture()
    await setLatestPicture(knexFake, '/foo/bar/image.pdf')
    expect(claimUnseenPictureStub.mock.calls[0]).toEqual([knexFake, '/foo/bar/image.pdf'])
  })
  it('should not claim the picture when it is not found', async () => {
    await setLatestPicture(knexFake, '/foo/bar/image.pdf')
    expect(claimUnseenPictureStub.mock.calls.length).toBe(0)
  })

  // ---- Final UPDATE folders.current ----

  const setupUpdater = (): KnexStub => {
    setupExistingPicture()
    const updater = makeKnexInstance()
    knexStub.mockReturnValueOnce(updater)
    return updater
  }

  it('should query folders to update current cover', async () => {
    setupExistingPicture()
    await setLatestPicture(knexFake, '/foo/bar/image.pdf')
    expect(knexStub.mock.calls[1]).toEqual(['folders'])
  })
  it('should call update once on folders.current', async () => {
    const updater = setupUpdater()
    await setLatestPicture(knexFake, '/foo/bar/image.pdf')
    expect(updater.update.mock.calls.length).toBe(1)
  })
  it('should set folders.current to the picture path', async () => {
    const updater = setupUpdater()
    await setLatestPicture(knexFake, '/foo/bar/image.pdf')
    expect(updater.update.mock.calls[0]).toEqual([{ current: '/foo/bar/image.pdf' }])
  })
  it('should filter folders.current update by parent folder path', async () => {
    const updater = setupUpdater()
    await setLatestPicture(knexFake, '/foo/bar/image.pdf')
    expect(updater.where.mock.calls[0]).toEqual([{ path: '/foo/bar/' }])
  })
})

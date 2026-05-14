'use sanity'

import { syncMissingCoverImages } from '#sync/folders.js'
import { cast, stubToKnex } from '#testutils/typeGuards.js'
import { createLoggerFake } from '#testutils/debug.js'

describe('sync/folders syncMissingCoverImages()', () => {
  let { stub: loggerStub, fake: loggerFake } = createLoggerFake()
  let knexInnerInstanceStub = {
    select: vi.fn().mockImplementation(function (this: object): unknown {
      return this
    }),
    from: vi.fn().mockImplementation(function (this: object): unknown {
      return this
    }),
    whereRaw: vi.fn().mockImplementation(function (this: object): unknown {
      return this
    }),
    catch: vi.fn(),
  }
  let knexInstanceStub = {
    whereNotExists: vi.fn().mockImplementation(function (this: object): unknown {
      return this
    }),
    whereRaw: vi.fn().mockImplementation(function (this: object): unknown {
      return this
    }),
    update: vi.fn().mockResolvedValue(0),
    catch: vi.fn(),
  }
  let knexFnStub = vi.fn().mockReturnValue(knexInstanceStub)
  let knexFnFake = stubToKnex(knexFnStub)
  beforeEach(() => {
    ;({ stub: loggerStub, fake: loggerFake } = createLoggerFake())
    knexInnerInstanceStub = {
      select: vi.fn().mockImplementation(function (this: object): unknown {
        return this
      }),
      from: vi.fn().mockImplementation(function (this: object): unknown {
        return this
      }),
      whereRaw: vi.fn().mockImplementation(function (this: object): unknown {
        return this
      }),
      catch: vi.fn(),
    }
    knexInstanceStub = {
      whereNotExists: vi.fn().mockImplementation(function (this: object): unknown {
        return this
      }),
      whereRaw: vi.fn().mockImplementation(function (this: object): unknown {
        return this
      }),
      update: vi.fn().mockResolvedValue(0),
      catch: vi.fn(),
    }
    knexFnStub = vi.fn().mockReturnValue(knexInstanceStub)
    knexFnFake = stubToKnex(knexFnStub)
  })
  it("should call knex with 'folders' table", async () => {
    await syncMissingCoverImages(loggerFake, knexFnFake)
    expect(knexFnStub.mock.calls[0]).toEqual(['folders'])
  })
  it('should call knex once', async () => {
    await syncMissingCoverImages(loggerFake, knexFnFake)
    expect(knexFnStub.mock.calls.length).toBe(1)
  })
  it('should call update once', async () => {
    await syncMissingCoverImages(loggerFake, knexFnFake)
    expect(knexInstanceStub.update.mock.calls.length).toBe(1)
  })
  it('should call update clearing current image', async () => {
    await syncMissingCoverImages(loggerFake, knexFnFake)
    expect(knexInstanceStub.update.mock.calls[0]).toEqual([{ current: '' }])
  })
  it('should call whereNotExists once in outer query', async () => {
    await syncMissingCoverImages(loggerFake, knexFnFake)
    expect(knexInstanceStub.whereNotExists.mock.calls.length).toBe(1)
  })
  it('should call select once in inner query', async () => {
    await syncMissingCoverImages(loggerFake, knexFnFake)
    const fn = cast<(this: unknown) => void>(knexInstanceStub.whereNotExists.mock.calls[0]?.[0])
    fn.apply(knexInnerInstanceStub)
    expect(knexInnerInstanceStub.select.mock.calls.length).toBe(1)
  })
  it("should call select with '*' in inner query", async () => {
    await syncMissingCoverImages(loggerFake, knexFnFake)
    const fn = cast<(this: unknown) => void>(knexInstanceStub.whereNotExists.mock.calls[0]?.[0])
    fn.apply(knexInnerInstanceStub)
    expect(knexInnerInstanceStub.select.mock.calls[0]).toEqual(['*'])
  })
  it('should call from once in inner query', async () => {
    await syncMissingCoverImages(loggerFake, knexFnFake)
    const fn = cast<(this: unknown) => void>(knexInstanceStub.whereNotExists.mock.calls[0]?.[0])
    fn.apply(knexInnerInstanceStub)
    expect(knexInnerInstanceStub.from.mock.calls.length).toBe(1)
  })
  it("should call from with 'pictures' in inner query", async () => {
    await syncMissingCoverImages(loggerFake, knexFnFake)
    const fn = cast<(this: unknown) => void>(knexInstanceStub.whereNotExists.mock.calls[0]?.[0])
    fn.apply(knexInnerInstanceStub)
    expect(knexInnerInstanceStub.from.mock.calls[0]).toEqual(['pictures'])
  })
  it('should call whereRaw once in inner query', async () => {
    await syncMissingCoverImages(loggerFake, knexFnFake)
    const fn = cast<(this: unknown) => void>(knexInstanceStub.whereNotExists.mock.calls[0]?.[0])
    fn.apply(knexInnerInstanceStub)
    expect(knexInnerInstanceStub.whereRaw.mock.calls.length).toBe(1)
  })
  it('should call whereRaw with correct condition in inner query', async () => {
    await syncMissingCoverImages(loggerFake, knexFnFake)
    const fn = cast<(this: unknown) => void>(knexInstanceStub.whereNotExists.mock.calls[0]?.[0])
    fn.apply(knexInnerInstanceStub)
    expect(knexInnerInstanceStub.whereRaw.mock.calls[0]).toEqual(['pictures.path = folders.current'])
  })
  it('should call outer whereRaw once', async () => {
    await syncMissingCoverImages(loggerFake, knexFnFake)
    expect(knexInstanceStub.whereRaw.mock.calls.length).toBe(1)
  })
  it('should call outer whereRaw to filter folders with a cover image set', async () => {
    await syncMissingCoverImages(loggerFake, knexFnFake)
    expect(knexInstanceStub.whereRaw.mock.calls[0]).toEqual(["folders.current <> ''"])
  })
  it('should log once when cover images are removed', async () => {
    knexInstanceStub.update.mockResolvedValue(99)
    await syncMissingCoverImages(loggerFake, knexFnFake)
    expect(loggerStub.mock.calls.length).toBe(1)
  })
  it('should log removed count when cover images are removed', async () => {
    knexInstanceStub.update.mockResolvedValue(99)
    await syncMissingCoverImages(loggerFake, knexFnFake)
    expect(loggerStub.mock.calls[0]).toEqual(['Removed 99 missing cover images'])
  })
  it('should log once when no cover images are removed', async () => {
    knexInstanceStub.update.mockResolvedValue(0)
    await syncMissingCoverImages(loggerFake, knexFnFake)
    expect(loggerStub.mock.calls.length).toBe(1)
  })
  it('should log zero count when no cover images are removed', async () => {
    knexInstanceStub.update.mockResolvedValue(0)
    await syncMissingCoverImages(loggerFake, knexFnFake)
    expect(loggerStub.mock.calls[0]).toEqual(['Removed 0 missing cover images'])
  })
})

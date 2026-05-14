'use sanity'

import { syncRemovedFolders } from '#sync/folders.js'
import { cast, stubToKnex } from '#testutils/typeGuards.js'
import { createLoggerFake } from '#testutils/debug.js'

describe('sync/folders syncRemovedFolders()', () => {
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
    delete: vi.fn().mockResolvedValue(0),
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
      delete: vi.fn().mockResolvedValue(0),
      catch: vi.fn(),
    }
    knexFnStub = vi.fn().mockReturnValue(knexInstanceStub)
    knexFnFake = stubToKnex(knexFnStub)
  })
  it("should call knex with 'folders' table", async () => {
    await syncRemovedFolders(loggerFake, knexFnFake)
    expect(knexFnStub).toHaveBeenCalledWith('folders')
  })
  it('should call knex once', async () => {
    await syncRemovedFolders(loggerFake, knexFnFake)
    expect(knexFnStub.mock.calls.length).toBe(1)
  })
  it('should call knex before whereNotExists', async () => {
    await syncRemovedFolders(loggerFake, knexFnFake)
    expect(
      (knexInstanceStub.whereNotExists.mock.invocationCallOrder.at(-1) ?? 0) -
        (knexFnStub.mock.invocationCallOrder.at(-1) ?? 0),
    ).toBe(1)
  })
  it('should call delete once', async () => {
    await syncRemovedFolders(loggerFake, knexFnFake)
    expect(knexInstanceStub.delete.mock.calls.length).toBe(1)
  })
  it('should call delete with no arguments', async () => {
    await syncRemovedFolders(loggerFake, knexFnFake)
    expect(knexInstanceStub.delete.mock.calls[0]).toEqual([])
  })
  it('should log once when records are removed', async () => {
    knexInstanceStub.delete.mockResolvedValue(1023)
    await syncRemovedFolders(loggerFake, knexFnFake)
    expect(loggerStub.mock.calls.length).toBe(1)
  })
  it('should log removed count when records are removed', async () => {
    knexInstanceStub.delete.mockResolvedValue(1023)
    await syncRemovedFolders(loggerFake, knexFnFake)
    expect(loggerStub.mock.calls[0]).toEqual(['Removed 1023 missing folders'])
  })
  it('should log once when no folders are removed', async () => {
    knexInstanceStub.delete.mockResolvedValue(0)
    await syncRemovedFolders(loggerFake, knexFnFake)
    expect(loggerStub.mock.calls.length).toBe(1)
  })
  it('should log zero count when no folders are removed', async () => {
    knexInstanceStub.delete.mockResolvedValue(0)
    await syncRemovedFolders(loggerFake, knexFnFake)
    expect(loggerStub.mock.calls[0]).toEqual(['Removed 0 missing folders'])
  })
  it('should call select once in inner query', async () => {
    await syncRemovedFolders(loggerFake, knexFnFake)
    const fn = cast<(this: unknown) => void>(knexInstanceStub.whereNotExists.mock.calls[0]?.[0])
    fn.apply(knexInnerInstanceStub)
    expect(knexInnerInstanceStub.select.mock.calls.length).toBe(1)
  })
  it("should call select with '*' in inner query", async () => {
    await syncRemovedFolders(loggerFake, knexFnFake)
    const fn = cast<(this: unknown) => void>(knexInstanceStub.whereNotExists.mock.calls[0]?.[0])
    fn.apply(knexInnerInstanceStub)
    expect(knexInnerInstanceStub.select.mock.calls[0]).toEqual(['*'])
  })
  it('should call select before from in inner query', async () => {
    await syncRemovedFolders(loggerFake, knexFnFake)
    const fn = cast<(this: unknown) => void>(knexInstanceStub.whereNotExists.mock.calls[0]?.[0])
    fn.apply(knexInnerInstanceStub)
    expect(
      (knexInnerInstanceStub.from.mock.invocationCallOrder.at(-1) ?? 0) -
        (knexInnerInstanceStub.select.mock.invocationCallOrder.at(-1) ?? 0),
    ).toBe(1)
  })
  it('should call from once in inner query', async () => {
    await syncRemovedFolders(loggerFake, knexFnFake)
    const fn = cast<(this: unknown) => void>(knexInstanceStub.whereNotExists.mock.calls[0]?.[0])
    fn.apply(knexInnerInstanceStub)
    expect(knexInnerInstanceStub.from.mock.calls.length).toBe(1)
  })
  it("should call from with 'syncitems' in inner query", async () => {
    await syncRemovedFolders(loggerFake, knexFnFake)
    const fn = cast<(this: unknown) => void>(knexInstanceStub.whereNotExists.mock.calls[0]?.[0])
    fn.apply(knexInnerInstanceStub)
    expect(knexInnerInstanceStub.from.mock.calls[0]).toEqual(['syncitems'])
  })
  it('should call from before whereRaw in inner query', async () => {
    await syncRemovedFolders(loggerFake, knexFnFake)
    const fn = cast<(this: unknown) => void>(knexInstanceStub.whereNotExists.mock.calls[0]?.[0])
    fn.apply(knexInnerInstanceStub)
    expect(
      (knexInnerInstanceStub.whereRaw.mock.invocationCallOrder.at(-1) ?? 0) -
        (knexInnerInstanceStub.from.mock.invocationCallOrder.at(-1) ?? 0),
    ).toBe(1)
  })
  it('should call whereRaw once in inner query', async () => {
    await syncRemovedFolders(loggerFake, knexFnFake)
    const fn = cast<(this: unknown) => void>(knexInstanceStub.whereNotExists.mock.calls[0]?.[0])
    fn.apply(knexInnerInstanceStub)
    expect(knexInnerInstanceStub.whereRaw.mock.calls.length).toBe(1)
  })
  it('should call whereRaw with correct condition in inner query', async () => {
    await syncRemovedFolders(loggerFake, knexFnFake)
    const fn = cast<(this: unknown) => void>(knexInstanceStub.whereNotExists.mock.calls[0]?.[0])
    fn.apply(knexInnerInstanceStub)
    expect(knexInnerInstanceStub.whereRaw.mock.calls[0]).toEqual(['syncitems.path = folders.path'])
  })
})

'use sanity'

import { syncNewPictures } from '#sync/pictures.js'
import { cast, stubToKnex } from '#testutils/typeGuards.js'
import { createLoggerFake } from '#testutils/debug.js'

describe('sync/pictures syncNewPictures()', () => {
  let { stub: loggerStub, fake: loggerFake } = createLoggerFake()
  let knexInnerInstanceStub = {
    select: vi.fn().mockImplementation(function (this: object): unknown {
      return this
    }),
    from: vi.fn().mockImplementation(function (this: object): unknown {
      return this
    }),
    leftJoin: vi.fn().mockImplementation(function (this: object): unknown {
      return this
    }),
    andWhere: vi.fn().mockImplementation(function (this: object): unknown {
      return this
    }),
    catch: vi.fn(),
  }
  let knexInstanceStub = {
    raw: vi.fn(),
    from: vi.fn().mockImplementation(function (this: object): unknown {
      return this
    }),
    insert: vi.fn().mockResolvedValue([0]),
    catch: vi.fn(),
  }
  let knexFnFake = stubToKnex(knexInstanceStub)
  beforeEach(() => {
    ;({ stub: loggerStub, fake: loggerFake } = createLoggerFake())
    knexInnerInstanceStub = {
      select: vi.fn().mockImplementation(function (this: object): unknown {
        return this
      }),
      from: vi.fn().mockImplementation(function (this: object): unknown {
        return this
      }),
      leftJoin: vi.fn().mockImplementation(function (this: object): unknown {
        return this
      }),
      andWhere: vi.fn().mockImplementation(function (this: object): unknown {
        return this
      }),
      catch: vi.fn(),
    }
    knexInstanceStub = {
      raw: vi.fn(),
      from: vi.fn().mockImplementation(function (this: object): unknown {
        return this
      }),
      insert: vi.fn().mockResolvedValue([0]),
      catch: vi.fn(),
    }
    knexFnFake = stubToKnex(knexInstanceStub)
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })
  it('should call raw once for pictures table', async () => {
    await syncNewPictures(loggerFake, knexFnFake)
    expect(knexInstanceStub.raw.mock.calls.length).toBe(1)
  })
  it('should call raw with expected template for pictures table', async () => {
    await syncNewPictures(loggerFake, knexFnFake)
    expect(knexInstanceStub.raw.mock.calls[0]?.[0]).toBe('?? (??, ??, ??, ??)')
  })
  it('should call raw with expected column names for pictures table', async () => {
    await syncNewPictures(loggerFake, knexFnFake)
    expect(knexInstanceStub.raw.mock.calls[0]?.[1]).toEqual(['pictures', 'folder', 'path', 'sortKey', 'pathHash'])
  })
  it('should call from after raw for pictures table', async () => {
    const rawQuery = { a: 'flapjacks for breakfast' }
    knexInstanceStub.raw.mockReturnValue(rawQuery)
    await syncNewPictures(loggerFake, knexFnFake)
    expect(
      (knexInstanceStub.from.mock.invocationCallOrder.at(-1) ?? -1) >
        (knexInstanceStub.raw.mock.invocationCallOrder.at(-1) ?? -1),
    ).toBe(true)
  })
  it('should call from with raw result for pictures table', async () => {
    const rawQuery = { a: 'flapjacks for breakfast' }
    knexInstanceStub.raw.mockReturnValue(rawQuery)
    await syncNewPictures(loggerFake, knexFnFake)
    expect(knexInstanceStub.from).toHaveBeenCalledWith(rawQuery)
  })
  it('should log once with sqlite return style', async () => {
    knexInstanceStub.insert.mockResolvedValue([65536])
    await syncNewPictures(loggerFake, knexFnFake)
    expect(loggerStub.mock.calls.length).toBe(1)
  })
  it('should log results with sqlite return style', async () => {
    knexInstanceStub.insert.mockResolvedValue([65536])
    await syncNewPictures(loggerFake, knexFnFake)
    expect(loggerStub.mock.calls[0]?.[0]).toBe('Added 65536 new pictures')
  })
  it('should log once with postgresql return style', async () => {
    knexInstanceStub.insert.mockResolvedValue({ rowCount: 256 })
    await syncNewPictures(loggerFake, knexFnFake)
    expect(loggerStub.mock.calls.length).toBe(1)
  })
  it('should log results with postgresql return style', async () => {
    knexInstanceStub.insert.mockResolvedValue({ rowCount: 256 })
    await syncNewPictures(loggerFake, knexFnFake)
    expect(loggerStub.mock.calls[0]?.[0]).toBe('Added 256 new pictures')
  })
  it('should log 0 new pictures with empty array return style', async () => {
    knexInstanceStub.insert.mockResolvedValue([])
    await syncNewPictures(loggerFake, knexFnFake)
    expect(loggerStub.mock.calls[0]?.[0]).toBe('Added 0 new pictures')
  })
  it('should log 0 new pictures with undefined return style', async () => {
    knexInstanceStub.insert.mockResolvedValue(undefined)
    await syncNewPictures(loggerFake, knexFnFake)
    expect(loggerStub.mock.calls[0]?.[0]).toBe('Added 0 new pictures')
  })
  it('should call select once within insert subquery', async () => {
    await syncNewPictures(loggerFake, knexFnFake)
    const fn = cast<(this: unknown) => void>(knexInstanceStub.insert.mock.calls[0]?.[0])
    fn.apply(knexInnerInstanceStub)
    expect(knexInnerInstanceStub.select.mock.calls.length).toBe(1)
  })
  it('should call select with expected columns within insert subquery', async () => {
    await syncNewPictures(loggerFake, knexFnFake)
    const fn = cast<(this: unknown) => void>(knexInstanceStub.insert.mock.calls[0]?.[0])
    fn.apply(knexInnerInstanceStub)
    expect(knexInnerInstanceStub.select.mock.calls[0]?.[0]).toEqual([
      'syncitems.folder',
      'syncitems.path',
      'syncitems.sortKey',
      'syncitems.pathHash',
    ])
  })
  it('should call select before from within insert subquery', async () => {
    await syncNewPictures(loggerFake, knexFnFake)
    const fn = cast<(this: unknown) => void>(knexInstanceStub.insert.mock.calls[0]?.[0])
    fn.apply(knexInnerInstanceStub)
    expect(
      (knexInnerInstanceStub.select.mock.invocationCallOrder.at(-1) ?? -1) <
        (knexInnerInstanceStub.from.mock.invocationCallOrder.at(-1) ?? -1),
    ).toBe(true)
  })
  it('should call from with syncitems within insert subquery', async () => {
    await syncNewPictures(loggerFake, knexFnFake)
    const fn = cast<(this: unknown) => void>(knexInstanceStub.insert.mock.calls[0]?.[0])
    fn.apply(knexInnerInstanceStub)
    expect(knexInnerInstanceStub.from).toHaveBeenCalledWith('syncitems')
  })
  it('should call leftJoin with expected args within insert subquery', async () => {
    await syncNewPictures(loggerFake, knexFnFake)
    const fn = cast<(this: unknown) => void>(knexInstanceStub.insert.mock.calls[0]?.[0])
    fn.apply(knexInnerInstanceStub)
    expect(knexInnerInstanceStub.leftJoin.mock.calls[0]).toEqual(['pictures', 'pictures.path', 'syncitems.path'])
  })
  it('should call andWhere with expected conditions within insert subquery', async () => {
    await syncNewPictures(loggerFake, knexFnFake)
    const fn = cast<(this: unknown) => void>(knexInstanceStub.insert.mock.calls[0]?.[0])
    fn.apply(knexInnerInstanceStub)
    expect(knexInnerInstanceStub.andWhere.mock.calls[0]?.[0]).toEqual({
      'syncitems.isFile': true,
      'pictures.path': null,
    })
  })
})

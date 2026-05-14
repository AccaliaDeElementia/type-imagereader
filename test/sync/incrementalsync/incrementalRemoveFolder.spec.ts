'use sanity'

import { incrementalRemoveFolder } from '#sync/incrementalsync.js'
import { stubToKnex } from '#testutils/typeGuards.js'
import { createLoggerFake } from '#testutils/debug.js'
import type { MockInstance } from 'vitest'

describe('sync/incrementalsync incrementalRemoveFolder()', () => {
  let { stub: loggerStub, fake: loggerFake } = createLoggerFake()
  let picturesStub = {
    where: vi.fn().mockImplementation(function (this: object): unknown {
      return this
    }),
    delete: vi.fn().mockResolvedValue(0),
  }
  let bookmarksStub = {
    whereNotExists: vi.fn().mockImplementation(function (this: object): unknown {
      return this
    }),
    delete: vi.fn().mockResolvedValue(0),
  }
  let bookmarksInnerStub = {
    select: vi.fn().mockImplementation(function (this: object): unknown {
      return this
    }),
    from: vi.fn().mockImplementation(function (this: object): unknown {
      return this
    }),
    whereRaw: vi.fn().mockImplementation(function (this: object): unknown {
      return this
    }),
  }
  let foldersStub = {
    where: vi.fn().mockImplementation(function (this: object): unknown {
      return this
    }),
    delete: vi.fn().mockResolvedValue(0),
  }
  let knexFnStub: MockInstance = vi.fn()
  let knexFnFake = stubToKnex(knexFnStub)

  beforeEach(() => {
    ;({ stub: loggerStub, fake: loggerFake } = createLoggerFake())
    picturesStub = {
      where: vi.fn().mockImplementation(function (this: object): unknown {
        return this
      }),
      delete: vi.fn().mockResolvedValue(5),
    }
    bookmarksInnerStub = {
      select: vi.fn().mockImplementation(function (this: object): unknown {
        return this
      }),
      from: vi.fn().mockImplementation(function (this: object): unknown {
        return this
      }),
      whereRaw: vi.fn().mockImplementation(function (this: object): unknown {
        return this
      }),
    }
    bookmarksStub = {
      whereNotExists: vi.fn().mockImplementation((fn: (this: unknown) => void) => {
        fn.apply(bookmarksInnerStub)
        return bookmarksStub
      }),
      delete: vi.fn().mockResolvedValue(2),
    }
    foldersStub = {
      where: vi.fn().mockImplementation(function (this: object): unknown {
        return this
      }),
      delete: vi.fn().mockResolvedValue(3),
    }
    knexFnStub = vi.fn().mockImplementation((table: unknown) => {
      if (table === 'pictures') return picturesStub
      if (table === 'bookmarks') return bookmarksStub
      if (table === 'folders') return foldersStub
      return undefined
    })
    knexFnFake = stubToKnex(knexFnStub)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should query pictures by folder prefix', async () => {
    await incrementalRemoveFolder(loggerFake, knexFnFake, '/comics/series/')
    expect(picturesStub.where).toHaveBeenCalledWith('folder', 'like', '/comics/series/%')
  })

  it('should call delete on pictures', async () => {
    await incrementalRemoveFolder(loggerFake, knexFnFake, '/comics/series/')
    expect(picturesStub.delete.mock.calls.length).toBe(1)
  })

  it('should call whereNotExists for orphaned bookmarks', async () => {
    await incrementalRemoveFolder(loggerFake, knexFnFake, '/comics/series/')
    expect(bookmarksStub.whereNotExists.mock.calls.length).toBe(1)
  })

  it('should call delete on bookmarks', async () => {
    await incrementalRemoveFolder(loggerFake, knexFnFake, '/comics/series/')
    expect(bookmarksStub.delete.mock.calls.length).toBe(1)
  })

  it('should select all columns in bookmarks subquery', async () => {
    await incrementalRemoveFolder(loggerFake, knexFnFake, '/comics/series/')
    expect(bookmarksInnerStub.select).toHaveBeenCalledWith('*')
  })

  it('should query from pictures in bookmarks subquery', async () => {
    await incrementalRemoveFolder(loggerFake, knexFnFake, '/comics/series/')
    expect(bookmarksInnerStub.from).toHaveBeenCalledWith('pictures')
  })

  it('should join on path in bookmarks subquery', async () => {
    await incrementalRemoveFolder(loggerFake, knexFnFake, '/comics/series/')
    expect(bookmarksInnerStub.whereRaw).toHaveBeenCalledWith('pictures.path = bookmarks.path')
  })

  it('should query folders by path prefix', async () => {
    await incrementalRemoveFolder(loggerFake, knexFnFake, '/comics/series/')
    expect(foldersStub.where).toHaveBeenCalledWith('path', 'like', '/comics/series/%')
  })

  it('should call delete on folders', async () => {
    await incrementalRemoveFolder(loggerFake, knexFnFake, '/comics/series/')
    expect(foldersStub.delete.mock.calls.length).toBe(1)
  })

  it('should log summary with picture and folder counts', async () => {
    await incrementalRemoveFolder(loggerFake, knexFnFake, '/comics/series/')
    expect(loggerStub).toHaveBeenCalledWith('Incremental remove folder: /comics/series/ (5 pictures, 3 folders)')
  })

  it('should escape underscore wildcards when querying pictures', async () => {
    await incrementalRemoveFolder(loggerFake, knexFnFake, '/foo_bar/')
    expect(picturesStub.where).toHaveBeenCalledWith('folder', 'like', '/foo\\_bar/%')
  })

  it('should escape percent wildcards when querying pictures', async () => {
    await incrementalRemoveFolder(loggerFake, knexFnFake, '/foo%bar/')
    expect(picturesStub.where).toHaveBeenCalledWith('folder', 'like', '/foo\\%bar/%')
  })

  it('should escape underscore wildcards when querying folders', async () => {
    await incrementalRemoveFolder(loggerFake, knexFnFake, '/foo_bar/')
    expect(foldersStub.where).toHaveBeenCalledWith('path', 'like', '/foo\\_bar/%')
  })

  it('should escape percent wildcards when querying folders', async () => {
    await incrementalRemoveFolder(loggerFake, knexFnFake, '/foo%bar/')
    expect(foldersStub.where).toHaveBeenCalledWith('path', 'like', '/foo\\%bar/%')
  })
})

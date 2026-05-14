'use sanity'

import { incrementalScanFolder, Internals, Imports } from '#sync/incrementalsync.js'
import { cast, stubToKnex } from '#testutils/typeGuards.js'
import { createLoggerFake } from '#testutils/debug.js'
import type { MockInstance } from 'vitest'

describe('sync/incrementalsync incrementalScanFolder()', () => {
  let { stub: loggerStub, fake: loggerFake } = createLoggerFake()
  let fsWalkerStub: MockInstance = vi.fn()
  let incrementalAddPicturesBulkStub: MockInstance = vi.fn()
  let incrementalEnsureFoldersBulkStub: MockInstance = vi.fn()
  let knexFnStub: MockInstance = vi.fn()
  let knexFnFake = stubToKnex(knexFnStub)

  beforeEach(() => {
    ;({ stub: loggerStub, fake: loggerFake } = createLoggerFake())
    fsWalkerStub = vi.spyOn(Imports, 'fsWalker').mockResolvedValue(undefined)
    incrementalAddPicturesBulkStub = vi.spyOn(Internals, 'incrementalAddPicturesBulk').mockResolvedValue(undefined)
    incrementalEnsureFoldersBulkStub = vi.spyOn(Internals, 'incrementalEnsureFoldersBulk').mockResolvedValue(undefined)
    knexFnStub = vi.fn()
    knexFnFake = stubToKnex(knexFnStub)
  })

  it('should call fsWalker once', async () => {
    await incrementalScanFolder(loggerFake, knexFnFake, '/comics/new/', '/data')
    expect(fsWalkerStub.mock.calls.length).toBe(1)
  })

  it('should pass joined root path to fsWalker', async () => {
    await incrementalScanFolder(loggerFake, knexFnFake, '/comics/new/', '/data')
    expect(fsWalkerStub.mock.calls[0]?.[0]).toBe('/data/comics/new/')
  })

  it('should call incrementalAddPicturesBulk exactly once', async () => {
    fsWalkerStub.mockImplementation(
      async (_root: string, cb: (items: Array<{ path: string; isFile: boolean }>) => Promise<void>) => {
        await cb([
          { path: '/page1.jpg', isFile: true },
          { path: '/page2.png', isFile: true },
        ])
      },
    )
    await incrementalScanFolder(loggerFake, knexFnFake, '/comics/new/', '/data')
    expect(incrementalAddPicturesBulkStub.mock.calls.length).toBe(1)
  })

  it('should pass all collected picture paths in one bulk call', async () => {
    fsWalkerStub.mockImplementation(
      async (_root: string, cb: (items: Array<{ path: string; isFile: boolean }>) => Promise<void>) => {
        await cb([
          { path: '/page1.jpg', isFile: true },
          { path: '/page2.png', isFile: true },
        ])
      },
    )
    await incrementalScanFolder(loggerFake, knexFnFake, '/comics/new/', '/data')
    expect(incrementalAddPicturesBulkStub.mock.calls[0]?.[1]).toEqual([
      '/comics/new/page1.jpg',
      '/comics/new/page2.png',
    ])
  })

  it('should call incrementalEnsureFoldersBulk exactly once', async () => {
    fsWalkerStub.mockImplementation(
      async (_root: string, cb: (items: Array<{ path: string; isFile: boolean }>) => Promise<void>) => {
        await cb([{ path: '/sub', isFile: false }])
      },
    )
    await incrementalScanFolder(loggerFake, knexFnFake, '/comics/new/', '/data')
    expect(incrementalEnsureFoldersBulkStub.mock.calls.length).toBe(1)
  })

  it('should include the root scanned directory in the bulk folder ensure', async () => {
    fsWalkerStub.mockImplementation(
      async (_root: string, cb: (items: Array<{ path: string; isFile: boolean }>) => Promise<void>) => {
        await cb([])
      },
    )
    await incrementalScanFolder(loggerFake, knexFnFake, '/comics/new/', '/data')
    const folderPaths = cast<string[]>(incrementalEnsureFoldersBulkStub.mock.calls[0]?.[1])
    expect(folderPaths).toContain('/comics/new/')
  })

  it('should include each discovered subdirectory in the bulk folder ensure', async () => {
    fsWalkerStub.mockImplementation(
      async (_root: string, cb: (items: Array<{ path: string; isFile: boolean }>) => Promise<void>) => {
        await cb([
          { path: '/sub1', isFile: false },
          { path: '/sub2', isFile: false },
        ])
      },
    )
    await incrementalScanFolder(loggerFake, knexFnFake, '/comics/new/', '/data')
    const folderPaths = cast<string[]>(incrementalEnsureFoldersBulkStub.mock.calls[0]?.[1])
    expect(folderPaths).toEqual(expect.arrayContaining(['/comics/new/sub1/', '/comics/new/sub2/']))
  })

  it('should not include files in the bulk folder ensure', async () => {
    fsWalkerStub.mockImplementation(
      async (_root: string, cb: (items: Array<{ path: string; isFile: boolean }>) => Promise<void>) => {
        await cb([{ path: '/page.jpg', isFile: true }])
      },
    )
    await incrementalScanFolder(loggerFake, knexFnFake, '/comics/new/', '/data')
    const folderPaths = cast<string[]>(incrementalEnsureFoldersBulkStub.mock.calls[0]?.[1])
    expect(folderPaths).not.toContain('/comics/new/page.jpg')
  })

  it('should not pass directory items as picture paths', async () => {
    fsWalkerStub.mockImplementation(
      async (_root: string, cb: (items: Array<{ path: string; isFile: boolean }>) => Promise<void>) => {
        await cb([
          { path: '/sub', isFile: false },
          { path: '/page.jpg', isFile: true },
        ])
      },
    )
    await incrementalScanFolder(loggerFake, knexFnFake, '/comics/new/', '/data')
    const picturePaths = cast<string[]>(incrementalAddPicturesBulkStub.mock.calls[0]?.[1])
    expect(picturePaths).toEqual(['/comics/new/page.jpg'])
  })

  it('should handle empty directory by sending empty paths to bulk add', async () => {
    fsWalkerStub.mockImplementation(
      async (_root: string, cb: (items: Array<{ path: string; isFile: boolean }>) => Promise<void>) => {
        await cb([])
      },
    )
    await incrementalScanFolder(loggerFake, knexFnFake, '/comics/empty/', '/data')
    expect(incrementalAddPicturesBulkStub.mock.calls[0]?.[1]).toEqual([])
  })

  it('should log summary with added count', async () => {
    fsWalkerStub.mockImplementation(
      async (_root: string, cb: (items: Array<{ path: string; isFile: boolean }>) => Promise<void>) => {
        await cb([
          { path: '/page1.jpg', isFile: true },
          { path: '/page2.jpg', isFile: true },
        ])
      },
    )
    await incrementalScanFolder(loggerFake, knexFnFake, '/comics/new/', '/data')
    expect(loggerStub.mock.calls.some((c) => c[0] === 'Incremental scan folder: /comics/new/ (2 pictures added)')).toBe(
      true,
    )
  })
})

'use sanity'

import { incrementalScanFolder, Internals, Imports } from '#sync/incrementalsync.js'
import Sinon from 'sinon'
import { cast, stubToKnex } from '#testutils/typeGuards.js'
import { createLoggerFake } from '#testutils/debug.js'

const sandbox = Sinon.createSandbox()

describe('sync/incrementalsync incrementalScanFolder()', () => {
  let { stub: loggerStub, fake: loggerFake } = createLoggerFake(sandbox)
  let fsWalkerStub = sandbox.stub()
  let incrementalAddPicturesBulkStub = sandbox.stub()
  let incrementalEnsureFoldersBulkStub = sandbox.stub()
  let knexFnStub = sandbox.stub()
  let knexFnFake = stubToKnex(knexFnStub)

  beforeEach(() => {
    ;({ stub: loggerStub, fake: loggerFake } = createLoggerFake(sandbox))
    fsWalkerStub = sandbox.stub(Imports, 'fsWalker').resolves()
    incrementalAddPicturesBulkStub = sandbox.stub(Internals, 'incrementalAddPicturesBulk').resolves()
    incrementalEnsureFoldersBulkStub = sandbox.stub(Internals, 'incrementalEnsureFoldersBulk').resolves()
    knexFnStub = sandbox.stub()
    knexFnFake = stubToKnex(knexFnStub)
  })

  afterEach(() => {
    sandbox.restore()
  })

  it('should call fsWalker once', async () => {
    await incrementalScanFolder(loggerFake, knexFnFake, '/comics/new/', '/data')
    expect(fsWalkerStub.callCount).toBe(1)
  })

  it('should pass joined root path to fsWalker', async () => {
    await incrementalScanFolder(loggerFake, knexFnFake, '/comics/new/', '/data')
    expect(fsWalkerStub.firstCall.args[0]).toBe('/data/comics/new/')
  })

  it('should call incrementalAddPicturesBulk exactly once', async () => {
    fsWalkerStub.callsFake(
      async (_root: string, cb: (items: Array<{ path: string; isFile: boolean }>) => Promise<void>) => {
        await cb([
          { path: '/page1.jpg', isFile: true },
          { path: '/page2.png', isFile: true },
        ])
      },
    )
    await incrementalScanFolder(loggerFake, knexFnFake, '/comics/new/', '/data')
    expect(incrementalAddPicturesBulkStub.callCount).toBe(1)
  })

  it('should pass all collected picture paths in one bulk call', async () => {
    fsWalkerStub.callsFake(
      async (_root: string, cb: (items: Array<{ path: string; isFile: boolean }>) => Promise<void>) => {
        await cb([
          { path: '/page1.jpg', isFile: true },
          { path: '/page2.png', isFile: true },
        ])
      },
    )
    await incrementalScanFolder(loggerFake, knexFnFake, '/comics/new/', '/data')
    expect(incrementalAddPicturesBulkStub.firstCall.args[1]).toEqual(['/comics/new/page1.jpg', '/comics/new/page2.png'])
  })

  it('should call incrementalEnsureFoldersBulk exactly once', async () => {
    fsWalkerStub.callsFake(
      async (_root: string, cb: (items: Array<{ path: string; isFile: boolean }>) => Promise<void>) => {
        await cb([{ path: '/sub', isFile: false }])
      },
    )
    await incrementalScanFolder(loggerFake, knexFnFake, '/comics/new/', '/data')
    expect(incrementalEnsureFoldersBulkStub.callCount).toBe(1)
  })

  it('should include the root scanned directory in the bulk folder ensure', async () => {
    fsWalkerStub.callsFake(
      async (_root: string, cb: (items: Array<{ path: string; isFile: boolean }>) => Promise<void>) => {
        await cb([])
      },
    )
    await incrementalScanFolder(loggerFake, knexFnFake, '/comics/new/', '/data')
    const folderPaths = cast<string[]>(incrementalEnsureFoldersBulkStub.firstCall.args[1])
    expect(folderPaths).toContain('/comics/new/')
  })

  it('should include each discovered subdirectory in the bulk folder ensure', async () => {
    fsWalkerStub.callsFake(
      async (_root: string, cb: (items: Array<{ path: string; isFile: boolean }>) => Promise<void>) => {
        await cb([
          { path: '/sub1', isFile: false },
          { path: '/sub2', isFile: false },
        ])
      },
    )
    await incrementalScanFolder(loggerFake, knexFnFake, '/comics/new/', '/data')
    const folderPaths = cast<string[]>(incrementalEnsureFoldersBulkStub.firstCall.args[1])
    expect(folderPaths).toEqual(expect.arrayContaining(['/comics/new/sub1/', '/comics/new/sub2/']))
  })

  it('should not include files in the bulk folder ensure', async () => {
    fsWalkerStub.callsFake(
      async (_root: string, cb: (items: Array<{ path: string; isFile: boolean }>) => Promise<void>) => {
        await cb([{ path: '/page.jpg', isFile: true }])
      },
    )
    await incrementalScanFolder(loggerFake, knexFnFake, '/comics/new/', '/data')
    const folderPaths = cast<string[]>(incrementalEnsureFoldersBulkStub.firstCall.args[1])
    expect(folderPaths).not.toContain('/comics/new/page.jpg')
  })

  it('should not pass directory items as picture paths', async () => {
    fsWalkerStub.callsFake(
      async (_root: string, cb: (items: Array<{ path: string; isFile: boolean }>) => Promise<void>) => {
        await cb([
          { path: '/sub', isFile: false },
          { path: '/page.jpg', isFile: true },
        ])
      },
    )
    await incrementalScanFolder(loggerFake, knexFnFake, '/comics/new/', '/data')
    const picturePaths = cast<string[]>(incrementalAddPicturesBulkStub.firstCall.args[1])
    expect(picturePaths).toEqual(['/comics/new/page.jpg'])
  })

  it('should handle empty directory by sending empty paths to bulk add', async () => {
    fsWalkerStub.callsFake(
      async (_root: string, cb: (items: Array<{ path: string; isFile: boolean }>) => Promise<void>) => {
        await cb([])
      },
    )
    await incrementalScanFolder(loggerFake, knexFnFake, '/comics/empty/', '/data')
    expect(incrementalAddPicturesBulkStub.firstCall.args[1]).toEqual([])
  })

  it('should log summary with added count', async () => {
    fsWalkerStub.callsFake(
      async (_root: string, cb: (items: Array<{ path: string; isFile: boolean }>) => Promise<void>) => {
        await cb([
          { path: '/page1.jpg', isFile: true },
          { path: '/page2.jpg', isFile: true },
        ])
      },
    )
    await incrementalScanFolder(loggerFake, knexFnFake, '/comics/new/', '/data')
    expect(loggerStub.calledWith('Incremental scan folder: /comics/new/ (2 pictures added)')).toBe(true)
  })
})

'use sanity'

import { expect } from 'chai'
import { IncrementalScanFolder, Internals, Imports } from '#sync/incrementalsync.js'
import Sinon from 'sinon'
import { cast, stubToKnex } from '#testutils/TypeGuards.js'
import { createLoggerFake } from '#testutils/Debug.js'

const sandbox = Sinon.createSandbox()

describe('sync/incrementalsync IncrementalScanFolder()', () => {
  let { stub: loggerStub, fake: loggerFake } = createLoggerFake(sandbox)
  let fsWalkerStub = sandbox.stub()
  let incrementalAddPicturesBulkStub = sandbox.stub()
  let incrementalEnsureFoldersBulkStub = sandbox.stub()
  let knexFnStub = sandbox.stub()
  let knexFnFake = stubToKnex(knexFnStub)

  beforeEach(() => {
    ;({ stub: loggerStub, fake: loggerFake } = createLoggerFake(sandbox))
    fsWalkerStub = sandbox.stub(Imports, 'fsWalker').resolves()
    incrementalAddPicturesBulkStub = sandbox.stub(Internals, 'IncrementalAddPicturesBulk').resolves()
    incrementalEnsureFoldersBulkStub = sandbox.stub(Internals, 'IncrementalEnsureFoldersBulk').resolves()
    knexFnStub = sandbox.stub()
    knexFnFake = stubToKnex(knexFnStub)
  })

  afterEach(() => {
    sandbox.restore()
  })

  it('should call fsWalker once', async () => {
    await IncrementalScanFolder(loggerFake, knexFnFake, '/comics/new/', '/data')
    expect(fsWalkerStub.callCount).to.equal(1)
  })

  it('should pass joined root path to fsWalker', async () => {
    await IncrementalScanFolder(loggerFake, knexFnFake, '/comics/new/', '/data')
    expect(fsWalkerStub.firstCall.args[0]).to.equal('/data/comics/new/')
  })

  it('should call IncrementalAddPicturesBulk exactly once', async () => {
    fsWalkerStub.callsFake(
      async (_root: string, cb: (items: Array<{ path: string; isFile: boolean }>) => Promise<void>) => {
        await cb([
          { path: '/page1.jpg', isFile: true },
          { path: '/page2.png', isFile: true },
        ])
      },
    )
    await IncrementalScanFolder(loggerFake, knexFnFake, '/comics/new/', '/data')
    expect(incrementalAddPicturesBulkStub.callCount).to.equal(1)
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
    await IncrementalScanFolder(loggerFake, knexFnFake, '/comics/new/', '/data')
    expect(incrementalAddPicturesBulkStub.firstCall.args[1]).to.deep.equal([
      '/comics/new/page1.jpg',
      '/comics/new/page2.png',
    ])
  })

  it('should call IncrementalEnsureFoldersBulk exactly once', async () => {
    fsWalkerStub.callsFake(
      async (_root: string, cb: (items: Array<{ path: string; isFile: boolean }>) => Promise<void>) => {
        await cb([{ path: '/sub', isFile: false }])
      },
    )
    await IncrementalScanFolder(loggerFake, knexFnFake, '/comics/new/', '/data')
    expect(incrementalEnsureFoldersBulkStub.callCount).to.equal(1)
  })

  it('should include the root scanned directory in the bulk folder ensure', async () => {
    fsWalkerStub.callsFake(
      async (_root: string, cb: (items: Array<{ path: string; isFile: boolean }>) => Promise<void>) => {
        await cb([])
      },
    )
    await IncrementalScanFolder(loggerFake, knexFnFake, '/comics/new/', '/data')
    const folderPaths = cast<string[]>(incrementalEnsureFoldersBulkStub.firstCall.args[1])
    expect(folderPaths).to.include('/comics/new/')
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
    await IncrementalScanFolder(loggerFake, knexFnFake, '/comics/new/', '/data')
    const folderPaths = cast<string[]>(incrementalEnsureFoldersBulkStub.firstCall.args[1])
    expect(folderPaths).to.include.members(['/comics/new/sub1/', '/comics/new/sub2/'])
  })

  it('should not include files in the bulk folder ensure', async () => {
    fsWalkerStub.callsFake(
      async (_root: string, cb: (items: Array<{ path: string; isFile: boolean }>) => Promise<void>) => {
        await cb([{ path: '/page.jpg', isFile: true }])
      },
    )
    await IncrementalScanFolder(loggerFake, knexFnFake, '/comics/new/', '/data')
    const folderPaths = cast<string[]>(incrementalEnsureFoldersBulkStub.firstCall.args[1])
    expect(folderPaths).to.not.include('/comics/new/page.jpg')
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
    await IncrementalScanFolder(loggerFake, knexFnFake, '/comics/new/', '/data')
    const picturePaths = cast<string[]>(incrementalAddPicturesBulkStub.firstCall.args[1])
    expect(picturePaths).to.deep.equal(['/comics/new/page.jpg'])
  })

  it('should handle empty directory by sending empty paths to bulk add', async () => {
    fsWalkerStub.callsFake(
      async (_root: string, cb: (items: Array<{ path: string; isFile: boolean }>) => Promise<void>) => {
        await cb([])
      },
    )
    await IncrementalScanFolder(loggerFake, knexFnFake, '/comics/empty/', '/data')
    expect(incrementalAddPicturesBulkStub.firstCall.args[1]).to.deep.equal([])
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
    await IncrementalScanFolder(loggerFake, knexFnFake, '/comics/new/', '/data')
    expect(loggerStub.calledWith('Incremental scan folder: /comics/new/ (2 pictures added)')).to.equal(true)
  })
})

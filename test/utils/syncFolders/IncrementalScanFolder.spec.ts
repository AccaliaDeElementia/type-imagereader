'use sanity'

import { expect } from 'chai'
import { Functions, Imports } from '#utils/incrementalsync'
import Sinon from 'sinon'
import { Cast, StubToKnex } from '#testutils/TypeGuards'
import type { Debugger } from 'debug'

const sandbox = Sinon.createSandbox()

describe('utils/syncfolders function IncrementalScanFolder()', () => {
  let loggerStub = sandbox.stub()
  let loggerFake = Cast<Debugger>(loggerStub)
  let fsWalkerStub = sandbox.stub()
  let incrementalAddPictureStub = sandbox.stub()
  let incrementalEnsureFolderStub = sandbox.stub()
  let knexFnStub = sandbox.stub()
  let knexFnFake = StubToKnex(knexFnStub)

  beforeEach(() => {
    loggerStub = sandbox.stub()
    loggerFake = Cast<Debugger>(loggerStub)
    sandbox.stub(Imports, 'debug').returns(Cast<Debugger>(sandbox.stub()))
    fsWalkerStub = sandbox.stub(Imports, 'fsWalker').resolves()
    incrementalAddPictureStub = sandbox.stub(Functions, 'IncrementalAddPicture').resolves()
    incrementalEnsureFolderStub = sandbox.stub(Functions, 'IncrementalEnsureFolder').resolves()
    knexFnStub = sandbox.stub()
    knexFnFake = StubToKnex(knexFnStub)
  })

  afterEach(() => {
    sandbox.restore()
  })

  it('should ensure the root scanned directory has a folder row', async () => {
    await Functions.IncrementalScanFolder(loggerFake, knexFnFake, '/comics/new/', '/data')
    expect(incrementalEnsureFolderStub.firstCall.args[1]).to.equal('/comics/new/')
  })

  it('should ensure root folder before calling fsWalker', async () => {
    await Functions.IncrementalScanFolder(loggerFake, knexFnFake, '/comics/new/', '/data')
    expect(incrementalEnsureFolderStub.calledBefore(fsWalkerStub)).to.equal(true)
  })

  it('should call fsWalker once', async () => {
    await Functions.IncrementalScanFolder(loggerFake, knexFnFake, '/comics/new/', '/data')
    expect(fsWalkerStub.callCount).to.equal(1)
  })

  it('should pass joined root path to fsWalker', async () => {
    await Functions.IncrementalScanFolder(loggerFake, knexFnFake, '/comics/new/', '/data')
    expect(fsWalkerStub.firstCall.args[0]).to.equal('/data/comics/new/')
  })

  it('should call IncrementalAddPicture for each discovered image', async () => {
    fsWalkerStub.callsFake(
      async (_root: string, cb: (items: Array<{ path: string; isFile: boolean }>) => Promise<void>) => {
        await cb([
          { path: '/page1.jpg', isFile: true },
          { path: '/page2.png', isFile: true },
        ])
      },
    )
    await Functions.IncrementalScanFolder(loggerFake, knexFnFake, '/comics/new/', '/data')
    expect(incrementalAddPictureStub.callCount).to.equal(2)
  })

  it('should construct correct picture paths by joining dir path and item path', async () => {
    fsWalkerStub.callsFake(
      async (_root: string, cb: (items: Array<{ path: string; isFile: boolean }>) => Promise<void>) => {
        await cb([{ path: '/sub/page.jpg', isFile: true }])
      },
    )
    await Functions.IncrementalScanFolder(loggerFake, knexFnFake, '/comics/new/', '/data')
    expect(incrementalAddPictureStub.firstCall.args[1]).to.equal('/comics/new/sub/page.jpg')
  })

  it('should only add files as pictures not directories', async () => {
    fsWalkerStub.callsFake(
      async (_root: string, cb: (items: Array<{ path: string; isFile: boolean }>) => Promise<void>) => {
        await cb([
          { path: '/subdir', isFile: false },
          { path: '/page.jpg', isFile: true },
        ])
      },
    )
    await Functions.IncrementalScanFolder(loggerFake, knexFnFake, '/comics/new/', '/data')
    expect(incrementalAddPictureStub.callCount).to.equal(1)
  })

  it('should ensure folder for subdirectory items', async () => {
    fsWalkerStub.callsFake(
      async (_root: string, cb: (items: Array<{ path: string; isFile: boolean }>) => Promise<void>) => {
        await cb([
          { path: '/subdir', isFile: false },
          { path: '/page.jpg', isFile: true },
        ])
      },
    )
    await Functions.IncrementalScanFolder(loggerFake, knexFnFake, '/comics/new/', '/data')
    const ensureCalls = incrementalEnsureFolderStub.getCalls()
    const subDirCall = ensureCalls.find((c) => c.args[1] === '/comics/new/subdir/')
    expect(subDirCall).to.not.equal(undefined)
  })

  it('should handle empty directory with no images', async () => {
    fsWalkerStub.callsFake(
      async (_root: string, cb: (items: Array<{ path: string; isFile: boolean }>) => Promise<void>) => {
        await cb([])
      },
    )
    await Functions.IncrementalScanFolder(loggerFake, knexFnFake, '/comics/empty/', '/data')
    expect(incrementalAddPictureStub.callCount).to.equal(0)
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
    await Functions.IncrementalScanFolder(loggerFake, knexFnFake, '/comics/new/', '/data')
    expect(loggerStub.calledWith('Incremental scan folder: /comics/new/ (2 pictures added)')).to.equal(true)
  })
})

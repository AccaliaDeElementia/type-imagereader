'use sanity'

import { expect } from 'chai'
import { Functions, Imports } from '#utils/syncfolders.js'
import Sinon from 'sinon'
import { Cast, StubToKnex } from '#testutils/TypeGuards.js'
import type { Debugger } from 'debug'

const sandbox = Sinon.createSandbox()

describe('utils/syncfolders function SyncAllPictures()', () => {
  let syncNewPicturesStub = sandbox.stub()
  let syncRemovedPicturesStub = sandbox.stub()
  let syncRemovedBookmarksStub = sandbox.stub()
  let loggerStub = sandbox.stub()
  let debugStub = sandbox.stub()
  let knexFake = StubToKnex({ id: Math.random() })
  beforeEach(() => {
    loggerStub = sandbox.stub()
    knexFake = StubToKnex({ id: Math.random() })
    debugStub = sandbox.stub(Imports, 'debug').returns(Cast<Debugger>(loggerStub))
    syncNewPicturesStub = sandbox.stub(Functions, 'SyncNewPictures').resolves()
    syncRemovedPicturesStub = sandbox.stub(Functions, 'SyncRemovedPictures').resolves()
    syncRemovedBookmarksStub = sandbox.stub(Functions, 'SyncRemovedBookmarks').resolves()
  })
  afterEach(() => {
    sandbox.restore()
  })
  it('should call debug once when constructing logger', async () => {
    await Functions.SyncAllPictures(knexFake)
    expect(debugStub.callCount).to.equal(1)
  })
  it('should construct prefixed logger', async () => {
    await Functions.SyncAllPictures(knexFake)
    expect(debugStub.firstCall.args[0])
      .to.be.a('string')
      .and.satisfy((msg: string) => msg.startsWith(`${Imports.logPrefix}:`), 'Logger should be prefixed')
      .and.satisfy((msg: string) => msg.endsWith(':syncPictures'), 'Logger should be suffixed with `syncPictures`')
  })
  it('should call SyncNewPictures once', async () => {
    await Functions.SyncAllPictures(knexFake)
    expect(syncNewPicturesStub.callCount).to.equal(1)
  })
  it('should call SyncNewPictures with expected args', async () => {
    await Functions.SyncAllPictures(knexFake)
    expect(syncNewPicturesStub.firstCall.args).to.deep.equal([loggerStub, knexFake])
  })
  it('should call SyncRemovedPictures once', async () => {
    await Functions.SyncAllPictures(knexFake)
    expect(syncRemovedPicturesStub.callCount).to.equal(1)
  })
  it('should call SyncRemovedPictures with expected args', async () => {
    await Functions.SyncAllPictures(knexFake)
    expect(syncRemovedPicturesStub.firstCall.args).to.deep.equal([loggerStub, knexFake])
  })
  it('should call SyncRemovedBookmarks once', async () => {
    await Functions.SyncAllPictures(knexFake)
    expect(syncRemovedBookmarksStub.callCount).to.equal(1)
  })
  it('should call SyncRemovedBookmarks with expected args', async () => {
    await Functions.SyncAllPictures(knexFake)
    expect(syncRemovedBookmarksStub.firstCall.args).to.deep.equal([loggerStub, knexFake])
  })
})

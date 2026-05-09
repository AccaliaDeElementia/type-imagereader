'use sanity'

import { expect } from 'chai'
import { SyncAllPictures, Internals, Imports } from '#sync/pictures.js'
import Sinon from 'sinon'
import { StubToKnex } from '#testutils/TypeGuards.js'
import { stubDebug } from '#testutils/Debug.js'

const sandbox = Sinon.createSandbox()

describe('utils/syncfolders function SyncAllPictures()', () => {
  let syncNewPicturesStub = sandbox.stub()
  let syncRemovedPicturesStub = sandbox.stub()
  let syncRemovedBookmarksStub = sandbox.stub()
  let loggerStub = sandbox.stub()
  let debugStub = sandbox.stub()
  let knexFake = StubToKnex({ id: Math.random() })
  beforeEach(() => {
    knexFake = StubToKnex({ id: Math.random() })
    ;({ debugStub, loggerStub } = stubDebug(sandbox, Imports))
    syncNewPicturesStub = sandbox.stub(Internals, 'SyncNewPictures').resolves()
    syncRemovedPicturesStub = sandbox.stub(Internals, 'SyncRemovedPictures').resolves()
    syncRemovedBookmarksStub = sandbox.stub(Internals, 'SyncRemovedBookmarks').resolves()
  })
  afterEach(() => {
    sandbox.restore()
  })
  it('should call debug once when constructing logger', async () => {
    await SyncAllPictures(knexFake)
    expect(debugStub.callCount).to.equal(1)
  })
  it('should construct logger with the module prefix', async () => {
    await SyncAllPictures(knexFake)
    expect(debugStub.firstCall.args[0]).to.equal(Imports.logPrefix)
  })
  it('should call SyncNewPictures once', async () => {
    await SyncAllPictures(knexFake)
    expect(syncNewPicturesStub.callCount).to.equal(1)
  })
  it('should call SyncNewPictures with expected args', async () => {
    await SyncAllPictures(knexFake)
    expect(syncNewPicturesStub.firstCall.args).to.deep.equal([loggerStub, knexFake])
  })
  it('should call SyncRemovedPictures once', async () => {
    await SyncAllPictures(knexFake)
    expect(syncRemovedPicturesStub.callCount).to.equal(1)
  })
  it('should call SyncRemovedPictures with expected args', async () => {
    await SyncAllPictures(knexFake)
    expect(syncRemovedPicturesStub.firstCall.args).to.deep.equal([loggerStub, knexFake])
  })
  it('should call SyncRemovedBookmarks once', async () => {
    await SyncAllPictures(knexFake)
    expect(syncRemovedBookmarksStub.callCount).to.equal(1)
  })
  it('should call SyncRemovedBookmarks with expected args', async () => {
    await SyncAllPictures(knexFake)
    expect(syncRemovedBookmarksStub.firstCall.args).to.deep.equal([loggerStub, knexFake])
  })
})

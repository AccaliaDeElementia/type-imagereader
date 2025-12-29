'use sanity'

import { expect } from 'chai'
import { Functions, Imports } from '../../../utils/syncfolders'
import Sinon from 'sinon'
import { Cast, StubToKnex } from '../../testutils/TypeGuards'
import type { Debugger } from 'debug'

describe('utils/syncfolders function SyncAllPictures()', () => {
  let syncNewPicturesStub = Sinon.stub()
  let syncRemovedPicturesStub = Sinon.stub()
  let syncRemovedBookmarksStub = Sinon.stub()
  let loggerStub = Sinon.stub()
  let debugStub = Sinon.stub()
  let knexFake = StubToKnex({ id: Math.random() })
  beforeEach(() => {
    loggerStub = Sinon.stub()
    knexFake = StubToKnex({ id: Math.random() })
    debugStub = Sinon.stub(Imports, 'debug').returns(Cast<Debugger>(loggerStub))
    syncNewPicturesStub = Sinon.stub(Functions, 'SyncNewPictures').resolves()
    syncRemovedPicturesStub = Sinon.stub(Functions, 'SyncRemovedPictures').resolves()
    syncRemovedBookmarksStub = Sinon.stub(Functions, 'SyncRemovedBookmarks').resolves()
  })
  afterEach(() => {
    debugStub.restore()
    syncNewPicturesStub.restore()
    syncRemovedPicturesStub.restore()
    syncRemovedBookmarksStub.restore()
  })
  it('should construct prefixed logger', async () => {
    await Functions.SyncAllPictures(knexFake)
    expect(debugStub.callCount).to.equal(1)
    expect(debugStub.firstCall.args[0])
      .to.be.a('string')
      .and.satisfy((msg: string) => msg.startsWith(Imports.logPrefix + ':'), 'Logger should be prefixed')
      .and.satisfy((msg: string) => msg.endsWith(':syncPictures'), 'Logger should be suffixed with `syncPictures`')
  })
  it('should call SyncNewPictures', async () => {
    await Functions.SyncAllPictures(knexFake)
    expect(syncNewPicturesStub.callCount).to.equal(1)
    expect(syncNewPicturesStub.firstCall.args).to.have.lengthOf(2)
    expect(syncNewPicturesStub.firstCall.args[0]).to.equal(loggerStub)
    expect(syncNewPicturesStub.firstCall.args[1]).to.equal(knexFake)
  })
  it('should call SyncRemovedPictures', async () => {
    await Functions.SyncAllPictures(knexFake)
    expect(syncRemovedPicturesStub.callCount).to.equal(1)
    expect(syncRemovedPicturesStub.firstCall.args).to.have.lengthOf(2)
    expect(syncRemovedPicturesStub.firstCall.args[0]).to.equal(loggerStub)
    expect(syncRemovedPicturesStub.firstCall.args[1]).to.equal(knexFake)
  })
  it('should call SyncRemovedBookmarks', async () => {
    await Functions.SyncAllPictures(knexFake)
    expect(syncRemovedBookmarksStub.callCount).to.equal(1)
    expect(syncRemovedBookmarksStub.firstCall.args).to.have.lengthOf(2)
    expect(syncRemovedBookmarksStub.firstCall.args[0]).to.equal(loggerStub)
    expect(syncRemovedBookmarksStub.firstCall.args[1]).to.equal(knexFake)
  })
})

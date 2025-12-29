'use sanity'

import { expect } from 'chai'
import { Functions, Imports } from '../../../utils/syncfolders'
import Sinon from 'sinon'
import { Cast, StubToKnex } from '../../testutils/TypeGuards'
import type { Debugger } from 'debug'

describe('utils/syncfolders function SyncAllFolders()', () => {
  let syncNewFoldersStub = Sinon.stub()
  let syncRemovedFoldersStub = Sinon.stub()
  let syncMissingCoverImagesStub = Sinon.stub()
  let syncFolderFirstImagesStub = Sinon.stub()
  let loggerStub = Sinon.stub()
  let debugStub = Sinon.stub()
  let knexFake = StubToKnex({ id: Math.random() })
  beforeEach(() => {
    loggerStub = Sinon.stub()
    debugStub = Sinon.stub(Imports, 'debug').returns(Cast<Debugger>(loggerStub))
    syncNewFoldersStub = Sinon.stub(Functions, 'SyncNewFolders').resolves()
    syncRemovedFoldersStub = Sinon.stub(Functions, 'SyncRemovedFolders').resolves()
    syncMissingCoverImagesStub = Sinon.stub(Functions, 'SyncMissingCoverImages').resolves()
    syncFolderFirstImagesStub = Sinon.stub(Functions, 'SyncFolderFirstImages').resolves()
    knexFake = StubToKnex({ id: Math.random() })
  })
  afterEach(() => {
    debugStub.restore()
    syncNewFoldersStub.restore()
    syncRemovedFoldersStub.restore()
    syncMissingCoverImagesStub.restore()
    syncFolderFirstImagesStub.restore()
  })
  it('should construct prefixed logger', async () => {
    await Functions.SyncAllFolders(knexFake)
    expect(debugStub.callCount).to.equal(1)
    expect(debugStub.firstCall.args[0])
      .to.be.a('string')
      .and.satisfy((msg: string) => msg.startsWith(Imports.logPrefix + ':'), 'Logger should be prefixed')
      .and.satisfy((msg: string) => msg.endsWith(':syncFolders'), 'Logger should be suffixed with `syncPictures`')
  })
  it('should call SyncNewPictures', async () => {
    await Functions.SyncAllFolders(knexFake)
    expect(syncNewFoldersStub.callCount).to.equal(1)
    expect(syncNewFoldersStub.firstCall.args).to.deep.equal([loggerStub, knexFake])
  })
  it('should call SyncRemovedPictures', async () => {
    await Functions.SyncAllFolders(knexFake)
    expect(syncRemovedFoldersStub.callCount).to.equal(1)
    expect(syncRemovedFoldersStub.firstCall.args).to.deep.equal([loggerStub, knexFake])
  })
  it('should call SyncRemovedBookmarks', async () => {
    await Functions.SyncAllFolders(knexFake)
    expect(syncMissingCoverImagesStub.callCount).to.equal(1)
    expect(syncMissingCoverImagesStub.firstCall.args).to.deep.equal([loggerStub, knexFake])
  })
  it('should call SyncFolderFirstImages', async () => {
    await Functions.SyncAllFolders(knexFake)
    expect(syncFolderFirstImagesStub.callCount).to.equal(1)
    expect(syncFolderFirstImagesStub.firstCall.args).to.deep.equal([loggerStub, knexFake])
  })
})

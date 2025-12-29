'use sanity'

import { expect } from 'chai'
import persistence from '../../../utils/persistance'
import synchronize, { Functions, Imports } from '../../../utils/syncfolders'
import Sinon from 'sinon'
import { Cast, StubToKnex } from '../../testutils/TypeGuards'
import type { Debugger } from 'debug'

describe('utils/syncfolders function synchronize()', () => {
  let loggerStub = Sinon.stub()
  let debugStub = Sinon.stub()
  let findSyncItemsStub = Sinon.stub()
  let syncAllPicturesStub = Sinon.stub()
  let syncAllFoldersStub = Sinon.stub()
  let updateFolderPictureCountsStub = Sinon.stub()
  let pruneEmptyFoldersStub = Sinon.stub()
  let persistenceIntitializerStub = Sinon.stub()
  let knexFnStub = Sinon.stub().returnsThis()
  beforeEach(() => {
    loggerStub = Sinon.stub()
    knexFnStub = Sinon.stub().returnsThis()
    debugStub = Sinon.stub(Imports, 'debug').returns(Cast<Debugger>(loggerStub))
    persistenceIntitializerStub = Sinon.stub(persistence, 'initialize').resolves(StubToKnex(knexFnStub))
    findSyncItemsStub = Sinon.stub(Functions, 'FindSyncItems').resolves(1)
    syncAllPicturesStub = Sinon.stub(Functions, 'SyncAllPictures').resolves()
    syncAllFoldersStub = Sinon.stub(Functions, 'SyncAllFolders').resolves()
    updateFolderPictureCountsStub = Sinon.stub(Functions, 'UpdateFolderPictureCounts').resolves()
    pruneEmptyFoldersStub = Sinon.stub(Functions, 'PruneEmptyFolders').resolves()
  })
  afterEach(() => {
    debugStub.restore()
    findSyncItemsStub.restore()
    syncAllPicturesStub.restore()
    syncAllFoldersStub.restore()
    updateFolderPictureCountsStub.restore()
    pruneEmptyFoldersStub.restore()
    persistenceIntitializerStub.restore()
  })
  it('should create logger at start of process', async () => {
    await synchronize()
    expect(debugStub.callCount).to.equal(1)
    expect(debugStub.firstCall.args[0]).to.equal(Imports.logPrefix)
  })
  it('should log start of processing', async () => {
    await synchronize()
    expect(loggerStub.callCount).to.be.above(1)
    expect(loggerStub.firstCall.args[0]).to.equal('Folder Synchronization Begins')
  })
  it('should initialize the persistence layer', async () => {
    await synchronize()
    expect(persistenceIntitializerStub.callCount).to.equal(1)
    expect(persistenceIntitializerStub.firstCall.args).to.deep.equal([])
  })
  it('should find the sync items using the knex instance', async () => {
    await synchronize()
    expect(findSyncItemsStub.callCount).to.equal(1)
    expect(findSyncItemsStub.firstCall.args).to.have.lengthOf(1)
    expect(findSyncItemsStub.firstCall.args[0]).to.equal(knexFnStub)
  })
  it('should abort synchronizing when zero images found', async () => {
    findSyncItemsStub.resolves(0)
    await synchronize()
    expect(syncAllPicturesStub.callCount).to.equal(0)
    expect(syncAllFoldersStub.callCount).to.equal(0)
    expect(updateFolderPictureCountsStub.callCount).to.equal(0)
    expect(pruneEmptyFoldersStub.callCount).to.equal(0)
  })
  it('should log error when aborting synchronizing with zero images found', async () => {
    findSyncItemsStub.resolves(-1)
    await synchronize()
    expect(loggerStub.secondCall.args).to.have.lengthOf(2)
    expect(loggerStub.secondCall.args[0]).to.equal('Folder Synchronization Failed')
    const error = Cast(loggerStub.secondCall.args[1], (e) => e instanceof Error)
    expect(error).to.be.an('Error')
    expect(error.message).to.equal('Found Zero images, refusing to process empty base folder')
  })
  it('should log success at end of processing with success', async () => {
    findSyncItemsStub.resolves(45)
    await synchronize()
    expect(loggerStub.lastCall.args).to.have.lengthOf(1)
    expect(loggerStub.lastCall.args[0]).to.equal('Folder Synchronization Complete')
  })
  it('should log success at end of processing with error', async () => {
    findSyncItemsStub.resolves(-1)
    await synchronize()
    expect(loggerStub.lastCall.args).to.have.lengthOf(1)
    expect(loggerStub.lastCall.args[0]).to.equal('Folder Synchronization Complete')
  })
})

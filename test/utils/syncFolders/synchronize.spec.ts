'use sanity'

import { expect } from 'chai'
import persistence from '../../../utils/persistance'
import synchronize, { Functions, Imports } from '../../../utils/syncfolders'
import Sinon from 'sinon'
import { Cast, StubToKnex } from '../../../testutils/TypeGuards'
import type { Debugger } from 'debug'

const sandbox = Sinon.createSandbox()

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
    debugStub = sandbox.stub(Imports, 'debug').returns(Cast<Debugger>(loggerStub))
    persistenceIntitializerStub = sandbox.stub(persistence, 'initialize').resolves(StubToKnex(knexFnStub))
    findSyncItemsStub = sandbox.stub(Functions, 'FindSyncItems').resolves(1)
    syncAllPicturesStub = sandbox.stub(Functions, 'SyncAllPictures').resolves()
    syncAllFoldersStub = sandbox.stub(Functions, 'SyncAllFolders').resolves()
    updateFolderPictureCountsStub = sandbox.stub(Functions, 'UpdateFolderPictureCounts').resolves()
    pruneEmptyFoldersStub = sandbox.stub(Functions, 'PruneEmptyFolders').resolves()
  })
  afterEach(() => {
    sandbox.restore()
  })
  it('should call debug once at start of process', async () => {
    await synchronize()
    expect(debugStub.callCount).to.equal(1)
  })
  it('should create logger at start of process', async () => {
    await synchronize()
    expect(debugStub.firstCall.args[0]).to.equal(Imports.logPrefix)
  })
  it('should log more than once when processing', async () => {
    await synchronize()
    expect(loggerStub.callCount).to.be.above(1)
  })
  it('should log start of processing', async () => {
    await synchronize()
    expect(loggerStub.firstCall.args[0]).to.equal('Folder Synchronization Begins')
  })
  it('should call initialize once', async () => {
    await synchronize()
    expect(persistenceIntitializerStub.callCount).to.equal(1)
  })
  it('should initialize the persistence layer with no arguments', async () => {
    await synchronize()
    expect(persistenceIntitializerStub.firstCall.args).to.deep.equal([])
  })
  it('should call FindSyncItems once', async () => {
    await synchronize()
    expect(findSyncItemsStub.callCount).to.equal(1)
  })
  it('should call FindSyncItems with one argument', async () => {
    await synchronize()
    expect(findSyncItemsStub.firstCall.args).to.have.lengthOf(1)
  })
  it('should find the sync items using the knex instance', async () => {
    await synchronize()
    expect(findSyncItemsStub.firstCall.args[0]).to.equal(knexFnStub)
  })
  it('should not call SyncAllPictures when zero images found', async () => {
    findSyncItemsStub.resolves(0)
    await synchronize()
    expect(syncAllPicturesStub.callCount).to.equal(0)
  })
  it('should not call SyncAllFolders when zero images found', async () => {
    findSyncItemsStub.resolves(0)
    await synchronize()
    expect(syncAllFoldersStub.callCount).to.equal(0)
  })
  it('should not call UpdateFolderPictureCounts when zero images found', async () => {
    findSyncItemsStub.resolves(0)
    await synchronize()
    expect(updateFolderPictureCountsStub.callCount).to.equal(0)
  })
  it('should not call PruneEmptyFolders when zero images found', async () => {
    findSyncItemsStub.resolves(0)
    await synchronize()
    expect(pruneEmptyFoldersStub.callCount).to.equal(0)
  })
  it('should log error with two arguments when aborting', async () => {
    findSyncItemsStub.resolves(-1)
    await synchronize()
    expect(loggerStub.secondCall.args).to.have.lengthOf(2)
  })
  it('should log error label when aborting synchronizing with zero images found', async () => {
    findSyncItemsStub.resolves(-1)
    await synchronize()
    expect(loggerStub.secondCall.args[0]).to.equal('Folder Synchronization Failed')
  })
  it('should log an Error instance when aborting synchronizing with zero images found', async () => {
    findSyncItemsStub.resolves(-1)
    await synchronize()
    const error = Cast(loggerStub.secondCall.args[1], (e) => e instanceof Error)
    expect(error).to.be.an('Error')
  })
  it('should log error message when aborting synchronizing with zero images found', async () => {
    findSyncItemsStub.resolves(-1)
    await synchronize()
    const error = Cast(loggerStub.secondCall.args[1], (e) => e instanceof Error)
    expect(error.message).to.equal('Found Zero images, refusing to process empty base folder')
  })
  it('should log success message at end of successful processing', async () => {
    findSyncItemsStub.resolves(45)
    await synchronize()
    expect(loggerStub.lastCall.args).to.have.lengthOf(1)
  })
  it('should log success at end of processing with success', async () => {
    findSyncItemsStub.resolves(45)
    await synchronize()
    expect(loggerStub.lastCall.args[0]).to.equal('Folder Synchronization Complete')
  })
  it('should log success message at end of failed processing', async () => {
    findSyncItemsStub.resolves(-1)
    await synchronize()
    expect(loggerStub.lastCall.args).to.have.lengthOf(1)
  })
  it('should log success at end of processing with error', async () => {
    findSyncItemsStub.resolves(-1)
    await synchronize()
    expect(loggerStub.lastCall.args[0]).to.equal('Folder Synchronization Complete')
  })
})

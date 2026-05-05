'use sanity'

import { expect } from 'chai'
import persistence from '#utils/persistance.js'
import synchronize, { Functions, Imports } from '#utils/syncfolders.js'
import Sinon from 'sinon'
import { Cast, StubToKnex } from '#testutils/TypeGuards.js'
import type { Debugger } from 'debug'

const sandbox = Sinon.createSandbox()

const findCall = (stub: Sinon.SinonStub, predicate: (args: unknown[]) => boolean): Sinon.SinonSpyCall | undefined =>
  stub.getCalls().find((c) => predicate(c.args))

const stepLog = /^[A-Za-z]+ completed in \d+\.\d+s$/v
const stepFailureLog = /^[A-Za-z]+ failed after \d+\.\d+s$/v
const completeLog = /^Folder Synchronization Complete after \d+\.\d+s$/v
const failedSummaryLog = /^Folder Synchronization Failed after \d+\.\d+s$/v

describe('utils/syncfolders function synchronize()', () => {
  let loggerStub = sandbox.stub()
  let debugStub = sandbox.stub()
  let findSyncItemsStub = sandbox.stub()
  let syncAllPicturesStub = sandbox.stub()
  let syncAllFoldersStub = sandbox.stub()
  let updateFolderPictureCountsStub = sandbox.stub()
  let pruneEmptyFoldersStub = sandbox.stub()
  let emitSqliteSizeWarningStub = sandbox.stub()
  let persistenceIntitializerStub = sandbox.stub()
  let knexFnStub = sandbox.stub().returnsThis()
  beforeEach(() => {
    loggerStub = sandbox.stub()
    knexFnStub = sandbox.stub().returnsThis()
    debugStub = sandbox.stub(Imports, 'debug').returns(Cast<Debugger>(loggerStub))
    persistenceIntitializerStub = sandbox.stub(persistence, 'initialize').resolves(StubToKnex(knexFnStub))
    findSyncItemsStub = sandbox.stub(Functions, 'FindSyncItems').resolves(1)
    syncAllPicturesStub = sandbox.stub(Functions, 'SyncAllPictures').resolves()
    syncAllFoldersStub = sandbox.stub(Functions, 'SyncAllFolders').resolves()
    updateFolderPictureCountsStub = sandbox.stub(Functions, 'UpdateFolderPictureCounts').resolves()
    pruneEmptyFoldersStub = sandbox.stub(Functions, 'PruneEmptyFolders').resolves()
    emitSqliteSizeWarningStub = sandbox.stub(Functions, 'EmitSqliteSizeWarning')
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
  it('should log elapsed time for FindSyncItems step', async () => {
    await synchronize()
    const call = findCall(loggerStub, (args) => typeof args[0] === 'string' && args[0].startsWith('FindSyncItems '))
    expect(call?.args[0]).to.match(stepLog)
  })
  it('should log elapsed time for SyncAllPictures step', async () => {
    await synchronize()
    const call = findCall(loggerStub, (args) => typeof args[0] === 'string' && args[0].startsWith('SyncAllPictures '))
    expect(call?.args[0]).to.match(stepLog)
  })
  it('should log elapsed time for SyncAllFolders step', async () => {
    await synchronize()
    const call = findCall(loggerStub, (args) => typeof args[0] === 'string' && args[0].startsWith('SyncAllFolders '))
    expect(call?.args[0]).to.match(stepLog)
  })
  it('should log elapsed time for UpdateFolderPictureCounts step', async () => {
    await synchronize()
    const call = findCall(
      loggerStub,
      (args) => typeof args[0] === 'string' && args[0].startsWith('UpdateFolderPictureCounts '),
    )
    expect(call?.args[0]).to.match(stepLog)
  })
  it('should log elapsed time for PruneEmptyFolders step', async () => {
    await synchronize()
    const call = findCall(loggerStub, (args) => typeof args[0] === 'string' && args[0].startsWith('PruneEmptyFolders '))
    expect(call?.args[0]).to.match(stepLog)
  })
  it('should not call SyncAllPictures when zero images found', async () => {
    findSyncItemsStub.resolves(0)
    await synchronize().catch(() => null)
    expect(syncAllPicturesStub.callCount).to.equal(0)
  })
  it('should not call SyncAllFolders when zero images found', async () => {
    findSyncItemsStub.resolves(0)
    await synchronize().catch(() => null)
    expect(syncAllFoldersStub.callCount).to.equal(0)
  })
  it('should not call UpdateFolderPictureCounts when zero images found', async () => {
    findSyncItemsStub.resolves(0)
    await synchronize().catch(() => null)
    expect(updateFolderPictureCountsStub.callCount).to.equal(0)
  })
  it('should not call PruneEmptyFolders when zero images found', async () => {
    findSyncItemsStub.resolves(0)
    await synchronize().catch(() => null)
    expect(pruneEmptyFoldersStub.callCount).to.equal(0)
  })
  it('should log error with two arguments when aborting', async () => {
    findSyncItemsStub.resolves(-1)
    await synchronize().catch(() => null)
    const call = findCall(loggerStub, (args) => args[0] === 'Folder Synchronization Failed')
    expect(call?.args).to.have.lengthOf(2)
  })
  it('should log error label when aborting synchronizing with zero images found', async () => {
    findSyncItemsStub.resolves(-1)
    await synchronize().catch(() => null)
    const call = findCall(loggerStub, (args) => args[0] === 'Folder Synchronization Failed')
    expect(call?.args[0]).to.equal('Folder Synchronization Failed')
  })
  it('should log an Error instance when aborting synchronizing with zero images found', async () => {
    findSyncItemsStub.resolves(-1)
    await synchronize().catch(() => null)
    const call = findCall(loggerStub, (args) => args[0] === 'Folder Synchronization Failed')
    const error = Cast(call?.args[1], (e) => e instanceof Error)
    expect(error).to.be.an('Error')
  })
  it('should log error message when aborting synchronizing with zero images found', async () => {
    findSyncItemsStub.resolves(-1)
    await synchronize().catch(() => null)
    const call = findCall(loggerStub, (args) => args[0] === 'Folder Synchronization Failed')
    const error = Cast(call?.args[1], (e) => e instanceof Error)
    expect(error.message).to.equal('Found Zero images, refusing to process empty base folder')
  })
  it('should log success message at end of successful processing', async () => {
    findSyncItemsStub.resolves(45)
    await synchronize()
    expect(loggerStub.lastCall.args).to.have.lengthOf(1)
  })
  it('should log elapsed total time in seconds at end of processing with success', async () => {
    findSyncItemsStub.resolves(45)
    await synchronize()
    expect(loggerStub.lastCall.args[0]).to.match(completeLog)
  })
  it('should log success message at end of failed processing', async () => {
    findSyncItemsStub.resolves(-1)
    await synchronize().catch(() => null)
    expect(loggerStub.lastCall.args).to.have.lengthOf(1)
  })
  it('should log elapsed total time in seconds at end of processing with error', async () => {
    findSyncItemsStub.resolves(-1)
    await synchronize().catch(() => null)
    expect(loggerStub.lastCall.args[0]).to.match(failedSummaryLog)
  })
  it('should log a per-step failure when a step rejects', async () => {
    syncAllPicturesStub.rejects(new Error('boom'))
    await synchronize().catch(() => null)
    const call = findCall(
      loggerStub,
      (args) => typeof args[0] === 'string' && args[0].startsWith('SyncAllPictures failed'),
    )
    expect(call).to.not.equal(undefined)
  })
  it('should include elapsed time in per-step failure log', async () => {
    syncAllPicturesStub.rejects(new Error('boom'))
    await synchronize().catch(() => null)
    const call = findCall(
      loggerStub,
      (args) => typeof args[0] === 'string' && args[0].startsWith('SyncAllPictures failed'),
    )
    expect(call?.args[0]).to.match(stepFailureLog)
  })
  it('should pass the rejected error to the per-step failure log', async () => {
    const err = new Error('boom')
    syncAllPicturesStub.rejects(err)
    await synchronize().catch(() => null)
    const call = findCall(
      loggerStub,
      (args) => typeof args[0] === 'string' && args[0].startsWith('SyncAllPictures failed'),
    )
    expect(call?.args[1]).to.equal(err)
  })
  it('should reject with the original error when a step throws', async () => {
    const err = new Error('boom')
    syncAllPicturesStub.rejects(err)
    let caught: unknown = null
    try {
      await synchronize()
    } catch (e) {
      caught = e
    }
    expect(caught).to.equal(err)
  })
  it('should reject when zero images found', async () => {
    findSyncItemsStub.resolves(0)
    let rejected = false
    try {
      await synchronize()
    } catch {
      rejected = true
    }
    expect(rejected).to.equal(true)
  })

  it('should call EmitSqliteSizeWarning once on a successful sync', async () => {
    findSyncItemsStub.resolves(45)
    await synchronize()
    expect(emitSqliteSizeWarningStub.callCount).to.equal(1)
  })

  it('should pass the logger as the first argument to EmitSqliteSizeWarning', async () => {
    findSyncItemsStub.resolves(45)
    await synchronize()
    expect(emitSqliteSizeWarningStub.firstCall.args[0]).to.equal(loggerStub)
  })

  it('should pass the knex instance as the second argument to EmitSqliteSizeWarning', async () => {
    findSyncItemsStub.resolves(45)
    await synchronize()
    expect(emitSqliteSizeWarningStub.firstCall.args[1]).to.equal(knexFnStub)
  })

  it('should pass the picture count from FindSyncItems as the third argument to EmitSqliteSizeWarning', async () => {
    findSyncItemsStub.resolves(12345)
    await synchronize()
    expect(emitSqliteSizeWarningStub.firstCall.args[2]).to.equal(12345)
  })

  it('should not call EmitSqliteSizeWarning when zero images found', async () => {
    findSyncItemsStub.resolves(0)
    await synchronize().catch(() => null)
    expect(emitSqliteSizeWarningStub.callCount).to.equal(0)
  })

  it('should not call EmitSqliteSizeWarning when a step rejects', async () => {
    findSyncItemsStub.resolves(45)
    syncAllPicturesStub.rejects(new Error('boom'))
    await synchronize().catch(() => null)
    expect(emitSqliteSizeWarningStub.callCount).to.equal(0)
  })
})

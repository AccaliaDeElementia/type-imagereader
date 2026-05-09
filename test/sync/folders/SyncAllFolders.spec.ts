'use sanity'

import { expect } from 'chai'
import { SyncAllFolders, Internals, Imports, LOG_PREFIX } from '#sync/folders.js'
import Sinon from 'sinon'
import { StubToKnex } from '#testutils/TypeGuards.js'
import { stubDebug } from '#testutils/Debug.js'

const sandbox = Sinon.createSandbox()

describe('utils/syncfolders function SyncAllFolders()', () => {
  let syncNewFoldersStub = sandbox.stub()
  let syncRemovedFoldersStub = sandbox.stub()
  let syncMissingAncestorFoldersStub = sandbox.stub()
  let syncMissingCoverImagesStub = sandbox.stub()
  let syncFolderFirstImagesStub = sandbox.stub()
  let loggerStub = sandbox.stub()
  let debugStub = sandbox.stub()
  let knexFake = StubToKnex({ id: Math.random() })
  beforeEach(() => {
    ;({ debugStub, loggerStub } = stubDebug(sandbox, Imports))
    syncNewFoldersStub = sandbox.stub(Internals, 'SyncNewFolders').resolves()
    syncRemovedFoldersStub = sandbox.stub(Internals, 'SyncRemovedFolders').resolves()
    syncMissingAncestorFoldersStub = sandbox.stub(Internals, 'SyncMissingAncestorFolders').resolves()
    syncMissingCoverImagesStub = sandbox.stub(Internals, 'SyncMissingCoverImages').resolves()
    syncFolderFirstImagesStub = sandbox.stub(Internals, 'SyncFolderFirstImages').resolves()
    knexFake = StubToKnex({ id: Math.random() })
  })
  afterEach(() => {
    sandbox.restore()
  })
  it('should call debug once when constructing logger', async () => {
    await SyncAllFolders(knexFake)
    expect(debugStub.callCount).to.equal(1)
  })
  it('should construct logger with the module prefix', async () => {
    await SyncAllFolders(knexFake)
    expect(debugStub.firstCall.args[0]).to.equal(LOG_PREFIX)
  })
  it('should call SyncNewFolders once', async () => {
    await SyncAllFolders(knexFake)
    expect(syncNewFoldersStub.callCount).to.equal(1)
  })
  it('should call SyncNewFolders with expected args', async () => {
    await SyncAllFolders(knexFake)
    expect(syncNewFoldersStub.firstCall.args).to.deep.equal([loggerStub, knexFake])
  })
  it('should call SyncRemovedFolders once', async () => {
    await SyncAllFolders(knexFake)
    expect(syncRemovedFoldersStub.callCount).to.equal(1)
  })
  it('should call SyncRemovedFolders with expected args', async () => {
    await SyncAllFolders(knexFake)
    expect(syncRemovedFoldersStub.firstCall.args).to.deep.equal([loggerStub, knexFake])
  })
  it('should call SyncMissingAncestorFolders once', async () => {
    await SyncAllFolders(knexFake)
    expect(syncMissingAncestorFoldersStub.callCount).to.equal(1)
  })
  it('should call SyncMissingAncestorFolders with expected args', async () => {
    await SyncAllFolders(knexFake)
    expect(syncMissingAncestorFoldersStub.firstCall.args).to.deep.equal([loggerStub, knexFake])
  })
  it('should call SyncMissingAncestorFolders after SyncRemovedFolders', async () => {
    await SyncAllFolders(knexFake)
    expect(syncMissingAncestorFoldersStub.calledAfter(syncRemovedFoldersStub)).to.equal(true)
  })
  it('should call SyncMissingAncestorFolders before SyncFolderFirstImages', async () => {
    await SyncAllFolders(knexFake)
    expect(syncMissingAncestorFoldersStub.calledBefore(syncFolderFirstImagesStub)).to.equal(true)
  })
  it('should call SyncMissingCoverImages once', async () => {
    await SyncAllFolders(knexFake)
    expect(syncMissingCoverImagesStub.callCount).to.equal(1)
  })
  it('should call SyncMissingCoverImages with expected args', async () => {
    await SyncAllFolders(knexFake)
    expect(syncMissingCoverImagesStub.firstCall.args).to.deep.equal([loggerStub, knexFake])
  })
  it('should call SyncFolderFirstImages once', async () => {
    await SyncAllFolders(knexFake)
    expect(syncFolderFirstImagesStub.callCount).to.equal(1)
  })
  it('should call SyncFolderFirstImages with expected args', async () => {
    await SyncAllFolders(knexFake)
    expect(syncFolderFirstImagesStub.firstCall.args).to.deep.equal([loggerStub, knexFake])
  })
})

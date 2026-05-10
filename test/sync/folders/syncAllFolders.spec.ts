'use sanity'

import { syncAllFolders, Internals, Imports, LOG_PREFIX } from '#sync/folders.js'
import Sinon from 'sinon'
import { stubToKnex } from '#testutils/typeGuards.js'
import { stubDebug } from '#testutils/debug.js'

const sandbox = Sinon.createSandbox()

describe('sync/folders syncAllFolders()', () => {
  let syncNewFoldersStub = sandbox.stub()
  let syncRemovedFoldersStub = sandbox.stub()
  let syncMissingAncestorFoldersStub = sandbox.stub()
  let syncMissingCoverImagesStub = sandbox.stub()
  let syncFolderFirstImagesStub = sandbox.stub()
  let loggerStub = sandbox.stub()
  let debugStub = sandbox.stub()
  let knexFake = stubToKnex({ id: Math.random() })
  beforeEach(() => {
    ;({ debugStub, loggerStub } = stubDebug(sandbox, Imports))
    syncNewFoldersStub = sandbox.stub(Internals, 'syncNewFolders').resolves()
    syncRemovedFoldersStub = sandbox.stub(Internals, 'syncRemovedFolders').resolves()
    syncMissingAncestorFoldersStub = sandbox.stub(Internals, 'syncMissingAncestorFolders').resolves()
    syncMissingCoverImagesStub = sandbox.stub(Internals, 'syncMissingCoverImages').resolves()
    syncFolderFirstImagesStub = sandbox.stub(Internals, 'syncFolderFirstImages').resolves()
    knexFake = stubToKnex({ id: Math.random() })
  })
  afterEach(() => {
    sandbox.restore()
  })
  it('should call debug once when constructing logger', async () => {
    await syncAllFolders(knexFake)
    expect(debugStub.callCount).toBe(1)
  })
  it('should construct logger with the module prefix', async () => {
    await syncAllFolders(knexFake)
    expect(debugStub.firstCall.args[0]).toBe(LOG_PREFIX)
  })
  it('should call syncNewFolders once', async () => {
    await syncAllFolders(knexFake)
    expect(syncNewFoldersStub.callCount).toBe(1)
  })
  it('should call syncNewFolders with expected args', async () => {
    await syncAllFolders(knexFake)
    expect(syncNewFoldersStub.firstCall.args).toEqual([loggerStub, knexFake])
  })
  it('should call syncRemovedFolders once', async () => {
    await syncAllFolders(knexFake)
    expect(syncRemovedFoldersStub.callCount).toBe(1)
  })
  it('should call syncRemovedFolders with expected args', async () => {
    await syncAllFolders(knexFake)
    expect(syncRemovedFoldersStub.firstCall.args).toEqual([loggerStub, knexFake])
  })
  it('should call syncMissingAncestorFolders once', async () => {
    await syncAllFolders(knexFake)
    expect(syncMissingAncestorFoldersStub.callCount).toBe(1)
  })
  it('should call syncMissingAncestorFolders with expected args', async () => {
    await syncAllFolders(knexFake)
    expect(syncMissingAncestorFoldersStub.firstCall.args).toEqual([loggerStub, knexFake])
  })
  it('should call syncMissingAncestorFolders after syncRemovedFolders', async () => {
    await syncAllFolders(knexFake)
    expect(syncMissingAncestorFoldersStub.calledAfter(syncRemovedFoldersStub)).toBe(true)
  })
  it('should call syncMissingAncestorFolders before syncFolderFirstImages', async () => {
    await syncAllFolders(knexFake)
    expect(syncMissingAncestorFoldersStub.calledBefore(syncFolderFirstImagesStub)).toBe(true)
  })
  it('should call syncMissingCoverImages once', async () => {
    await syncAllFolders(knexFake)
    expect(syncMissingCoverImagesStub.callCount).toBe(1)
  })
  it('should call syncMissingCoverImages with expected args', async () => {
    await syncAllFolders(knexFake)
    expect(syncMissingCoverImagesStub.firstCall.args).toEqual([loggerStub, knexFake])
  })
  it('should call syncFolderFirstImages once', async () => {
    await syncAllFolders(knexFake)
    expect(syncFolderFirstImagesStub.callCount).toBe(1)
  })
  it('should call syncFolderFirstImages with expected args', async () => {
    await syncAllFolders(knexFake)
    expect(syncFolderFirstImagesStub.firstCall.args).toEqual([loggerStub, knexFake])
  })
})

'use sanity'

import { expect } from 'chai'
import { Functions, Imports } from '#utils/syncfolders.js'
import Sinon from 'sinon'
import { Cast, StubToKnex } from '#testutils/TypeGuards.js'
import type { Debugger } from 'debug'

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
    loggerStub = sandbox.stub()
    debugStub = sandbox.stub(Imports, 'debug').returns(Cast<Debugger>(loggerStub))
    syncNewFoldersStub = sandbox.stub(Functions, 'SyncNewFolders').resolves()
    syncRemovedFoldersStub = sandbox.stub(Functions, 'SyncRemovedFolders').resolves()
    syncMissingAncestorFoldersStub = sandbox.stub(Functions, 'SyncMissingAncestorFolders').resolves()
    syncMissingCoverImagesStub = sandbox.stub(Functions, 'SyncMissingCoverImages').resolves()
    syncFolderFirstImagesStub = sandbox.stub(Functions, 'SyncFolderFirstImages').resolves()
    knexFake = StubToKnex({ id: Math.random() })
  })
  afterEach(() => {
    sandbox.restore()
  })
  it('should call debug once when constructing logger', async () => {
    await Functions.SyncAllFolders(knexFake)
    expect(debugStub.callCount).to.equal(1)
  })
  it('should construct prefixed logger', async () => {
    await Functions.SyncAllFolders(knexFake)
    expect(debugStub.firstCall.args[0])
      .to.be.a('string')
      .and.satisfy((msg: string) => msg.startsWith(`${Imports.logPrefix}:`), 'Logger should be prefixed')
      .and.satisfy((msg: string) => msg.endsWith(':syncFolders'), 'Logger should be suffixed with `syncFolders`')
  })
  it('should call SyncNewFolders once', async () => {
    await Functions.SyncAllFolders(knexFake)
    expect(syncNewFoldersStub.callCount).to.equal(1)
  })
  it('should call SyncNewFolders with expected args', async () => {
    await Functions.SyncAllFolders(knexFake)
    expect(syncNewFoldersStub.firstCall.args).to.deep.equal([loggerStub, knexFake])
  })
  it('should call SyncRemovedFolders once', async () => {
    await Functions.SyncAllFolders(knexFake)
    expect(syncRemovedFoldersStub.callCount).to.equal(1)
  })
  it('should call SyncRemovedFolders with expected args', async () => {
    await Functions.SyncAllFolders(knexFake)
    expect(syncRemovedFoldersStub.firstCall.args).to.deep.equal([loggerStub, knexFake])
  })
  it('should call SyncMissingAncestorFolders once', async () => {
    await Functions.SyncAllFolders(knexFake)
    expect(syncMissingAncestorFoldersStub.callCount).to.equal(1)
  })
  it('should call SyncMissingAncestorFolders with expected args', async () => {
    await Functions.SyncAllFolders(knexFake)
    expect(syncMissingAncestorFoldersStub.firstCall.args).to.deep.equal([loggerStub, knexFake])
  })
  it('should call SyncMissingAncestorFolders after SyncRemovedFolders', async () => {
    await Functions.SyncAllFolders(knexFake)
    expect(syncMissingAncestorFoldersStub.calledAfter(syncRemovedFoldersStub)).to.equal(true)
  })
  it('should call SyncMissingAncestorFolders before SyncFolderFirstImages', async () => {
    await Functions.SyncAllFolders(knexFake)
    expect(syncMissingAncestorFoldersStub.calledBefore(syncFolderFirstImagesStub)).to.equal(true)
  })
  it('should call SyncMissingCoverImages once', async () => {
    await Functions.SyncAllFolders(knexFake)
    expect(syncMissingCoverImagesStub.callCount).to.equal(1)
  })
  it('should call SyncMissingCoverImages with expected args', async () => {
    await Functions.SyncAllFolders(knexFake)
    expect(syncMissingCoverImagesStub.firstCall.args).to.deep.equal([loggerStub, knexFake])
  })
  it('should call SyncFolderFirstImages once', async () => {
    await Functions.SyncAllFolders(knexFake)
    expect(syncFolderFirstImagesStub.callCount).to.equal(1)
  })
  it('should call SyncFolderFirstImages with expected args', async () => {
    await Functions.SyncAllFolders(knexFake)
    expect(syncFolderFirstImagesStub.firstCall.args).to.deep.equal([loggerStub, knexFake])
  })
})

'use sanity'

import { syncAllPictures, Internals, Imports, LOG_PREFIX } from '#sync/pictures.js'
import Sinon from 'sinon'
import { stubToKnex } from '#testutils/typeGuards.js'
import { stubDebug } from '#testutils/debug.js'

const sandbox = Sinon.createSandbox()

describe('sync/pictures syncAllPictures()', () => {
  let syncNewPicturesStub = sandbox.stub()
  let syncRemovedPicturesStub = sandbox.stub()
  let syncRemovedBookmarksStub = sandbox.stub()
  let loggerStub = sandbox.stub()
  let debugStub = sandbox.stub()
  let knexFake = stubToKnex({ id: Math.random() })
  beforeEach(() => {
    knexFake = stubToKnex({ id: Math.random() })
    ;({ debugStub, loggerStub } = stubDebug(sandbox, Imports))
    syncNewPicturesStub = sandbox.stub(Internals, 'syncNewPictures').resolves()
    syncRemovedPicturesStub = sandbox.stub(Internals, 'syncRemovedPictures').resolves()
    syncRemovedBookmarksStub = sandbox.stub(Internals, 'syncRemovedBookmarks').resolves()
  })
  afterEach(() => {
    sandbox.restore()
  })
  it('should call debug once when constructing logger', async () => {
    await syncAllPictures(knexFake)
    expect(debugStub.callCount).toBe(1)
  })
  it('should construct logger with the module prefix', async () => {
    await syncAllPictures(knexFake)
    expect(debugStub.firstCall.args[0]).toBe(LOG_PREFIX)
  })
  it('should call syncNewPictures once', async () => {
    await syncAllPictures(knexFake)
    expect(syncNewPicturesStub.callCount).toBe(1)
  })
  it('should call syncNewPictures with expected args', async () => {
    await syncAllPictures(knexFake)
    expect(syncNewPicturesStub.firstCall.args).toEqual([loggerStub, knexFake])
  })
  it('should call syncRemovedPictures once', async () => {
    await syncAllPictures(knexFake)
    expect(syncRemovedPicturesStub.callCount).toBe(1)
  })
  it('should call syncRemovedPictures with expected args', async () => {
    await syncAllPictures(knexFake)
    expect(syncRemovedPicturesStub.firstCall.args).toEqual([loggerStub, knexFake])
  })
  it('should call syncRemovedBookmarks once', async () => {
    await syncAllPictures(knexFake)
    expect(syncRemovedBookmarksStub.callCount).toBe(1)
  })
  it('should call syncRemovedBookmarks with expected args', async () => {
    await syncAllPictures(knexFake)
    expect(syncRemovedBookmarksStub.firstCall.args).toEqual([loggerStub, knexFake])
  })
})

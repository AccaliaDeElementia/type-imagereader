'use sanity'

import { expect } from 'chai'
import { Functions, Imports } from '#sync/incrementalsync.js'
import Sinon from 'sinon'
import { StubToKnex } from '#testutils/TypeGuards.js'
import { createLoggerFake } from '#testutils/Debug.js'

const sandbox = Sinon.createSandbox()

describe('utils/incrementalsync function IncrementalUpdateFirstImages()', () => {
  let { fake: loggerFake } = createLoggerFake(sandbox)
  let syncFolderFirstImagesStub = sandbox.stub()
  let knexFnStub = sandbox.stub()
  let knexFnFake = StubToKnex(knexFnStub)

  beforeEach(() => {
    ;({ fake: loggerFake } = createLoggerFake(sandbox))
    syncFolderFirstImagesStub = sandbox.stub(Imports.FolderFunctions, 'SyncFolderFirstImages').resolves()
    knexFnStub = sandbox.stub()
    knexFnFake = StubToKnex(knexFnStub)
  })

  afterEach(() => {
    sandbox.restore()
  })

  it('should delegate to SyncFolderFirstImages', async () => {
    await Functions.IncrementalUpdateFirstImages(loggerFake, knexFnFake)
    expect(syncFolderFirstImagesStub.callCount).to.equal(1)
  })

  it('should pass logger to SyncFolderFirstImages', async () => {
    await Functions.IncrementalUpdateFirstImages(loggerFake, knexFnFake)
    expect(syncFolderFirstImagesStub.firstCall.args[0]).to.equal(loggerFake)
  })

  it('should pass knex to SyncFolderFirstImages', async () => {
    await Functions.IncrementalUpdateFirstImages(loggerFake, knexFnFake)
    expect(syncFolderFirstImagesStub.firstCall.args[1]).to.equal(knexFnFake)
  })
})

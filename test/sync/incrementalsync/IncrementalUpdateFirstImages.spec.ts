'use sanity'

import { expect } from 'chai'
import { IncrementalUpdateFirstImages, Imports } from '#sync/incrementalsync.js'
import Sinon from 'sinon'
import { stubToKnex } from '#testutils/TypeGuards.js'
import { createLoggerFake } from '#testutils/Debug.js'

const sandbox = Sinon.createSandbox()

describe('sync/incrementalsync IncrementalUpdateFirstImages()', () => {
  let { fake: loggerFake } = createLoggerFake(sandbox)
  let syncFolderFirstImagesStub = sandbox.stub()
  let knexFnStub = sandbox.stub()
  let knexFnFake = stubToKnex(knexFnStub)

  beforeEach(() => {
    ;({ fake: loggerFake } = createLoggerFake(sandbox))
    syncFolderFirstImagesStub = sandbox.stub(Imports, 'SyncFolderFirstImages').resolves()
    knexFnStub = sandbox.stub()
    knexFnFake = stubToKnex(knexFnStub)
  })

  afterEach(() => {
    sandbox.restore()
  })

  it('should delegate to SyncFolderFirstImages', async () => {
    await IncrementalUpdateFirstImages(loggerFake, knexFnFake)
    expect(syncFolderFirstImagesStub.callCount).to.equal(1)
  })

  it('should pass logger to SyncFolderFirstImages', async () => {
    await IncrementalUpdateFirstImages(loggerFake, knexFnFake)
    expect(syncFolderFirstImagesStub.firstCall.args[0]).to.equal(loggerFake)
  })

  it('should pass knex to SyncFolderFirstImages', async () => {
    await IncrementalUpdateFirstImages(loggerFake, knexFnFake)
    expect(syncFolderFirstImagesStub.firstCall.args[1]).to.equal(knexFnFake)
  })
})

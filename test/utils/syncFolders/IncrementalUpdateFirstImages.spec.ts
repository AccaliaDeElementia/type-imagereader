'use sanity'

import { expect } from 'chai'
import { Functions, Imports } from '#utils/incrementalsync'
import Sinon from 'sinon'
import { Cast, StubToKnex } from '#testutils/TypeGuards'
import type { Debugger } from 'debug'

const sandbox = Sinon.createSandbox()

describe('utils/incrementalsync function IncrementalUpdateFirstImages()', () => {
  let loggerStub = sandbox.stub()
  let loggerFake = Cast<Debugger>(loggerStub)
  let syncFolderFirstImagesStub = sandbox.stub()
  let knexFnStub = sandbox.stub()
  let knexFnFake = StubToKnex(knexFnStub)

  beforeEach(() => {
    loggerStub = sandbox.stub()
    loggerFake = Cast<Debugger>(loggerStub)
    sandbox.stub(Imports, 'debug').returns(Cast<Debugger>(sandbox.stub()))
    syncFolderFirstImagesStub = sandbox.stub(Imports.SyncFunctions, 'SyncFolderFirstImages').resolves()
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

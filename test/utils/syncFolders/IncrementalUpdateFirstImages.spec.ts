'use sanity'

import { expect } from 'chai'
import { Functions, Imports } from '#utils/incrementalsync'
import Sinon from 'sinon'
import { Cast, StubToKnex } from '#testutils/TypeGuards'
import type { Debugger } from 'debug'

const sandbox = Sinon.createSandbox()

describe('utils/incrementalsync function IncrementalUpdateFirstImages()', () => {
  let loggerStub = Sinon.stub()
  let loggerFake = Cast<Debugger>(loggerStub)
  let syncFolderFirstImagesStub = Sinon.stub()
  let knexFnStub = Sinon.stub()
  let knexFnFake = StubToKnex(knexFnStub)

  beforeEach(() => {
    loggerStub = Sinon.stub()
    loggerFake = Cast<Debugger>(loggerStub)
    sandbox.stub(Imports, 'debug').returns(Cast<Debugger>(Sinon.stub()))
    syncFolderFirstImagesStub = sandbox.stub(Imports.SyncFunctions, 'SyncFolderFirstImages').resolves()
    knexFnStub = Sinon.stub()
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

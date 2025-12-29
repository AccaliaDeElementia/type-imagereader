'use sanity'

import { expect } from 'chai'
import { Functions, Imports } from '../../../utils/syncfolders'
import Sinon from 'sinon'
import { Cast, StubToKnex } from '../../testutils/TypeGuards'
import type { Debugger } from 'debug'

describe('utils/syncfolders function PruneEmptyFolders()', () => {
  let loggerStub = Sinon.stub()
  let debugStub = Sinon.stub()
  let knexStub = {
    where: Sinon.stub().returnsThis(),
    delete: Sinon.stub().resolves(),
  }
  let knexFnStub = Sinon.stub().returns(knexStub)
  let knexFnFake = StubToKnex(knexFnStub)
  beforeEach(() => {
    loggerStub = Sinon.stub()
    knexStub = {
      where: Sinon.stub().returnsThis(),
      delete: Sinon.stub().resolves(),
    }
    knexFnStub = Sinon.stub().returns(knexStub)
    knexFnFake = StubToKnex(knexFnStub)
    debugStub = Sinon.stub(Imports, 'debug').returns(Cast<Debugger>(loggerStub))
  })
  afterEach(() => {
    debugStub.restore()
  })
  it('should construct prefixed logger', async () => {
    await Functions.PruneEmptyFolders(knexFnFake)
    expect(debugStub.callCount).to.equal(1)
    expect(debugStub.firstCall.args[0])
      .to.be.a('string')
      .and.satisfy((msg: string) => msg.startsWith(Imports.logPrefix + ':'), 'Logger should be prefixed')
      .and.satisfy((msg: string) => msg.endsWith(':pruneEmpty'), 'Logger should be suffixed with `pruneEmpty`')
  })
  it('should use knex to delete folders with total count=0', async () => {
    await Functions.PruneEmptyFolders(knexFnFake)
    expect(knexFnStub.callCount).to.equal(1)
    expect(knexFnStub.firstCall.args).to.deep.equal(['folders'])
    expect(knexStub.where.callCount).to.equal(1)
    expect(knexStub.where.firstCall.args).to.deep.equal(['totalCount', '=', 0])
    expect(knexStub.delete.callCount).to.equal(1)
    expect(knexStub.delete.firstCall.args).to.deep.equal([])
  })
  it('log removed folder count', async () => {
    knexStub.delete.resolves(42)
    await Functions.PruneEmptyFolders(knexFnFake)
    expect(loggerStub.callCount).to.equal(1)
    expect(loggerStub.firstCall.args).to.deep.equal(['Removed 42 empty folders'])
  })
})

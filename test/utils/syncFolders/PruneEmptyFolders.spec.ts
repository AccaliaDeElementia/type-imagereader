'use sanity'

import { expect } from 'chai'
import { Functions, Imports } from '#utils/syncfolders'
import Sinon from 'sinon'
import { Cast } from '#testutils/TypeGuards'
import { createKnexChainFake } from '#testutils/Knex'
import type { Debugger } from 'debug'

const sandbox = Sinon.createSandbox()

describe('utils/syncfolders function PruneEmptyFolders()', () => {
  let loggerStub = sandbox.stub()
  let debugStub = sandbox.stub()
  let {
    instance: knexStub,
    stub: knexFnStub,
    fake: knexFnFake,
  } = createKnexChainFake(['where', 'andWhere'] as const, ['delete'] as const, undefined)
  beforeEach(() => {
    loggerStub = sandbox.stub()
    ;({
      instance: knexStub,
      stub: knexFnStub,
      fake: knexFnFake,
    } = createKnexChainFake(['where', 'andWhere'] as const, ['delete'] as const, undefined))
    debugStub = sandbox.stub(Imports, 'debug').returns(Cast<Debugger>(loggerStub))
  })
  afterEach(() => {
    sandbox.restore()
  })
  it('should call debug once when constructing logger', async () => {
    await Functions.PruneEmptyFolders(knexFnFake)
    expect(debugStub.callCount).to.equal(1)
  })
  it('should construct prefixed logger', async () => {
    await Functions.PruneEmptyFolders(knexFnFake)
    expect(debugStub.firstCall.args[0])
      .to.be.a('string')
      .and.satisfy((msg: string) => msg.startsWith(`${Imports.logPrefix}:`), 'Logger should be prefixed')
      .and.satisfy((msg: string) => msg.endsWith(':pruneEmpty'), 'Logger should be suffixed with `pruneEmpty`')
  })
  it('should call knex once when deleting empty folders', async () => {
    await Functions.PruneEmptyFolders(knexFnFake)
    expect(knexFnStub.callCount).to.equal(1)
  })
  it('should delete from folders table', async () => {
    await Functions.PruneEmptyFolders(knexFnFake)
    expect(knexFnStub.firstCall.args).to.deep.equal(['folders'])
  })
  it('should call where once when filtering empty folders', async () => {
    await Functions.PruneEmptyFolders(knexFnFake)
    expect(knexStub.where.callCount).to.equal(1)
  })
  it('should filter folders with totalCount=0', async () => {
    await Functions.PruneEmptyFolders(knexFnFake)
    expect(knexStub.where.firstCall.args).to.deep.equal(['totalCount', '=', 0])
  })
  it('should call andWhere once when excluding root', async () => {
    await Functions.PruneEmptyFolders(knexFnFake)
    expect(knexStub.andWhere.callCount).to.equal(1)
  })
  it('should exclude root folder from prune delete', async () => {
    await Functions.PruneEmptyFolders(knexFnFake)
    expect(knexStub.andWhere.firstCall.args).to.deep.equal(['path', '<>', '/'])
  })
  it('should call delete once', async () => {
    await Functions.PruneEmptyFolders(knexFnFake)
    expect(knexStub.delete.callCount).to.equal(1)
  })
  it('should delete with no arguments', async () => {
    await Functions.PruneEmptyFolders(knexFnFake)
    expect(knexStub.delete.firstCall.args).to.deep.equal([])
  })
  it('should log removed folder count once', async () => {
    knexStub.delete.resolves(42)
    await Functions.PruneEmptyFolders(knexFnFake)
    expect(loggerStub.callCount).to.equal(1)
  })
  it('should log removed folder count', async () => {
    knexStub.delete.resolves(42)
    await Functions.PruneEmptyFolders(knexFnFake)
    expect(loggerStub.firstCall.args).to.deep.equal(['Removed 42 empty folders'])
  })
})

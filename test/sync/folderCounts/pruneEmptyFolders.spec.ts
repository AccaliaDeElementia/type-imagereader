'use sanity'

import { expect } from 'chai'
import { pruneEmptyFolders, Imports, LOG_PREFIX } from '#sync/folderCounts.js'
import Sinon from 'sinon'
import { createKnexChainFake } from '#testutils/knex.js'
import { stubDebug } from '#testutils/debug.js'

const sandbox = Sinon.createSandbox()

describe('sync/folderCounts pruneEmptyFolders()', () => {
  let loggerStub = sandbox.stub()
  let debugStub = sandbox.stub()
  let {
    instance: knexStub,
    stub: knexFnStub,
    fake: knexFnFake,
  } = createKnexChainFake(['where', 'andWhere'] as const, ['delete'] as const, undefined)
  beforeEach(() => {
    ;({
      instance: knexStub,
      stub: knexFnStub,
      fake: knexFnFake,
    } = createKnexChainFake(['where', 'andWhere'] as const, ['delete'] as const, undefined))
    ;({ debugStub, loggerStub } = stubDebug(sandbox, Imports))
  })
  afterEach(() => {
    sandbox.restore()
  })
  it('should call debug once when constructing logger', async () => {
    await pruneEmptyFolders(knexFnFake)
    expect(debugStub.callCount).to.equal(1)
  })
  it('should construct prefixed logger', async () => {
    await pruneEmptyFolders(knexFnFake)
    expect(debugStub.firstCall.args[0])
      .to.be.a('string')
      .and.satisfy((msg: string) => msg.startsWith(`${LOG_PREFIX}:`), 'Logger should be prefixed')
      .and.satisfy((msg: string) => msg.endsWith(':pruneEmpty'), 'Logger should be suffixed with `pruneEmpty`')
  })
  it('should call knex once when deleting empty folders', async () => {
    await pruneEmptyFolders(knexFnFake)
    expect(knexFnStub.callCount).to.equal(1)
  })
  it('should delete from folders table', async () => {
    await pruneEmptyFolders(knexFnFake)
    expect(knexFnStub.firstCall.args).to.deep.equal(['folders'])
  })
  it('should call where once when filtering empty folders', async () => {
    await pruneEmptyFolders(knexFnFake)
    expect(knexStub.where.callCount).to.equal(1)
  })
  it('should filter folders with totalCount=0', async () => {
    await pruneEmptyFolders(knexFnFake)
    expect(knexStub.where.firstCall.args).to.deep.equal(['totalCount', '=', 0])
  })
  it('should call andWhere once when excluding root', async () => {
    await pruneEmptyFolders(knexFnFake)
    expect(knexStub.andWhere.callCount).to.equal(1)
  })
  it('should exclude root folder from prune delete', async () => {
    await pruneEmptyFolders(knexFnFake)
    expect(knexStub.andWhere.firstCall.args).to.deep.equal(['path', '<>', '/'])
  })
  it('should call delete once', async () => {
    await pruneEmptyFolders(knexFnFake)
    expect(knexStub.delete.callCount).to.equal(1)
  })
  it('should delete with no arguments', async () => {
    await pruneEmptyFolders(knexFnFake)
    expect(knexStub.delete.firstCall.args).to.deep.equal([])
  })
  it('should log removed folder count once', async () => {
    knexStub.delete.resolves(42)
    await pruneEmptyFolders(knexFnFake)
    expect(loggerStub.callCount).to.equal(1)
  })
  it('should log removed folder count', async () => {
    knexStub.delete.resolves(42)
    await pruneEmptyFolders(knexFnFake)
    expect(loggerStub.firstCall.args).to.deep.equal(['Removed 42 empty folders'])
  })
})

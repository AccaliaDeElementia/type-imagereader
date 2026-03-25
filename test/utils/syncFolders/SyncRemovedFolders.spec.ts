'use sanity'

import { expect } from 'chai'
import { Functions } from '../../../utils/syncfolders'
import Sinon from 'sinon'
import { Cast, StubToKnex } from '../../../testutils/TypeGuards'
import type { Debugger } from 'debug'

describe('utils/syncfolders function SyncRemovedFolders()', () => {
  let loggerStub = Sinon.stub()
  let loggerFake = Cast<Debugger>(loggerStub)
  let knexInnerInstanceStub = {
    select: Sinon.stub().returnsThis(),
    from: Sinon.stub().returnsThis(),
    whereRaw: Sinon.stub().returnsThis(),
    catch: Sinon.stub(),
  }
  let knexInstanceStub = {
    whereNotExists: Sinon.stub().returnsThis(),
    delete: Sinon.stub().resolves(0),
    catch: Sinon.stub(),
  }
  let knexFnStub = Sinon.stub().returns(knexInstanceStub)
  let knexFnFake = StubToKnex(knexFnStub)
  beforeEach(() => {
    loggerStub = Sinon.stub()
    loggerFake = Cast<Debugger>(loggerStub)
    knexInnerInstanceStub = {
      select: Sinon.stub().returnsThis(),
      from: Sinon.stub().returnsThis(),
      whereRaw: Sinon.stub().returnsThis(),
      catch: Sinon.stub(),
    }
    knexInstanceStub = {
      whereNotExists: Sinon.stub().returnsThis(),
      delete: Sinon.stub().resolves(0),
      catch: Sinon.stub(),
    }
    knexFnStub = Sinon.stub().returns(knexInstanceStub)
    knexFnFake = StubToKnex(knexFnStub)
  })
  it("should call knex with 'folders' table", async () => {
    await Functions.SyncRemovedFolders(loggerFake, knexFnFake)
    expect(knexFnStub.calledWith('folders')).to.equal(true)
  })
  it('should call knex once', async () => {
    await Functions.SyncRemovedFolders(loggerFake, knexFnFake)
    expect(knexFnStub.callCount).to.equal(1)
  })
  it('should call knex before whereNotExists', async () => {
    await Functions.SyncRemovedFolders(loggerFake, knexFnFake)
    expect(knexFnStub.calledImmediatelyBefore(knexInstanceStub.whereNotExists)).to.equal(true)
  })
  it('should call delete once', async () => {
    await Functions.SyncRemovedFolders(loggerFake, knexFnFake)
    expect(knexInstanceStub.delete.callCount).to.equal(1)
  })
  it('should call delete with no arguments', async () => {
    await Functions.SyncRemovedFolders(loggerFake, knexFnFake)
    expect(knexInstanceStub.delete.firstCall.args).to.deep.equal([])
  })
  it('should log once when records are removed', async () => {
    knexInstanceStub.delete.resolves(1023)
    await Functions.SyncRemovedFolders(loggerFake, knexFnFake)
    expect(loggerStub.callCount).to.equal(1)
  })
  it('should log removed count when records are removed', async () => {
    knexInstanceStub.delete.resolves(1023)
    await Functions.SyncRemovedFolders(loggerFake, knexFnFake)
    expect(loggerStub.firstCall.args).to.deep.equal(['Removed 1023 missing folders'])
  })
  it('should log once when no folders are removed', async () => {
    knexInstanceStub.delete.resolves(0)
    await Functions.SyncRemovedFolders(loggerFake, knexFnFake)
    expect(loggerStub.callCount).to.equal(1)
  })
  it('should log zero count when no folders are removed', async () => {
    knexInstanceStub.delete.resolves(0)
    await Functions.SyncRemovedFolders(loggerFake, knexFnFake)
    expect(loggerStub.firstCall.args).to.deep.equal(['Removed 0 missing folders'])
  })
  it('should call select once in inner query', async () => {
    await Functions.SyncRemovedFolders(loggerFake, knexFnFake)
    const fn = Cast<(this: unknown) => void>(knexInstanceStub.whereNotExists.firstCall.args[0])
    fn.apply(knexInnerInstanceStub)
    expect(knexInnerInstanceStub.select.callCount).to.equal(1)
  })
  it("should call select with '*' in inner query", async () => {
    await Functions.SyncRemovedFolders(loggerFake, knexFnFake)
    const fn = Cast<(this: unknown) => void>(knexInstanceStub.whereNotExists.firstCall.args[0])
    fn.apply(knexInnerInstanceStub)
    expect(knexInnerInstanceStub.select.firstCall.args).to.deep.equal(['*'])
  })
  it('should call select before from in inner query', async () => {
    await Functions.SyncRemovedFolders(loggerFake, knexFnFake)
    const fn = Cast<(this: unknown) => void>(knexInstanceStub.whereNotExists.firstCall.args[0])
    fn.apply(knexInnerInstanceStub)
    expect(knexInnerInstanceStub.select.calledImmediatelyBefore(knexInnerInstanceStub.from)).to.equal(true)
  })
  it('should call from once in inner query', async () => {
    await Functions.SyncRemovedFolders(loggerFake, knexFnFake)
    const fn = Cast<(this: unknown) => void>(knexInstanceStub.whereNotExists.firstCall.args[0])
    fn.apply(knexInnerInstanceStub)
    expect(knexInnerInstanceStub.from.callCount).to.equal(1)
  })
  it("should call from with 'syncitems' in inner query", async () => {
    await Functions.SyncRemovedFolders(loggerFake, knexFnFake)
    const fn = Cast<(this: unknown) => void>(knexInstanceStub.whereNotExists.firstCall.args[0])
    fn.apply(knexInnerInstanceStub)
    expect(knexInnerInstanceStub.from.firstCall.args).to.deep.equal(['syncitems'])
  })
  it('should call from before whereRaw in inner query', async () => {
    await Functions.SyncRemovedFolders(loggerFake, knexFnFake)
    const fn = Cast<(this: unknown) => void>(knexInstanceStub.whereNotExists.firstCall.args[0])
    fn.apply(knexInnerInstanceStub)
    expect(knexInnerInstanceStub.from.calledImmediatelyBefore(knexInnerInstanceStub.whereRaw)).to.equal(true)
  })
  it('should call whereRaw once in inner query', async () => {
    await Functions.SyncRemovedFolders(loggerFake, knexFnFake)
    const fn = Cast<(this: unknown) => void>(knexInstanceStub.whereNotExists.firstCall.args[0])
    fn.apply(knexInnerInstanceStub)
    expect(knexInnerInstanceStub.whereRaw.callCount).to.equal(1)
  })
  it('should call whereRaw with correct condition in inner query', async () => {
    await Functions.SyncRemovedFolders(loggerFake, knexFnFake)
    const fn = Cast<(this: unknown) => void>(knexInstanceStub.whereNotExists.firstCall.args[0])
    fn.apply(knexInnerInstanceStub)
    expect(knexInnerInstanceStub.whereRaw.firstCall.args).to.deep.equal(['syncitems.path = folders.path'])
  })
})

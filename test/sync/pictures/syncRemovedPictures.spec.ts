'use sanity'

import { syncRemovedPictures } from '#sync/pictures.js'
import Sinon from 'sinon'
import { cast, stubToKnex } from '#testutils/typeGuards.js'
import { createLoggerFake } from '#testutils/debug.js'

const sandbox = Sinon.createSandbox()

describe('sync/pictures syncRemovedPictures()', () => {
  let { stub: loggerStub, fake: loggerFake } = createLoggerFake(sandbox)
  let knexInnerInstanceStub = {
    select: sandbox.stub().returnsThis(),
    from: sandbox.stub().returnsThis(),
    whereRaw: sandbox.stub().returnsThis(),
    catch: sandbox.stub(),
  }
  let knexInstanceStub = {
    whereNotExists: sandbox.stub().returnsThis(),
    delete: sandbox.stub().resolves(0),
    catch: sandbox.stub(),
  }
  let knexFnStub = sandbox.stub().returns(knexInstanceStub)
  let knexFnFake = stubToKnex(knexFnStub)
  beforeEach(() => {
    ;({ stub: loggerStub, fake: loggerFake } = createLoggerFake(sandbox))
    knexInnerInstanceStub = {
      select: sandbox.stub().returnsThis(),
      from: sandbox.stub().returnsThis(),
      whereRaw: sandbox.stub().returnsThis(),
      catch: sandbox.stub(),
    }
    knexInstanceStub = {
      whereNotExists: sandbox.stub().returnsThis(),
      delete: sandbox.stub().resolves(0),
      catch: sandbox.stub(),
    }
    knexFnStub = sandbox.stub().returns(knexInstanceStub)
    knexFnFake = stubToKnex(knexFnStub)
  })
  afterEach(() => {
    sandbox.restore()
  })
  it("should call knex with 'pictures' table", async () => {
    await syncRemovedPictures(loggerFake, knexFnFake)
    expect(knexFnStub.calledWith('pictures')).toBe(true)
  })
  it('should call knex once', async () => {
    await syncRemovedPictures(loggerFake, knexFnFake)
    expect(knexFnStub.callCount).toBe(1)
  })
  it('should call knex before whereNotExists', async () => {
    await syncRemovedPictures(loggerFake, knexFnFake)
    expect(knexFnStub.calledImmediatelyBefore(knexInstanceStub.whereNotExists)).toBe(true)
  })
  it('should call delete once', async () => {
    await syncRemovedPictures(loggerFake, knexFnFake)
    expect(knexInstanceStub.delete.callCount).toBe(1)
  })
  it('should call delete with no arguments', async () => {
    await syncRemovedPictures(loggerFake, knexFnFake)
    expect(knexInstanceStub.delete.firstCall.args).toEqual([])
  })
  it('should log once when records are removed', async () => {
    knexInstanceStub.delete.returns(1023)
    await syncRemovedPictures(loggerFake, knexFnFake)
    expect(loggerStub.callCount).toBe(1)
  })
  it('should log removed count when records are removed', async () => {
    knexInstanceStub.delete.returns(1023)
    await syncRemovedPictures(loggerFake, knexFnFake)
    expect(loggerStub.firstCall.args[0]).toBe('Removed 1023 missing pictures')
  })
  it('should call select once in inner query', async () => {
    await syncRemovedPictures(loggerFake, knexFnFake)
    const fn = cast<(this: unknown) => void>(knexInstanceStub.whereNotExists.firstCall.args[0])
    fn.apply(knexInnerInstanceStub)
    expect(knexInnerInstanceStub.select.callCount).toBe(1)
  })
  it("should call select with '*' in inner query", async () => {
    await syncRemovedPictures(loggerFake, knexFnFake)
    const fn = cast<(this: unknown) => void>(knexInstanceStub.whereNotExists.firstCall.args[0])
    fn.apply(knexInnerInstanceStub)
    expect(knexInnerInstanceStub.select.firstCall.args).toEqual(['*'])
  })
  it('should call select before from in inner query', async () => {
    await syncRemovedPictures(loggerFake, knexFnFake)
    const fn = cast<(this: unknown) => void>(knexInstanceStub.whereNotExists.firstCall.args[0])
    fn.apply(knexInnerInstanceStub)
    expect(knexInnerInstanceStub.select.calledImmediatelyBefore(knexInnerInstanceStub.from)).toBe(true)
  })
  it('should call from once in inner query', async () => {
    await syncRemovedPictures(loggerFake, knexFnFake)
    const fn = cast<(this: unknown) => void>(knexInstanceStub.whereNotExists.firstCall.args[0])
    fn.apply(knexInnerInstanceStub)
    expect(knexInnerInstanceStub.from.callCount).toBe(1)
  })
  it("should call from with 'syncitems' in inner query", async () => {
    await syncRemovedPictures(loggerFake, knexFnFake)
    const fn = cast<(this: unknown) => void>(knexInstanceStub.whereNotExists.firstCall.args[0])
    fn.apply(knexInnerInstanceStub)
    expect(knexInnerInstanceStub.from.firstCall.args).toEqual(['syncitems'])
  })
  it('should call from before whereRaw in inner query', async () => {
    await syncRemovedPictures(loggerFake, knexFnFake)
    const fn = cast<(this: unknown) => void>(knexInstanceStub.whereNotExists.firstCall.args[0])
    fn.apply(knexInnerInstanceStub)
    expect(knexInnerInstanceStub.from.calledImmediatelyBefore(knexInnerInstanceStub.whereRaw)).toBe(true)
  })
  it('should call whereRaw once in inner query', async () => {
    await syncRemovedPictures(loggerFake, knexFnFake)
    const fn = cast<(this: unknown) => void>(knexInstanceStub.whereNotExists.firstCall.args[0])
    fn.apply(knexInnerInstanceStub)
    expect(knexInnerInstanceStub.whereRaw.callCount).toBe(1)
  })
  it('should call whereRaw with correct condition in inner query', async () => {
    await syncRemovedPictures(loggerFake, knexFnFake)
    const fn = cast<(this: unknown) => void>(knexInstanceStub.whereNotExists.firstCall.args[0])
    fn.apply(knexInnerInstanceStub)
    expect(knexInnerInstanceStub.whereRaw.firstCall.args).toEqual(['syncitems.path = pictures.path'])
  })
})

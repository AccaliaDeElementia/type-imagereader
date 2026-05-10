'use sanity'

import { syncMissingCoverImages } from '#sync/folders.js'
import Sinon from 'sinon'
import { cast, stubToKnex } from '#testutils/typeGuards.js'
import { createLoggerFake } from '#testutils/debug.js'

const sandbox = Sinon.createSandbox()

describe('sync/folders syncMissingCoverImages()', () => {
  let { stub: loggerStub, fake: loggerFake } = createLoggerFake(sandbox)
  let knexInnerInstanceStub = {
    select: sandbox.stub().returnsThis(),
    from: sandbox.stub().returnsThis(),
    whereRaw: sandbox.stub().returnsThis(),
    catch: sandbox.stub(),
  }
  let knexInstanceStub = {
    whereNotExists: sandbox.stub().returnsThis(),
    whereRaw: sandbox.stub().returnsThis(),
    update: sandbox.stub().resolves(0),
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
      whereRaw: sandbox.stub().returnsThis(),
      update: sandbox.stub().resolves(0),
      catch: sandbox.stub(),
    }
    knexFnStub = sandbox.stub().returns(knexInstanceStub)
    knexFnFake = stubToKnex(knexFnStub)
  })
  afterEach(() => {
    sandbox.restore()
  })
  it("should call knex with 'folders' table", async () => {
    await syncMissingCoverImages(loggerFake, knexFnFake)
    expect(knexFnStub.firstCall.args).toEqual(['folders'])
  })
  it('should call knex once', async () => {
    await syncMissingCoverImages(loggerFake, knexFnFake)
    expect(knexFnStub.callCount).toBe(1)
  })
  it('should call update once', async () => {
    await syncMissingCoverImages(loggerFake, knexFnFake)
    expect(knexInstanceStub.update.callCount).toBe(1)
  })
  it('should call update clearing current image', async () => {
    await syncMissingCoverImages(loggerFake, knexFnFake)
    expect(knexInstanceStub.update.firstCall.args).toEqual([{ current: '' }])
  })
  it('should call whereNotExists once in outer query', async () => {
    await syncMissingCoverImages(loggerFake, knexFnFake)
    expect(knexInstanceStub.whereNotExists.callCount).toBe(1)
  })
  it('should call select once in inner query', async () => {
    await syncMissingCoverImages(loggerFake, knexFnFake)
    const fn = cast<(this: unknown) => void>(knexInstanceStub.whereNotExists.firstCall.args[0])
    fn.apply(knexInnerInstanceStub)
    expect(knexInnerInstanceStub.select.callCount).toBe(1)
  })
  it("should call select with '*' in inner query", async () => {
    await syncMissingCoverImages(loggerFake, knexFnFake)
    const fn = cast<(this: unknown) => void>(knexInstanceStub.whereNotExists.firstCall.args[0])
    fn.apply(knexInnerInstanceStub)
    expect(knexInnerInstanceStub.select.firstCall.args).toEqual(['*'])
  })
  it('should call from once in inner query', async () => {
    await syncMissingCoverImages(loggerFake, knexFnFake)
    const fn = cast<(this: unknown) => void>(knexInstanceStub.whereNotExists.firstCall.args[0])
    fn.apply(knexInnerInstanceStub)
    expect(knexInnerInstanceStub.from.callCount).toBe(1)
  })
  it("should call from with 'pictures' in inner query", async () => {
    await syncMissingCoverImages(loggerFake, knexFnFake)
    const fn = cast<(this: unknown) => void>(knexInstanceStub.whereNotExists.firstCall.args[0])
    fn.apply(knexInnerInstanceStub)
    expect(knexInnerInstanceStub.from.firstCall.args).toEqual(['pictures'])
  })
  it('should call whereRaw once in inner query', async () => {
    await syncMissingCoverImages(loggerFake, knexFnFake)
    const fn = cast<(this: unknown) => void>(knexInstanceStub.whereNotExists.firstCall.args[0])
    fn.apply(knexInnerInstanceStub)
    expect(knexInnerInstanceStub.whereRaw.callCount).toBe(1)
  })
  it('should call whereRaw with correct condition in inner query', async () => {
    await syncMissingCoverImages(loggerFake, knexFnFake)
    const fn = cast<(this: unknown) => void>(knexInstanceStub.whereNotExists.firstCall.args[0])
    fn.apply(knexInnerInstanceStub)
    expect(knexInnerInstanceStub.whereRaw.firstCall.args).toEqual(['pictures.path = folders.current'])
  })
  it('should call outer whereRaw once', async () => {
    await syncMissingCoverImages(loggerFake, knexFnFake)
    expect(knexInstanceStub.whereRaw.callCount).toBe(1)
  })
  it('should call outer whereRaw to filter folders with a cover image set', async () => {
    await syncMissingCoverImages(loggerFake, knexFnFake)
    expect(knexInstanceStub.whereRaw.firstCall.args).toEqual(["folders.current <> ''"])
  })
  it('should log once when cover images are removed', async () => {
    knexInstanceStub.update.resolves(99)
    await syncMissingCoverImages(loggerFake, knexFnFake)
    expect(loggerStub.callCount).toBe(1)
  })
  it('should log removed count when cover images are removed', async () => {
    knexInstanceStub.update.resolves(99)
    await syncMissingCoverImages(loggerFake, knexFnFake)
    expect(loggerStub.firstCall.args).toEqual(['Removed 99 missing cover images'])
  })
  it('should log once when no cover images are removed', async () => {
    knexInstanceStub.update.resolves(0)
    await syncMissingCoverImages(loggerFake, knexFnFake)
    expect(loggerStub.callCount).toBe(1)
  })
  it('should log zero count when no cover images are removed', async () => {
    knexInstanceStub.update.resolves(0)
    await syncMissingCoverImages(loggerFake, knexFnFake)
    expect(loggerStub.firstCall.args).toEqual(['Removed 0 missing cover images'])
  })
})

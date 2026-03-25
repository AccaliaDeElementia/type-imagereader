'use sanity'

import { expect } from 'chai'
import { Functions } from '#utils/syncfolders'
import Sinon from 'sinon'
import { Cast, StubToKnex } from '#testutils/TypeGuards'
import type { Debugger } from 'debug'

describe('utils/syncfolders function SyncMissingCoverImages()', () => {
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
    whereRaw: Sinon.stub().returnsThis(),
    update: Sinon.stub().resolves(0),
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
      whereRaw: Sinon.stub().returnsThis(),
      update: Sinon.stub().resolves(0),
      catch: Sinon.stub(),
    }
    knexFnStub = Sinon.stub().returns(knexInstanceStub)
    knexFnFake = StubToKnex(knexFnStub)
  })
  it("should call knex with 'folders' table", async () => {
    await Functions.SyncMissingCoverImages(loggerFake, knexFnFake)
    expect(knexFnStub.firstCall.args).to.deep.equal(['folders'])
  })
  it('should call knex once', async () => {
    await Functions.SyncMissingCoverImages(loggerFake, knexFnFake)
    expect(knexFnStub.callCount).to.equal(1)
  })
  it('should call update once', async () => {
    await Functions.SyncMissingCoverImages(loggerFake, knexFnFake)
    expect(knexInstanceStub.update.callCount).to.equal(1)
  })
  it('should call update clearing current image', async () => {
    await Functions.SyncMissingCoverImages(loggerFake, knexFnFake)
    expect(knexInstanceStub.update.firstCall.args).to.deep.equal([{ current: '' }])
  })
  it('should call whereNotExists once in outer query', async () => {
    await Functions.SyncMissingCoverImages(loggerFake, knexFnFake)
    expect(knexInstanceStub.whereNotExists.callCount).to.equal(1)
  })
  it('should call select once in inner query', async () => {
    await Functions.SyncMissingCoverImages(loggerFake, knexFnFake)
    const fn = Cast<(this: unknown) => void>(knexInstanceStub.whereNotExists.firstCall.args[0])
    fn.apply(knexInnerInstanceStub)
    expect(knexInnerInstanceStub.select.callCount).to.equal(1)
  })
  it("should call select with '*' in inner query", async () => {
    await Functions.SyncMissingCoverImages(loggerFake, knexFnFake)
    const fn = Cast<(this: unknown) => void>(knexInstanceStub.whereNotExists.firstCall.args[0])
    fn.apply(knexInnerInstanceStub)
    expect(knexInnerInstanceStub.select.firstCall.args).to.deep.equal(['*'])
  })
  it('should call from once in inner query', async () => {
    await Functions.SyncMissingCoverImages(loggerFake, knexFnFake)
    const fn = Cast<(this: unknown) => void>(knexInstanceStub.whereNotExists.firstCall.args[0])
    fn.apply(knexInnerInstanceStub)
    expect(knexInnerInstanceStub.from.callCount).to.equal(1)
  })
  it("should call from with 'pictures' in inner query", async () => {
    await Functions.SyncMissingCoverImages(loggerFake, knexFnFake)
    const fn = Cast<(this: unknown) => void>(knexInstanceStub.whereNotExists.firstCall.args[0])
    fn.apply(knexInnerInstanceStub)
    expect(knexInnerInstanceStub.from.firstCall.args).to.deep.equal(['pictures'])
  })
  it('should call whereRaw once in inner query', async () => {
    await Functions.SyncMissingCoverImages(loggerFake, knexFnFake)
    const fn = Cast<(this: unknown) => void>(knexInstanceStub.whereNotExists.firstCall.args[0])
    fn.apply(knexInnerInstanceStub)
    expect(knexInnerInstanceStub.whereRaw.callCount).to.equal(1)
  })
  it('should call whereRaw with correct condition in inner query', async () => {
    await Functions.SyncMissingCoverImages(loggerFake, knexFnFake)
    const fn = Cast<(this: unknown) => void>(knexInstanceStub.whereNotExists.firstCall.args[0])
    fn.apply(knexInnerInstanceStub)
    expect(knexInnerInstanceStub.whereRaw.firstCall.args).to.deep.equal(['pictures.path = folders.current'])
  })
  it('should call outer whereRaw once', async () => {
    await Functions.SyncMissingCoverImages(loggerFake, knexFnFake)
    expect(knexInstanceStub.whereRaw.callCount).to.equal(1)
  })
  it('should call outer whereRaw to filter folders with a cover image set', async () => {
    await Functions.SyncMissingCoverImages(loggerFake, knexFnFake)
    expect(knexInstanceStub.whereRaw.firstCall.args).to.deep.equal(["folders.current <> ''"])
  })
  it('should log once when cover images are removed', async () => {
    knexInstanceStub.update.resolves(99)
    await Functions.SyncMissingCoverImages(loggerFake, knexFnFake)
    expect(loggerStub.callCount).to.equal(1)
  })
  it('should log removed count when cover images are removed', async () => {
    knexInstanceStub.update.resolves(99)
    await Functions.SyncMissingCoverImages(loggerFake, knexFnFake)
    expect(loggerStub.firstCall.args).to.deep.equal(['Removed 99 missing cover images'])
  })
  it('should log once when no cover images are removed', async () => {
    knexInstanceStub.update.resolves(0)
    await Functions.SyncMissingCoverImages(loggerFake, knexFnFake)
    expect(loggerStub.callCount).to.equal(1)
  })
  it('should log zero count when no cover images are removed', async () => {
    knexInstanceStub.update.resolves(0)
    await Functions.SyncMissingCoverImages(loggerFake, knexFnFake)
    expect(loggerStub.firstCall.args).to.deep.equal(['Removed 0 missing cover images'])
  })
})

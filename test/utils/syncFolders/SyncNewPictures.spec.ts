'use sanity'

import { expect } from 'chai'
import { Functions } from '#utils/syncfolders'
import Sinon from 'sinon'
import { Cast, StubToKnex } from '#testutils/TypeGuards'
import type { Debugger } from 'debug'

describe('utils/syncfolders function SyncNewPictures()', () => {
  let loggerStub = Sinon.stub()
  let loggerFake = Cast<Debugger>(loggerStub)
  let knexInnerInstanceStub = {
    select: Sinon.stub().returnsThis(),
    from: Sinon.stub().returnsThis(),
    leftJoin: Sinon.stub().returnsThis(),
    andWhere: Sinon.stub().returnsThis(),
    catch: Sinon.stub(),
  }
  let knexInstanceStub = {
    raw: Sinon.stub(),
    from: Sinon.stub().returnsThis(),
    insert: Sinon.stub().resolves([0]),
    catch: Sinon.stub(),
  }
  let knexFnFake = StubToKnex(knexInstanceStub)
  beforeEach(() => {
    loggerStub = Sinon.stub()
    loggerFake = Cast<Debugger>(loggerStub)
    knexInnerInstanceStub = {
      select: Sinon.stub().returnsThis(),
      from: Sinon.stub().returnsThis(),
      leftJoin: Sinon.stub().returnsThis(),
      andWhere: Sinon.stub().returnsThis(),
      catch: Sinon.stub(),
    }
    knexInstanceStub = {
      raw: Sinon.stub(),
      from: Sinon.stub().returnsThis(),
      insert: Sinon.stub().resolves([0]),
      catch: Sinon.stub(),
    }
    knexFnFake = StubToKnex(knexInstanceStub)
  })
  it('should call raw once for pictures table', async () => {
    await Functions.SyncNewPictures(loggerFake, knexFnFake)
    expect(knexInstanceStub.raw.callCount).to.equal(1)
  })
  it('should call raw with expected template for pictures table', async () => {
    await Functions.SyncNewPictures(loggerFake, knexFnFake)
    expect(knexInstanceStub.raw.firstCall.args[0]).to.equal('?? (??, ??, ??, ??)')
  })
  it('should call raw with expected column names for pictures table', async () => {
    await Functions.SyncNewPictures(loggerFake, knexFnFake)
    expect(knexInstanceStub.raw.firstCall.args[1]).to.deep.equal(['pictures', 'folder', 'path', 'sortKey', 'pathHash'])
  })
  it('should call from after raw for pictures table', async () => {
    const rawQuery = { a: 'flapjacks for breakfast' }
    knexInstanceStub.raw.returns(rawQuery)
    await Functions.SyncNewPictures(loggerFake, knexFnFake)
    expect(knexInstanceStub.from.calledAfter(knexInstanceStub.raw)).to.equal(true)
  })
  it('should call from with raw result for pictures table', async () => {
    const rawQuery = { a: 'flapjacks for breakfast' }
    knexInstanceStub.raw.returns(rawQuery)
    await Functions.SyncNewPictures(loggerFake, knexFnFake)
    expect(knexInstanceStub.from.calledWith(rawQuery)).to.equal(true)
  })
  it('should log once with sqlite return style', async () => {
    knexInstanceStub.insert.resolves([65536])
    await Functions.SyncNewPictures(loggerFake, knexFnFake)
    expect(loggerStub.callCount).to.equal(1)
  })
  it('should log results with sqlite return style', async () => {
    knexInstanceStub.insert.resolves([65536])
    await Functions.SyncNewPictures(loggerFake, knexFnFake)
    expect(loggerStub.firstCall.args[0]).to.equal('Added 65536 new pictures')
  })
  it('should log once with postgresql return style', async () => {
    knexInstanceStub.insert.resolves({ rowCount: 256 })
    await Functions.SyncNewPictures(loggerFake, knexFnFake)
    expect(loggerStub.callCount).to.equal(1)
  })
  it('should log results with postgresql return style', async () => {
    knexInstanceStub.insert.resolves({ rowCount: 256 })
    await Functions.SyncNewPictures(loggerFake, knexFnFake)
    expect(loggerStub.firstCall.args[0]).to.equal('Added 256 new pictures')
  })
  it('should log 0 new pictures with empty array return style', async () => {
    knexInstanceStub.insert.resolves([])
    await Functions.SyncNewPictures(loggerFake, knexFnFake)
    expect(loggerStub.firstCall.args[0]).to.equal('Added 0 new pictures')
  })
  it('should log 0 new pictures with undefined return style', async () => {
    knexInstanceStub.insert.resolves(undefined)
    await Functions.SyncNewPictures(loggerFake, knexFnFake)
    expect(loggerStub.firstCall.args[0]).to.equal('Added 0 new pictures')
  })
  it('should call select once within insert subquery', async () => {
    await Functions.SyncNewPictures(loggerFake, knexFnFake)
    const fn = Cast<(this: unknown) => void>(knexInstanceStub.insert.firstCall.args[0])
    fn.apply(knexInnerInstanceStub)
    expect(knexInnerInstanceStub.select.callCount).to.equal(1)
  })
  it('should call select with expected columns within insert subquery', async () => {
    await Functions.SyncNewPictures(loggerFake, knexFnFake)
    const fn = Cast<(this: unknown) => void>(knexInstanceStub.insert.firstCall.args[0])
    fn.apply(knexInnerInstanceStub)
    expect(knexInnerInstanceStub.select.firstCall.args[0]).to.deep.equal([
      'syncitems.folder',
      'syncitems.path',
      'syncitems.sortKey',
      'syncitems.pathHash',
    ])
  })
  it('should call select before from within insert subquery', async () => {
    await Functions.SyncNewPictures(loggerFake, knexFnFake)
    const fn = Cast<(this: unknown) => void>(knexInstanceStub.insert.firstCall.args[0])
    fn.apply(knexInnerInstanceStub)
    expect(knexInnerInstanceStub.select.calledBefore(knexInnerInstanceStub.from)).to.equal(true)
  })
  it('should call from with syncitems within insert subquery', async () => {
    await Functions.SyncNewPictures(loggerFake, knexFnFake)
    const fn = Cast<(this: unknown) => void>(knexInstanceStub.insert.firstCall.args[0])
    fn.apply(knexInnerInstanceStub)
    expect(knexInnerInstanceStub.from.calledWith('syncitems')).to.equal(true)
  })
  it('should call leftJoin with expected args within insert subquery', async () => {
    await Functions.SyncNewPictures(loggerFake, knexFnFake)
    const fn = Cast<(this: unknown) => void>(knexInstanceStub.insert.firstCall.args[0])
    fn.apply(knexInnerInstanceStub)
    expect(knexInnerInstanceStub.leftJoin.firstCall.args).to.deep.equal(['pictures', 'pictures.path', 'syncitems.path'])
  })
  it('should call andWhere with expected conditions within insert subquery', async () => {
    await Functions.SyncNewPictures(loggerFake, knexFnFake)
    const fn = Cast<(this: unknown) => void>(knexInstanceStub.insert.firstCall.args[0])
    fn.apply(knexInnerInstanceStub)
    expect(knexInnerInstanceStub.andWhere.firstCall.args[0]).to.deep.equal({
      'syncitems.isFile': true,
      'pictures.path': null,
    })
  })
})

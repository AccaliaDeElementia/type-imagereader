'use sanity'

import { expect } from 'chai'
import { SyncNewFolders } from '#sync/folders.js'
import Sinon from 'sinon'
import { cast, stubToKnex } from '#testutils/TypeGuards.js'
import { createLoggerFake } from '#testutils/Debug.js'

const sandbox = Sinon.createSandbox()

describe('sync/folders SyncNewFolders()', () => {
  let { stub: loggerStub, fake: loggerFake } = createLoggerFake(sandbox)
  let knexInnerInstanceStub = {
    select: sandbox.stub().returnsThis(),
    from: sandbox.stub().returnsThis(),
    leftJoin: sandbox.stub().returnsThis(),
    andWhere: sandbox.stub().returnsThis(),
    catch: sandbox.stub(),
  }
  let knexInstanceStub = {
    raw: sandbox.stub(),
    from: sandbox.stub().returnsThis(),
    insert: sandbox.stub().resolves([0]),
    catch: sandbox.stub(),
  }
  let knexFnFake = stubToKnex(knexInstanceStub)
  beforeEach(() => {
    ;({ stub: loggerStub, fake: loggerFake } = createLoggerFake(sandbox))
    knexInnerInstanceStub = {
      select: sandbox.stub().returnsThis(),
      from: sandbox.stub().returnsThis(),
      leftJoin: sandbox.stub().returnsThis(),
      andWhere: sandbox.stub().returnsThis(),
      catch: sandbox.stub(),
    }
    knexInstanceStub = {
      raw: sandbox.stub(),
      from: sandbox.stub().returnsThis(),
      insert: sandbox.stub().resolves([0]),
      catch: sandbox.stub(),
    }
    knexFnFake = stubToKnex(knexInstanceStub)
  })
  afterEach(() => {
    sandbox.restore()
  })
  it('should call raw once for folders table', async () => {
    await SyncNewFolders(loggerFake, knexFnFake)
    expect(knexInstanceStub.raw.callCount).to.equal(1)
  })
  it('should call raw with expected template for folders table', async () => {
    await SyncNewFolders(loggerFake, knexFnFake)
    expect(knexInstanceStub.raw.firstCall.args[0]).to.equal('?? (??, ??, ??)')
  })
  it('should call raw with expected column names for folders table', async () => {
    await SyncNewFolders(loggerFake, knexFnFake)
    expect(knexInstanceStub.raw.firstCall.args[1]).to.deep.equal(['folders', 'folder', 'path', 'sortKey'])
  })
  it('should call from after raw for folders table', async () => {
    const rawQuery = { a: 'flapjacks for breakfast' }
    knexInstanceStub.raw.returns(rawQuery)
    await SyncNewFolders(loggerFake, knexFnFake)
    expect(knexInstanceStub.from.calledAfter(knexInstanceStub.raw)).to.equal(true)
  })
  it('should call from with raw result for folders table', async () => {
    const rawQuery = { a: 'flapjacks for breakfast' }
    knexInstanceStub.raw.returns(rawQuery)
    await SyncNewFolders(loggerFake, knexFnFake)
    expect(knexInstanceStub.from.calledWith(rawQuery)).to.equal(true)
  })
  it('should log once with sqlite return style', async () => {
    knexInstanceStub.insert.resolves([65536])
    await SyncNewFolders(loggerFake, knexFnFake)
    expect(loggerStub.callCount).to.equal(1)
  })
  it('should log results with sqlite return style', async () => {
    knexInstanceStub.insert.resolves([65536])
    await SyncNewFolders(loggerFake, knexFnFake)
    expect(loggerStub.firstCall.args[0]).to.equal('Added 65536 new folders')
  })
  it('should log once with postgresql return style', async () => {
    knexInstanceStub.insert.resolves({ rowCount: 256 })
    await SyncNewFolders(loggerFake, knexFnFake)
    expect(loggerStub.callCount).to.equal(1)
  })
  it('should log results with postgresql return style', async () => {
    knexInstanceStub.insert.resolves({ rowCount: 256 })
    await SyncNewFolders(loggerFake, knexFnFake)
    expect(loggerStub.firstCall.args[0]).to.equal('Added 256 new folders')
  })
  it('should log 0 new folders with empty array return style', async () => {
    knexInstanceStub.insert.resolves([])
    await SyncNewFolders(loggerFake, knexFnFake)
    expect(loggerStub.firstCall.args[0]).to.equal('Added 0 new folders')
  })
  it('should log 0 new folders with undefined return style', async () => {
    knexInstanceStub.insert.resolves(undefined)
    await SyncNewFolders(loggerFake, knexFnFake)
    expect(loggerStub.firstCall.args[0]).to.equal('Added 0 new folders')
  })
  it('should call select once within insert subquery', async () => {
    await SyncNewFolders(loggerFake, knexFnFake)
    const fn = cast<(this: unknown) => void>(knexInstanceStub.insert.firstCall.args[0])
    fn.apply(knexInnerInstanceStub)
    expect(knexInnerInstanceStub.select.callCount).to.equal(1)
  })
  it('should call select with expected columns within insert subquery', async () => {
    await SyncNewFolders(loggerFake, knexFnFake)
    const fn = cast<(this: unknown) => void>(knexInstanceStub.insert.firstCall.args[0])
    fn.apply(knexInnerInstanceStub)
    expect(knexInnerInstanceStub.select.firstCall.args[0]).to.deep.equal([
      'syncitems.folder',
      'syncitems.path',
      'syncitems.sortKey',
    ])
  })
  it('should call select before from within insert subquery', async () => {
    await SyncNewFolders(loggerFake, knexFnFake)
    const fn = cast<(this: unknown) => void>(knexInstanceStub.insert.firstCall.args[0])
    fn.apply(knexInnerInstanceStub)
    expect(knexInnerInstanceStub.select.calledBefore(knexInnerInstanceStub.from)).to.equal(true)
  })
  it('should call from with syncitems within insert subquery', async () => {
    await SyncNewFolders(loggerFake, knexFnFake)
    const fn = cast<(this: unknown) => void>(knexInstanceStub.insert.firstCall.args[0])
    fn.apply(knexInnerInstanceStub)
    expect(knexInnerInstanceStub.from.calledWith('syncitems')).to.equal(true)
  })
  it('should call leftJoin with expected args within insert subquery', async () => {
    await SyncNewFolders(loggerFake, knexFnFake)
    const fn = cast<(this: unknown) => void>(knexInstanceStub.insert.firstCall.args[0])
    fn.apply(knexInnerInstanceStub)
    expect(knexInnerInstanceStub.leftJoin.firstCall.args).to.deep.equal(['folders', 'folders.path', 'syncitems.path'])
  })
  it('should call andWhere with expected conditions within insert subquery', async () => {
    await SyncNewFolders(loggerFake, knexFnFake)
    const fn = cast<(this: unknown) => void>(knexInstanceStub.insert.firstCall.args[0])
    fn.apply(knexInnerInstanceStub)
    expect(knexInnerInstanceStub.andWhere.firstCall.args[0]).to.deep.equal({
      'syncitems.isFile': false,
      'folders.path': null,
    })
  })
})

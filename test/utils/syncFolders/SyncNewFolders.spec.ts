'use sanity'

import { expect } from 'chai'
import { Functions } from '../../../utils/syncfolders'
import Sinon from 'sinon'
import { Cast, StubToKnex } from '../../testutils/TypeGuards'
import type { Debugger } from 'debug'

describe('utils/syncfolders function SyncNewFolders()', () => {
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
  it('should select raw from folders table', async () => {
    const rawQuery = { a: 'flapjacks for breakfast' }
    knexInstanceStub.raw.returns(rawQuery)
    await Functions.SyncNewFolders(loggerFake, knexFnFake)
    expect(knexInstanceStub.raw.callCount).to.equal(1)
    expect(knexInstanceStub.raw.firstCall.args[0]).to.equal('?? (??, ??, ??)')
    expect(knexInstanceStub.raw.firstCall.args[1]).to.deep.equal(['folders', 'folder', 'path', 'sortKey'])
    expect(knexInstanceStub.from.calledAfter(knexInstanceStub.raw)).to.equal(true)
    expect(knexInstanceStub.from.calledWith(rawQuery)).to.equal(true)
  })
  it('should log results with sqlite return style', async () => {
    knexInstanceStub.insert.resolves([65536])
    await Functions.SyncNewFolders(loggerFake, knexFnFake)
    expect(loggerStub.callCount).to.equal(1)
    expect(loggerStub.firstCall.args[0]).to.equal('Added 65536 new folders')
  })
  it('should log results with postgresql return style', async () => {
    knexInstanceStub.insert.resolves({ rowCount: 256 })
    await Functions.SyncNewFolders(loggerFake, knexFnFake)
    expect(loggerStub.callCount).to.equal(1)
    expect(loggerStub.firstCall.args[0]).to.equal('Added 256 new folders')
  })
  it('should construct nested select within insert call', async () => {
    await Functions.SyncNewFolders(loggerFake, knexFnFake)
    const fn = Cast<(this: unknown) => void>(knexInstanceStub.insert.firstCall.args[0])
    fn.apply(knexInnerInstanceStub)
    expect(knexInnerInstanceStub.select.callCount).to.equal(1)
    expect(knexInnerInstanceStub.select.firstCall.args[0]).to.deep.equal([
      'syncitems.folder',
      'syncitems.path',
      'syncitems.sortKey',
    ])
    expect(knexInnerInstanceStub.select.calledBefore(knexInnerInstanceStub.from)).to.equal(true)
    expect(knexInnerInstanceStub.from.calledWith('syncitems')).to.equal(true)
    expect(knexInnerInstanceStub.from.calledBefore(knexInnerInstanceStub.leftJoin))
    expect(knexInnerInstanceStub.leftJoin.firstCall.args).to.deep.equal(['folders', 'folders.path', 'syncitems.path'])
    expect(knexInnerInstanceStub.leftJoin.calledBefore(knexInnerInstanceStub.andWhere))
    expect(knexInnerInstanceStub.andWhere.firstCall.args[0]).to.deep.equal({
      'syncitems.isFile': false,
      'folders.path': null,
    })
  })
})

'use sanity'

import { expect } from 'chai'
import { Functions } from '../../../utils/syncfolders'
import Sinon from 'sinon'
import { Cast, StubToKnex } from '../../testutils/TypeGuards'
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
  it('should remove records from folders table', async () => {
    await Functions.SyncRemovedFolders(loggerFake, knexFnFake)
    expect(knexFnStub.callCount).to.equal(1)
    expect(knexFnStub.calledWith('folders')).to.equal(true)
    expect(knexFnStub.calledImmediatelyBefore(knexInstanceStub.whereNotExists)).to.equal(true)
    expect(knexInstanceStub.whereNotExists.calledImmediatelyBefore(knexInstanceStub.delete))
    expect(knexInstanceStub.delete.callCount).to.equal(1)
    expect(knexInstanceStub.delete.firstCall.args).to.deep.equal([])
  })
  it('should log removed records counts', async () => {
    knexInstanceStub.delete.returns(1023)
    await Functions.SyncRemovedFolders(loggerFake, knexFnFake)
    expect(loggerStub.callCount).to.equal(1)
    expect(loggerStub.firstCall.args[0]).to.equal('Removed 1023 missing folders')
  })
  it('should construct inner query to detect removed folders', async () => {
    await Functions.SyncRemovedFolders(loggerFake, knexFnFake)
    const fn = Cast<(this: unknown) => void>(knexInstanceStub.whereNotExists.firstCall.args[0])
    fn.apply(knexInnerInstanceStub)
    expect(knexInnerInstanceStub.select.callCount).to.equal(1)
    expect(knexInnerInstanceStub.select.firstCall.args).to.deep.equal(['*'])
    expect(knexInnerInstanceStub.select.calledImmediatelyBefore(knexInnerInstanceStub.from)).to.equal(true)
    expect(knexInnerInstanceStub.from.callCount).to.equal(1)
    expect(knexInnerInstanceStub.from.firstCall.args).to.deep.equal(['syncitems'])
    expect(knexInnerInstanceStub.from.calledImmediatelyBefore(knexInnerInstanceStub.whereRaw)).to.equal(true)
    expect(knexInnerInstanceStub.whereRaw.callCount).to.equal(1)
    expect(knexInnerInstanceStub.whereRaw.firstCall.args).to.deep.equal(['syncitems.path = folders.path'])
  })
})

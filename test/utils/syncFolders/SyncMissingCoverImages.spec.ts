'use sanity'

import { expect } from 'chai'
import { Functions } from '../../../utils/syncfolders'
import Sinon from 'sinon'
import { Cast, StubToKnex } from '../../testutils/TypeGuards'
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
  it('should operate on folders table', async () => {
    await Functions.SyncMissingCoverImages(loggerFake, knexFnFake)
    expect(knexFnStub.callCount).to.equal(1)
    expect(knexFnStub.firstCall.args).to.deep.equal(['folders'])
  })
  it('should issue an update clearing current image for selected rows', async () => {
    await Functions.SyncMissingCoverImages(loggerFake, knexFnFake)
    expect(knexInstanceStub.update.callCount).to.equal(1)
    expect(knexInstanceStub.update.firstCall.args).to.deep.equal([{ current: '' }])
  })
  it("should only select folders where cover image doesn't exist in the pictures table", async () => {
    await Functions.SyncMissingCoverImages(loggerFake, knexFnFake)
    expect(knexInstanceStub.whereNotExists.callCount).to.equal(1)
    const fn = Cast<(this: unknown) => void>(knexInstanceStub.whereNotExists.firstCall.args[0])
    fn.apply(knexInnerInstanceStub)
    expect(knexInnerInstanceStub.select.callCount).to.equal(1)
    expect(knexInnerInstanceStub.select.firstCall.args).to.deep.equal(['*'])
    expect(knexInnerInstanceStub.from.callCount).to.equal(1)
    expect(knexInnerInstanceStub.from.firstCall.args).to.deep.equal(['pictures'])
    expect(knexInnerInstanceStub.whereRaw.callCount).to.equal(1)
    expect(knexInnerInstanceStub.whereRaw.firstCall.args).to.deep.equal(['pictures.path = folders.current'])
  })
  it('should only operate on folders that have a cover image set', async () => {
    await Functions.SyncMissingCoverImages(loggerFake, knexFnFake)
    expect(knexInstanceStub.whereRaw.callCount).to.equal(1)
    expect(knexInstanceStub.whereRaw.firstCall.args).to.deep.equal(["folders.current <> ''"])
  })
  it('should log number of updated records', async () => {
    knexInstanceStub.update.resolves(99)
    await Functions.SyncMissingCoverImages(loggerFake, knexFnFake)
    expect(loggerStub.callCount).to.equal(1)
    expect(loggerStub.firstCall.args).to.deep.equal(['Removed 99 missing cover images'])
  })
})

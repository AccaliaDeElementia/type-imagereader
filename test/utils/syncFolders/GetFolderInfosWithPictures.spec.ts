'use sanity'

import { expect } from 'chai'
import { Functions } from '../../../utils/syncfolders'
import Sinon from 'sinon'
import { StubToKnex } from '../../testutils/TypeGuards'

describe('utils/syncfolders function GetFolderInfosWithPictures()', () => {
  let knexStub = {
    select: Sinon.stub().returnsThis(),
    count: Sinon.stub().returnsThis(),
    sum: Sinon.stub().returnsThis(),
    groupBy: Sinon.stub().resolves([]),
  }
  let knexFnStub: Sinon.SinonStub & { raw?: Sinon.SinonStub } = Sinon.stub().returns(knexStub)
  let knexFnFake = StubToKnex(knexFnStub)
  beforeEach(() => {
    knexStub = {
      select: Sinon.stub().returnsThis(),
      count: Sinon.stub().returnsThis(),
      sum: Sinon.stub().returnsThis(),
      groupBy: Sinon.stub().resolves([]),
    }
    knexFnStub = Sinon.stub().returns(knexStub)
    knexFnFake = StubToKnex(knexFnStub)
    knexFnStub.raw = Sinon.stub()
  })
  it('should handle empty results gracefully', async () => {
    const result = await Functions.GetFolderInfosWithPictures(knexFnFake)
    expect(result).to.deep.equal([])
  })
  it('should start knex query from pictures', async () => {
    await Functions.GetFolderInfosWithPictures(knexFnFake)
    expect(knexFnStub.callCount).to.equal(1)
    expect(knexFnStub.firstCall.args).to.deep.equal(['pictures'])
  })
  it('should select folder field from pictures', async () => {
    await Functions.GetFolderInfosWithPictures(knexFnFake)
    expect(knexStub.select.callCount).to.equal(1)
    expect(knexStub.select.firstCall.args).to.deep.equal(['folder as path'])
  })
  it('should count star from pictures', async () => {
    await Functions.GetFolderInfosWithPictures(knexFnFake)
    expect(knexStub.count.callCount).to.equal(1)
    expect(knexStub.count.firstCall.args).to.deep.equal(['* as totalCount'])
  })
  it('should sum of read from pictures', async () => {
    const rawQuery = { random: Math.random() }
    knexFnStub.raw?.returns(rawQuery)
    await Functions.GetFolderInfosWithPictures(knexFnFake)
    expect(knexFnStub.raw?.callCount).to.equal(1)
    expect(knexFnStub.raw?.firstCall.args).to.deep.equal(['CASE WHEN seen THEN 1 ELSE 0 END'])
    expect(knexStub.sum.callCount).to.equal(1)
    expect(knexStub.sum.firstCall.args).to.deep.equal([{ seenCount: rawQuery }])
  })
})

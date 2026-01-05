'use sanity'

import { expect } from 'chai'
import { Functions } from '../../../routes/apiFunctions'
import { StubToKnex } from '../../testutils/TypeGuards'
import Sinon from 'sinon'

interface KnexStub {
  where: Sinon.SinonStub
  delete: Sinon.SinonStub
}
const makeKnexInstance = (): KnexStub => ({
  where: Sinon.stub().returnsThis(),
  delete: Sinon.stub().returnsThis(),
})
describe('routes/apiFunctions function RemoveBookmark', () => {
  let knexInstance = makeKnexInstance()
  let knexStub = Sinon.stub()
  let knexFake = StubToKnex(knexStub)
  beforeEach(() => {
    knexInstance = makeKnexInstance()
    knexStub = Sinon.stub().returns(knexInstance)
    knexFake = StubToKnex(knexStub)
  })
  it('should query bookmarks table to remove bookmark', async () => {
    await Functions.RemoveBookmark(knexFake, '/foo/bar/baz.png')
    expect(knexStub.callCount).to.equal(1)
    expect(knexStub.firstCall.args).to.deep.equal(['bookmarks'])
  })
  it('should filter on provided path to remove bookmark', async () => {
    await Functions.RemoveBookmark(knexFake, '/foo/bar/baz.png')
    expect(knexInstance.where.callCount).to.equal(1)
    expect(knexInstance.where.firstCall.args).to.deep.equal([{ path: '/foo/bar/baz.png' }])
  })
  it('should delete matched bookmarks top remoce bookmark', async () => {
    await Functions.RemoveBookmark(knexFake, '/foo/bar/baz.png')
    expect(knexInstance.delete.callCount).to.equal(1)
    expect(knexInstance.delete.firstCall.args).to.deep.equal([])
  })
})

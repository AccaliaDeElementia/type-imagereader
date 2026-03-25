'use sanity'

import { expect } from 'chai'
import { Functions } from '../../../routes/apiFunctions'
import { StubToKnex } from '../../../testutils/TypeGuards'
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
  it('should query bookmarks table once to remove bookmark', async () => {
    await Functions.RemoveBookmark(knexFake, '/foo/bar/baz.png')
    expect(knexStub.callCount).to.equal(1)
  })
  it('should query bookmarks table with expected args to remove bookmark', async () => {
    await Functions.RemoveBookmark(knexFake, '/foo/bar/baz.png')
    expect(knexStub.firstCall.args).to.deep.equal(['bookmarks'])
  })
  it('should filter on provided path once to remove bookmark', async () => {
    await Functions.RemoveBookmark(knexFake, '/foo/bar/baz.png')
    expect(knexInstance.where.callCount).to.equal(1)
  })
  it('should filter on provided path with expected args to remove bookmark', async () => {
    await Functions.RemoveBookmark(knexFake, '/foo/bar/baz.png')
    expect(knexInstance.where.firstCall.args).to.deep.equal([{ path: '/foo/bar/baz.png' }])
  })
  it('should delete matched bookmarks once to remove bookmark', async () => {
    await Functions.RemoveBookmark(knexFake, '/foo/bar/baz.png')
    expect(knexInstance.delete.callCount).to.equal(1)
  })
  it('should delete matched bookmarks with expected args to remove bookmark', async () => {
    await Functions.RemoveBookmark(knexFake, '/foo/bar/baz.png')
    expect(knexInstance.delete.firstCall.args).to.deep.equal([])
  })
})

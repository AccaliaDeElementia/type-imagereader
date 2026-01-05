'use sanity'

import { expect } from 'chai'
import { Functions } from '../../../routes/apiFunctions'
import { StubToKnex } from '../../testutils/TypeGuards'
import Sinon from 'sinon'

interface KnexStub {
  insert: Sinon.SinonStub
  onConflict: Sinon.SinonStub
  ignore: Sinon.SinonStub
}
const makeKnexInstance = (): KnexStub => ({
  insert: Sinon.stub().returnsThis(),
  onConflict: Sinon.stub().returnsThis(),
  ignore: Sinon.stub().returnsThis(),
})
describe('routes/apiFunctions function AddBookmark', () => {
  let knexInstance = makeKnexInstance()
  let knexStub = Sinon.stub()
  let knexFake = StubToKnex(knexStub)
  beforeEach(() => {
    knexInstance = makeKnexInstance()
    knexStub = Sinon.stub().returns(knexInstance)
    knexFake = StubToKnex(knexStub)
  })
  it('should query bookmarks table to set bookmark', async () => {
    await Functions.AddBookmark(knexFake, '/foo/bar/baz.png')
    expect(knexStub.callCount).to.equal(1)
    expect(knexStub.firstCall.args).to.deep.equal(['bookmarks'])
  })
  it('should insert provided path to set bookmark', async () => {
    await Functions.AddBookmark(knexFake, '/foo/bar/baz.png')
    expect(knexInstance.insert.callCount).to.equal(1)
    expect(knexInstance.insert.firstCall.args).to.deep.equal([{ path: '/foo/bar/baz.png' }])
  })
  it('should resolve conflicts when path already exists', async () => {
    await Functions.AddBookmark(knexFake, '/foo/bar/baz.png')
    expect(knexInstance.onConflict.callCount).to.equal(1)
    expect(knexInstance.onConflict.firstCall.args).to.deep.equal(['path'])
  })
  it('should ignore conflicts on insert to set bookmark', async () => {
    await Functions.AddBookmark(knexFake, '/foo/bar/baz.png')
    expect(knexInstance.ignore.callCount).to.equal(1)
    expect(knexInstance.ignore.firstCall.args).to.deep.equal([])
  })
})

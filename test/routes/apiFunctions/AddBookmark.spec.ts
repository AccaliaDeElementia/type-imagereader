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
  it('should query bookmarks table once to set bookmark', async () => {
    await Functions.AddBookmark(knexFake, '/foo/bar/baz.png')
    expect(knexStub.callCount).to.equal(1)
  })
  it('should query bookmarks table with expected args to set bookmark', async () => {
    await Functions.AddBookmark(knexFake, '/foo/bar/baz.png')
    expect(knexStub.firstCall.args).to.deep.equal(['bookmarks'])
  })
  it('should insert provided path once to set bookmark', async () => {
    await Functions.AddBookmark(knexFake, '/foo/bar/baz.png')
    expect(knexInstance.insert.callCount).to.equal(1)
  })
  it('should insert provided path with expected args to set bookmark', async () => {
    await Functions.AddBookmark(knexFake, '/foo/bar/baz.png')
    expect(knexInstance.insert.firstCall.args).to.deep.equal([{ path: '/foo/bar/baz.png' }])
  })
  it('should resolve conflicts once when path already exists', async () => {
    await Functions.AddBookmark(knexFake, '/foo/bar/baz.png')
    expect(knexInstance.onConflict.callCount).to.equal(1)
  })
  it('should resolve conflicts with expected args when path already exists', async () => {
    await Functions.AddBookmark(knexFake, '/foo/bar/baz.png')
    expect(knexInstance.onConflict.firstCall.args).to.deep.equal(['path'])
  })
  it('should ignore conflicts once on insert to set bookmark', async () => {
    await Functions.AddBookmark(knexFake, '/foo/bar/baz.png')
    expect(knexInstance.ignore.callCount).to.equal(1)
  })
  it('should ignore conflicts with expected args on insert to set bookmark', async () => {
    await Functions.AddBookmark(knexFake, '/foo/bar/baz.png')
    expect(knexInstance.ignore.firstCall.args).to.deep.equal([])
  })
})

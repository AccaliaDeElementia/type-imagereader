'use sanity'

import { expect } from 'chai'
import { Functions, Imports } from '#utils/incrementalsync'
import Sinon from 'sinon'
import { Cast, StubToKnex } from '#testutils/TypeGuards'
import type { Debugger } from 'debug'

const sandbox = Sinon.createSandbox()

describe('utils/syncfolders function IncrementalRemovePicture()', () => {
  let knexFnStub = Sinon.stub()
  let picturesStub = { where: Sinon.stub().returnsThis(), delete: Sinon.stub().resolves(1) }
  let bookmarksStub = { where: Sinon.stub().returnsThis(), delete: Sinon.stub().resolves(0) }
  let knexFnFake = StubToKnex(knexFnStub)

  beforeEach(() => {
    sandbox.stub(Imports, 'debug').returns(Cast<Debugger>(Sinon.stub()))
    picturesStub = { where: Sinon.stub().returnsThis(), delete: Sinon.stub().resolves(1) }
    bookmarksStub = { where: Sinon.stub().returnsThis(), delete: Sinon.stub().resolves(0) }
    knexFnStub = Sinon.stub()
    knexFnStub.withArgs('pictures').returns(picturesStub)
    knexFnStub.withArgs('bookmarks').returns(bookmarksStub)
    knexFnFake = StubToKnex(knexFnStub)
  })

  afterEach(() => {
    sandbox.restore()
  })

  it('should query pictures by path', async () => {
    await Functions.IncrementalRemovePicture(knexFnFake, '/comics/page.jpg')
    expect(picturesStub.where.calledWith({ path: '/comics/page.jpg' })).to.equal(true)
  })

  it('should call delete on pictures', async () => {
    await Functions.IncrementalRemovePicture(knexFnFake, '/comics/page.jpg')
    expect(picturesStub.delete.callCount).to.equal(1)
  })

  it('should query bookmarks by path', async () => {
    await Functions.IncrementalRemovePicture(knexFnFake, '/comics/page.jpg')
    expect(bookmarksStub.where.calledWith({ path: '/comics/page.jpg' })).to.equal(true)
  })

  it('should call delete on bookmarks', async () => {
    await Functions.IncrementalRemovePicture(knexFnFake, '/comics/page.jpg')
    expect(bookmarksStub.delete.callCount).to.equal(1)
  })
})

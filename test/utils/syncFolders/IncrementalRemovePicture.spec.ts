'use sanity'

import { expect } from 'chai'
import { Functions, Imports } from '#utils/incrementalsync'
import Sinon from 'sinon'
import { Cast, StubToKnex } from '#testutils/TypeGuards'
import type { Debugger } from 'debug'

const sandbox = Sinon.createSandbox()

describe('utils/syncfolders function IncrementalRemovePicture()', () => {
  let loggerStub = Sinon.stub()
  let loggerFake = Cast<Debugger>(loggerStub)
  let knexFnStub = Sinon.stub()
  let picturesStub = { where: Sinon.stub().returnsThis(), delete: Sinon.stub().resolves(1) }
  let bookmarksStub = { where: Sinon.stub().returnsThis(), delete: Sinon.stub().resolves(0) }
  let knexFnFake = StubToKnex(knexFnStub)

  beforeEach(() => {
    loggerStub = Sinon.stub()
    loggerFake = Cast<Debugger>(loggerStub)
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

  it('should delete picture by path', async () => {
    await Functions.IncrementalRemovePicture(loggerFake, knexFnFake, '/comics/page.jpg')
    expect(picturesStub.where.calledWith({ path: '/comics/page.jpg' })).to.equal(true)
    expect(picturesStub.delete.callCount).to.equal(1)
  })

  it('should delete bookmark by path', async () => {
    await Functions.IncrementalRemovePicture(loggerFake, knexFnFake, '/comics/page.jpg')
    expect(bookmarksStub.where.calledWith({ path: '/comics/page.jpg' })).to.equal(true)
    expect(bookmarksStub.delete.callCount).to.equal(1)
  })

  it('should log the removal', async () => {
    await Functions.IncrementalRemovePicture(loggerFake, knexFnFake, '/comics/page.jpg')
    expect(loggerStub.calledWith('Incremental remove: /comics/page.jpg')).to.equal(true)
  })
})

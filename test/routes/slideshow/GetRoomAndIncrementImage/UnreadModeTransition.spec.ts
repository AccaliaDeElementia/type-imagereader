'use sanity'

import Sinon from 'sinon'
import { StubToKnex } from '#testutils/TypeGuards'
import { expect } from 'chai'
import { Config, Functions } from '#routes/slideshow'

const sandbox = Sinon.createSandbox()

describe('routes/slideshow function GetRoomAndIncrementImage() unread to all-images mode transition', () => {
  let knexFake = StubToKnex({ knex: Math.random() })
  let getImagesStub = Sinon.stub()
  let getCountsStub = Sinon.stub()
  let markImageReadStub = Sinon.stub()
  let transitionPages = { pages: 3, page: 1, unread: 0, all: 30 }
  let freshPages = { pages: 3, page: 2, unread: 0, all: 30 }
  let unreadRoom = {
    countdown: 50,
    images: ['/image0.png', '/image1.png', '/image2.png', '/image3.png', '/image4.png'],
    path: '/path/',
    index: 4,
    uriSafeImage: undefined,
    pages: { unread: 5, all: 30, pages: 1, page: 0 },
  }
  beforeEach(() => {
    knexFake = StubToKnex({ knex: Math.random() })
    transitionPages = { pages: 3, page: 1, unread: 0, all: 30 }
    freshPages = { pages: 3, page: 2, unread: 0, all: 30 }
    unreadRoom = {
      countdown: 50,
      images: ['/image0.png', '/image1.png', '/image2.png', '/image3.png', '/image4.png'],
      path: '/path/',
      index: 4,
      uriSafeImage: undefined,
      pages: { unread: 5, all: 30, pages: 1, page: 0 },
    }
    Config.rooms = {}
    Config.countdownDuration = 60
    Config.memorySize = 100
    getImagesStub = sandbox.stub(Functions, 'GetImages').resolves([])
    markImageReadStub = sandbox.stub(Functions, 'MarkImageRead').resolves()
    getCountsStub = sandbox.stub(Functions, 'GetCounts')
    getCountsStub.onFirstCall().resolves(transitionPages)
    getCountsStub.onSecondCall().resolves(freshPages)
    Config.rooms['/path/'] = unreadRoom
  })
  afterEach(() => {
    sandbox.restore()
    Config.countdownDuration = 60
    Config.memorySize = 100
  })
  it('it should call GetCounts twice when transitioning from unread to all-images on increment', async () => {
    await Functions.GetRoomAndIncrementImage(knexFake, '/path/', 1)
    expect(getCountsStub.callCount).to.equal(2)
  })
  it('it should call second GetCounts with no currentPage on unread to all-images transition on increment', async () => {
    await Functions.GetRoomAndIncrementImage(knexFake, '/path/', 1)
    expect(getCountsStub.secondCall.args).to.have.lengthOf(2)
  })
  it('it should call second GetCounts with knex on unread to all-images transition on increment', async () => {
    await Functions.GetRoomAndIncrementImage(knexFake, '/path/', 1)
    expect(getCountsStub.secondCall.args[0]).to.equal(knexFake)
  })
  it('it should call second GetCounts with path on unread to all-images transition on increment', async () => {
    await Functions.GetRoomAndIncrementImage(knexFake, '/path/', 1)
    expect(getCountsStub.secondCall.args[1]).to.equal('/path/')
  })
  it('it should load images from fresh random page on unread to all-images transition on increment', async () => {
    await Functions.GetRoomAndIncrementImage(knexFake, '/path/', 1)
    expect(getImagesStub.firstCall.args[2]).to.equal(freshPages.page)
  })
  it('it should call GetCounts twice when transitioning from unread to all-images on decrement', async () => {
    unreadRoom.index = 0
    await Functions.GetRoomAndIncrementImage(knexFake, '/path/', -1)
    expect(getCountsStub.callCount).to.equal(2)
  })
  it('it should call second GetCounts with no currentPage on unread to all-images transition on decrement', async () => {
    unreadRoom.index = 0
    await Functions.GetRoomAndIncrementImage(knexFake, '/path/', -1)
    expect(getCountsStub.secondCall.args).to.have.lengthOf(2)
  })
  it('it should load images from fresh random page on unread to all-images transition on decrement', async () => {
    unreadRoom.index = 0
    await Functions.GetRoomAndIncrementImage(knexFake, '/path/', -1)
    expect(getImagesStub.firstCall.args[2]).to.equal(freshPages.page)
  })
  it('it should not call GetCounts twice when unread remains above zero on increment', async () => {
    getCountsStub.onFirstCall().resolves({ ...transitionPages, unread: 3 })
    await Functions.GetRoomAndIncrementImage(knexFake, '/path/', 1)
    expect(getCountsStub.callCount).to.equal(1)
  })
  it('it should not call GetCounts twice when unread remains above zero on decrement', async () => {
    unreadRoom.index = 0
    getCountsStub.onFirstCall().resolves({ ...transitionPages, unread: 3 })
    await Functions.GetRoomAndIncrementImage(knexFake, '/path/', -1)
    expect(getCountsStub.callCount).to.equal(1)
  })
  it('it should not call GetCounts twice when already in all-images mode on increment', async () => {
    unreadRoom.pages.unread = 0
    await Functions.GetRoomAndIncrementImage(knexFake, '/path/', 1)
    expect(getCountsStub.callCount).to.equal(1)
  })
  it('it should not call GetCounts twice when already in all-images mode on decrement', async () => {
    unreadRoom.pages.unread = 0
    unreadRoom.index = 0
    await Functions.GetRoomAndIncrementImage(knexFake, '/path/', -1)
    expect(getCountsStub.callCount).to.equal(1)
  })
  it('it should call MarkImageRead once on unread to all-images transition on increment', async () => {
    getImagesStub.resolves(['/new_image.png'])
    await Functions.GetRoomAndIncrementImage(knexFake, '/path/', 1)
    expect(markImageReadStub.calledOnce).to.equal(true)
  })
  it('it should call MarkImageRead with knex on unread to all-images transition on increment', async () => {
    getImagesStub.resolves(['/new_image.png'])
    await Functions.GetRoomAndIncrementImage(knexFake, '/path/', 1)
    expect(markImageReadStub.firstCall.args[0]).to.equal(knexFake)
  })
  it('it should call MarkImageRead with the first fresh image on unread to all-images transition on increment', async () => {
    getImagesStub.resolves(['/new_image.png'])
    await Functions.GetRoomAndIncrementImage(knexFake, '/path/', 1)
    expect(markImageReadStub.firstCall.args[1]).to.equal('/new_image.png')
  })
  it('it should call MarkImageRead once on unread to all-images transition on decrement', async () => {
    unreadRoom.index = 0
    getImagesStub.resolves(['/prev_a.png', '/prev_b.png'])
    await Functions.GetRoomAndIncrementImage(knexFake, '/path/', -1)
    expect(markImageReadStub.calledOnce).to.equal(true)
  })
  it('it should call MarkImageRead with knex on unread to all-images transition on decrement', async () => {
    unreadRoom.index = 0
    getImagesStub.resolves(['/prev_a.png', '/prev_b.png'])
    await Functions.GetRoomAndIncrementImage(knexFake, '/path/', -1)
    expect(markImageReadStub.firstCall.args[0]).to.equal(knexFake)
  })
  it('it should call MarkImageRead with the last fresh image on unread to all-images transition on decrement', async () => {
    unreadRoom.index = 0
    getImagesStub.resolves(['/prev_a.png', '/prev_b.png'])
    await Functions.GetRoomAndIncrementImage(knexFake, '/path/', -1)
    expect(markImageReadStub.firstCall.args[1]).to.equal('/prev_b.png')
  })
  it('it should not call MarkImageRead when no images are available after transition', async () => {
    await Functions.GetRoomAndIncrementImage(knexFake, '/path/', 1)
    expect(markImageReadStub.notCalled).to.equal(true)
  })
})

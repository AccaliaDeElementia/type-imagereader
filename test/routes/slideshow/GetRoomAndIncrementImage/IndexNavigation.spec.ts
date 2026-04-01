'use sanity'

import Sinon from 'sinon'
import { Cast, StubToKnex } from '#testutils/TypeGuards'
import { expect } from 'chai'
import { Config, Functions, type SlideshowRoom } from '#routes/slideshow'
import { STEP } from '#utils/helpers'

const sandbox = Sinon.createSandbox()

const pagedImages = (count: number, offset = 0): string[] =>
  Array(count)
    .fill(undefined)
    .map((_, i: number) => `/image${i + offset}.png`)

const isNumberMutator = (o: unknown): o is (_: number) => number => typeof o === 'function'

describe('routes/slideshow function GetRoomAndIncrementImage() index navigation', () => {
  let stockImages = pagedImages(Config.memorySize)
  let knexFake = StubToKnex({ knex: Math.random() })
  let getImagesStub = Sinon.stub()
  let getCountsStub = Sinon.stub()
  let markImageReadStub = Sinon.stub()
  let pages = { pages: 0, page: 0, unread: 0, all: 0 }
  beforeEach(() => {
    stockImages = pagedImages(Config.memorySize)
    knexFake = StubToKnex({ knex: Math.random() })
    pages = { pages: 0, page: 0, unread: 0, all: 0 }
    Config.rooms = {}
    Config.countdownDuration = 60
    Config.memorySize = 100
    getImagesStub = sandbox.stub(Functions, 'GetImages').resolves(stockImages)
    markImageReadStub = sandbox.stub(Functions, 'MarkImageRead').resolves()
    getCountsStub = sandbox.stub(Functions, 'GetCounts').resolves(pages)
  })
  afterEach(() => {
    sandbox.restore()
    Config.countdownDuration = 60
    Config.memorySize = 100
  })
  describe('when decrementing past the start of the current page', () => {
    let room = Cast<SlideshowRoom>({})
    let second: string[] = []
    beforeEach(async () => {
      second = pagedImages(100)
      getImagesStub.onFirstCall().resolves(pagedImages(200, 200)).onSecondCall().resolves(second)
      pages.page = 10
      room = await Functions.GetRoomAndIncrementImage(knexFake, '/path/')
      getCountsStub.resetHistory()
      await Functions.GetRoomAndIncrementImage(knexFake, '/path/', -1)
    })
    it('should call GetCounts once', () => expect(getCountsStub.callCount).to.equal(1))
    it('should call GetCounts with 4 arguments', () => expect(getCountsStub.firstCall.args).to.have.lengthOf(4))
    it('should pass knex to GetCounts', () => expect(getCountsStub.firstCall.args[0]).to.equal(knexFake))
    it('should pass path to GetCounts', () => expect(getCountsStub.firstCall.args[1]).to.equal('/path/'))
    it('should pass current page to GetCounts', () => expect(getCountsStub.firstCall.args[2]).to.equal(10))
    it('should pass decrement mutator to GetCounts', () =>
      expect(Cast(getCountsStub.firstCall.args[3], isNumberMutator)(4)).to.equal(3))
    it('should reload images from the new page', () => expect(getImagesStub.callCount).to.equal(2))
    it('should set index to last image of new page', () => expect(room.index).to.equal(99))
    it('should update room images from new page', () => expect(room.images).to.equal(second))
  })
  describe('when decrementing past the start of the page after prior decrements within the page', () => {
    let room = Cast<SlideshowRoom>({})
    let second: string[] = []
    beforeEach(async () => {
      second = pagedImages(30)
      room = Cast<SlideshowRoom>({
        countdown: 50,
        images: pagedImages(20, 200),
        path: '/path/',
        index: 1,
        uriSafeImage: undefined,
        pages: { unread: 0, all: 0, pages: 0, page: 11 },
      })
      Config.rooms['/path/'] = room
      getImagesStub.onFirstCall().resolves(second)
      await Functions.GetRoomAndIncrementImage(knexFake, '/path/')
      await Functions.GetRoomAndIncrementImage(knexFake, '/path/', STEP.BACK)
      getCountsStub.resetHistory()
      await Functions.GetRoomAndIncrementImage(knexFake, '/path/', STEP.BACK)
    })
    it('should call GetCounts once', () => expect(getCountsStub.callCount).to.equal(1))
    it('should call GetCounts with 4 arguments', () => expect(getCountsStub.firstCall.args).to.have.lengthOf(4))
    it('should pass knex to GetCounts', () => expect(getCountsStub.firstCall.args[0]).to.equal(knexFake))
    it('should pass path to GetCounts', () => expect(getCountsStub.firstCall.args[1]).to.equal('/path/'))
    it('should pass current page to GetCounts', () => expect(getCountsStub.firstCall.args[2]).to.equal(11))
    it('should pass decrement mutator to GetCounts', () =>
      expect(Cast(getCountsStub.firstCall.args[3], isNumberMutator)(4)).to.equal(3))
    it('should reload images from the new page', () => expect(getImagesStub.callCount).to.equal(1))
    it('should set index to last image of new page', () => expect(room.index).to.equal(29))
    it('should load the correct number of images from new page', () => expect(room.images).to.have.lengthOf(30))
    it('should update room images from new page', () => expect(room.images).to.equal(second))
  })
  describe('when decrementing far past the start of the current page', () => {
    let room = Cast<SlideshowRoom>({})
    let second: string[] = []
    beforeEach(async () => {
      second = pagedImages(100)
      getImagesStub.onFirstCall().resolves(pagedImages(200, 200)).onSecondCall().resolves(second)
      room = await Functions.GetRoomAndIncrementImage(knexFake, '/path/')
      await Functions.GetRoomAndIncrementImage(knexFake, '/path/', STEP.BACK)
    })
    it('should set index to last image of new page', () => expect(room.index).to.equal(99))
    it('should reload images from new page', () => expect(getImagesStub.callCount).to.equal(2))
    it('should load a full page of images', () => expect(room.images).to.have.lengthOf(100))
    it('should update room images from new page', () => expect(room.images).to.equal(second))
  })
  describe('when incrementing past the end of the current page', () => {
    let room = Cast<SlideshowRoom>({})
    let second: string[] = []
    beforeEach(async () => {
      second = pagedImages(100)
      getImagesStub.onFirstCall().resolves(pagedImages(200, 200)).onSecondCall().resolves(second)
      room = await Functions.GetRoomAndIncrementImage(knexFake, '/path/')
      room.index = room.images.length + STEP.BACK
      room.pages.page = 13
      getCountsStub.resetHistory()
      await Functions.GetRoomAndIncrementImage(knexFake, '/path/', STEP.FORWARD)
    })
    it('should call GetCounts once', () => expect(getCountsStub.callCount).to.equal(1))
    it('should call GetCounts with 4 arguments', () => expect(getCountsStub.firstCall.args).to.have.lengthOf(4))
    it('should pass knex to GetCounts', () => expect(getCountsStub.firstCall.args[0]).to.equal(knexFake))
    it('should pass path to GetCounts', () => expect(getCountsStub.firstCall.args[1]).to.equal('/path/'))
    it('should pass current page to GetCounts', () => expect(getCountsStub.firstCall.args[2]).to.equal(13))
    it('should pass increment mutator to GetCounts', () =>
      expect(Cast(getCountsStub.firstCall.args[3], isNumberMutator)(4)).to.equal(5))
    it('should reload images from the new page', () => expect(getImagesStub.callCount).to.equal(2))
    it('should reset index to start of new page', () => expect(room.index).to.equal(0))
    it('should load a full page of images', () => expect(room.images).to.have.lengthOf(100))
    it('should update room images from new page', () => expect(room.images).to.equal(second))
  })
  describe('when incrementing on a room that already has an empty image list', () => {
    let room = Cast<SlideshowRoom>({})
    beforeEach(async () => {
      room = Cast<SlideshowRoom>({
        countdown: 60,
        images: [],
        path: '/path/',
        index: 0,
        uriSafeImage: undefined,
        pages: { unread: 0, all: 0, pages: 0, page: 0 },
      })
      Config.rooms['/path/'] = room
      await Functions.GetRoomAndIncrementImage(knexFake, '/path/', 1)
    })
    it('should not call advancePage when images is already empty', () => expect(getImagesStub.callCount).to.equal(0))
    it('should not call GetCounts when images is already empty', () => expect(getCountsStub.callCount).to.equal(0))
    it('should keep index at 0', () => expect(room.index).to.equal(0))
    it('should keep images as empty array', () => expect(room.images).to.have.lengthOf(0))
    it('should set uriSafeImage to empty string', () => expect(room.uriSafeImage).to.equal(''))
  })
  describe('when decrementing on a room that already has an empty image list', () => {
    let room = Cast<SlideshowRoom>({})
    beforeEach(async () => {
      room = Cast<SlideshowRoom>({
        countdown: 60,
        images: [],
        path: '/path/',
        index: 0,
        uriSafeImage: undefined,
        pages: { unread: 0, all: 0, pages: 0, page: 0 },
      })
      Config.rooms['/path/'] = room
      await Functions.GetRoomAndIncrementImage(knexFake, '/path/', -1)
    })
    it('should not call advancePage when images is already empty', () => expect(getImagesStub.callCount).to.equal(0))
    it('should not call GetCounts when images is already empty', () => expect(getCountsStub.callCount).to.equal(0))
    it('should keep index at 0', () => expect(room.index).to.equal(0))
    it('should keep images as empty array', () => expect(room.images).to.have.lengthOf(0))
    it('should set uriSafeImage to empty string', () => expect(room.uriSafeImage).to.equal(''))
  })
  describe('when incrementing to a page with no images', () => {
    let room = Cast<SlideshowRoom>({})
    beforeEach(async () => {
      getImagesStub.resolves(pagedImages(1))
      room = await Functions.GetRoomAndIncrementImage(knexFake, '/path/')
      getImagesStub.resolves([])
      getImagesStub.resetHistory()
      getCountsStub.resetHistory()
      markImageReadStub.resetHistory()
      await Functions.GetRoomAndIncrementImage(knexFake, '/path/', 1)
    })
    it('should set index to 0', () => expect(room.index).to.equal(0))
    it('should set uriSafeImage to empty string', () => expect(room.uriSafeImage).to.equal(''))
    it('should not call MarkImageRead for empty page', () => expect(markImageReadStub.callCount).to.equal(0))
  })
  describe('when decrementing to a page with no images', () => {
    let room = Cast<SlideshowRoom>({})
    beforeEach(async () => {
      getImagesStub.resolves(pagedImages(200, 200))
      room = await Functions.GetRoomAndIncrementImage(knexFake, '/path/')
      getImagesStub.resolves([])
      getImagesStub.resetHistory()
      getCountsStub.resetHistory()
      markImageReadStub.resetHistory()
      await Functions.GetRoomAndIncrementImage(knexFake, '/path/', -1)
    })
    it('should set index to 0', () => expect(room.index).to.equal(0))
    it('should set uriSafeImage to empty string', () => expect(room.uriSafeImage).to.equal(''))
    it('should not call MarkImageRead for empty page', () => expect(markImageReadStub.callCount).to.equal(0))
  })
  describe('when ticking a room after decrement landed on an empty page', () => {
    let room = Cast<SlideshowRoom>({})
    beforeEach(async () => {
      getImagesStub.onFirstCall().resolves(pagedImages(200, 200)).onSecondCall().resolves([])
      room = await Functions.GetRoomAndIncrementImage(knexFake, '/path/')
      await Functions.GetRoomAndIncrementImage(knexFake, '/path/', -1)
      getImagesStub.resetHistory()
      getCountsStub.resetHistory()
      await Functions.GetRoomAndIncrementImage(knexFake, '/path/', 1)
    })
    it('should not call advancePage again on subsequent tick', () => expect(getImagesStub.callCount).to.equal(0))
    it('should not call GetCounts again on subsequent tick', () => expect(getCountsStub.callCount).to.equal(0))
    it('should keep index at 0', () => expect(room.index).to.equal(0))
  })
  describe('countdown reset behaviour', () => {
    let room = Cast<SlideshowRoom>({})
    beforeEach(() => {
      room = Cast<SlideshowRoom>({
        countdown: 50,
        images: pagedImages(20),
        path: '/path/',
        index: 10,
        uriSafeImage: undefined,
        pages: { unread: 0, all: 0, pages: 0, page: 11 },
      })
      Config.rooms['/path/'] = room
      Config.countdownDuration = 100
    })
    it('should not reset countdown when no increment specified', async () => {
      await Functions.GetRoomAndIncrementImage(knexFake, '/path/')
      expect(room.countdown).to.equal(50)
    })
    it('should not reset countdown when zero increment specified', async () => {
      await Functions.GetRoomAndIncrementImage(knexFake, '/path/', 0)
      expect(room.countdown).to.equal(50)
    })
    it('should reset countdown when negative increment specified', async () => {
      await Functions.GetRoomAndIncrementImage(knexFake, '/path/', -1)
      expect(room.countdown).to.equal(100)
    })
    it('should reset countdown when positive increment specified', async () => {
      await Functions.GetRoomAndIncrementImage(knexFake, '/path/', 1)
      expect(room.countdown).to.equal(100)
    })
  })
})

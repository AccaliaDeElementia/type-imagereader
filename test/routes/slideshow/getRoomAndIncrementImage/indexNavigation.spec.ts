'use sanity'

import Sinon from 'sinon'
import { cast, stubToKnex } from '#testutils/typeGuards.js'
import { Config, getRoomAndIncrementImage, Internals, type SlideshowRoom } from '#routes/slideshow.js'
import { STEP } from '#utils/helpers.js'

const sandbox = Sinon.createSandbox()

const pagedImages = (count: number, offset = 0): string[] =>
  Array(count)
    .fill(undefined)
    .map((_, i: number) => `/image${i + offset}.png`)

const isNumberMutator = (o: unknown): o is (_: number) => number => typeof o === 'function'

describe('routes/slideshow/getRoomAndIncrementImage getRoomAndIncrementImage() index navigation', () => {
  let stockImages = pagedImages(Config.memorySize)
  let knexFake = stubToKnex({ knex: Math.random() })
  let getImagesStub = sandbox.stub()
  let getCountsStub = sandbox.stub()
  let markImageReadStub = sandbox.stub()
  let pages = { pages: 0, page: 0, unread: 0, all: 0 }
  beforeEach(() => {
    stockImages = pagedImages(Config.memorySize)
    knexFake = stubToKnex({ knex: Math.random() })
    pages = { pages: 0, page: 0, unread: 0, all: 0 }
    Config.rooms = {}
    Config.countdownDuration = 60
    Config.memorySize = 100
    getImagesStub = sandbox.stub(Internals, 'getImages').resolves(stockImages)
    markImageReadStub = sandbox.stub(Internals, 'markImageRead').resolves()
    getCountsStub = sandbox.stub(Internals, 'getCounts').resolves(pages)
  })
  afterEach(() => {
    sandbox.restore()
    Config.countdownDuration = 60
    Config.memorySize = 100
  })
  describe('when decrementing past the start of the current page', () => {
    let room = cast<SlideshowRoom>({})
    let second: string[] = []
    beforeEach(async () => {
      second = pagedImages(100)
      getImagesStub.onFirstCall().resolves(pagedImages(200, 200)).onSecondCall().resolves(second)
      pages.page = 10
      room = await getRoomAndIncrementImage(knexFake, '/path/')
      getCountsStub.resetHistory()
      await getRoomAndIncrementImage(knexFake, '/path/', -1)
    })
    it('should call getCounts once', () => {
      expect(getCountsStub.callCount).toBe(1)
    })
    it('should call getCounts with 4 arguments', () => {
      expect(getCountsStub.firstCall.args).toHaveLength(4)
    })
    it('should pass knex to getCounts', () => {
      expect(getCountsStub.firstCall.args[0]).toBe(knexFake)
    })
    it('should pass path to getCounts', () => {
      expect(getCountsStub.firstCall.args[1]).toBe('/path/')
    })
    it('should pass current page to getCounts', () => {
      expect(getCountsStub.firstCall.args[2]).toBe(10)
    })
    it('should pass decrement mutator to getCounts', () => {
      expect(cast(getCountsStub.firstCall.args[3], isNumberMutator)(4)).toBe(3)
    })
    it('should reload images from the new page', () => {
      expect(getImagesStub.callCount).toBe(2)
    })
    it('should set index to last image of new page', () => {
      expect(room.index).toBe(99)
    })
    it('should update room images from new page', () => {
      expect(room.images).toBe(second)
    })
  })
  describe('when decrementing past the start of the page after prior decrements within the page', () => {
    let room = cast<SlideshowRoom>({})
    let second: string[] = []
    beforeEach(async () => {
      second = pagedImages(30)
      room = cast<SlideshowRoom>({
        countdown: 50,
        images: pagedImages(20, 200),
        path: '/path/',
        index: 1,
        uriSafeImage: undefined,
        pages: { unread: 0, all: 0, pages: 0, page: 11 },
      })
      Config.rooms['/path/'] = room
      getImagesStub.onFirstCall().resolves(second)
      await getRoomAndIncrementImage(knexFake, '/path/')
      await getRoomAndIncrementImage(knexFake, '/path/', STEP.BACK)
      getCountsStub.resetHistory()
      await getRoomAndIncrementImage(knexFake, '/path/', STEP.BACK)
    })
    it('should call getCounts once', () => {
      expect(getCountsStub.callCount).toBe(1)
    })
    it('should call getCounts with 4 arguments', () => {
      expect(getCountsStub.firstCall.args).toHaveLength(4)
    })
    it('should pass knex to getCounts', () => {
      expect(getCountsStub.firstCall.args[0]).toBe(knexFake)
    })
    it('should pass path to getCounts', () => {
      expect(getCountsStub.firstCall.args[1]).toBe('/path/')
    })
    it('should pass current page to getCounts', () => {
      expect(getCountsStub.firstCall.args[2]).toBe(11)
    })
    it('should pass decrement mutator to getCounts', () => {
      expect(cast(getCountsStub.firstCall.args[3], isNumberMutator)(4)).toBe(3)
    })
    it('should reload images from the new page', () => {
      expect(getImagesStub.callCount).toBe(1)
    })
    it('should set index to last image of new page', () => {
      expect(room.index).toBe(29)
    })
    it('should load the correct number of images from new page', () => {
      expect(room.images).toHaveLength(30)
    })
    it('should update room images from new page', () => {
      expect(room.images).toBe(second)
    })
  })
  describe('when decrementing far past the start of the current page', () => {
    let room = cast<SlideshowRoom>({})
    let second: string[] = []
    beforeEach(async () => {
      second = pagedImages(100)
      getImagesStub.onFirstCall().resolves(pagedImages(200, 200)).onSecondCall().resolves(second)
      room = await getRoomAndIncrementImage(knexFake, '/path/')
      await getRoomAndIncrementImage(knexFake, '/path/', STEP.BACK)
    })
    it('should set index to last image of new page', () => {
      expect(room.index).toBe(99)
    })
    it('should reload images from new page', () => {
      expect(getImagesStub.callCount).toBe(2)
    })
    it('should load a full page of images', () => {
      expect(room.images).toHaveLength(100)
    })
    it('should update room images from new page', () => {
      expect(room.images).toBe(second)
    })
  })
  describe('when incrementing past the end of the current page', () => {
    let room = cast<SlideshowRoom>({})
    let second: string[] = []
    beforeEach(async () => {
      second = pagedImages(100)
      getImagesStub.onFirstCall().resolves(pagedImages(200, 200)).onSecondCall().resolves(second)
      room = await getRoomAndIncrementImage(knexFake, '/path/')
      room.index = room.images.length + STEP.BACK
      room.pages.page = 13
      getCountsStub.resetHistory()
      await getRoomAndIncrementImage(knexFake, '/path/', STEP.FORWARD)
    })
    it('should call getCounts once', () => {
      expect(getCountsStub.callCount).toBe(1)
    })
    it('should call getCounts with 4 arguments', () => {
      expect(getCountsStub.firstCall.args).toHaveLength(4)
    })
    it('should pass knex to getCounts', () => {
      expect(getCountsStub.firstCall.args[0]).toBe(knexFake)
    })
    it('should pass path to getCounts', () => {
      expect(getCountsStub.firstCall.args[1]).toBe('/path/')
    })
    it('should pass current page to getCounts', () => {
      expect(getCountsStub.firstCall.args[2]).toBe(13)
    })
    it('should pass increment mutator to getCounts', () => {
      expect(cast(getCountsStub.firstCall.args[3], isNumberMutator)(4)).toBe(5)
    })
    it('should reload images from the new page', () => {
      expect(getImagesStub.callCount).toBe(2)
    })
    it('should reset index to start of new page', () => {
      expect(room.index).toBe(0)
    })
    it('should load a full page of images', () => {
      expect(room.images).toHaveLength(100)
    })
    it('should update room images from new page', () => {
      expect(room.images).toBe(second)
    })
  })
  describe('when incrementing on a room that already has an empty image list', () => {
    let room = cast<SlideshowRoom>({})
    beforeEach(async () => {
      room = cast<SlideshowRoom>({
        countdown: 60,
        images: [],
        path: '/path/',
        index: 0,
        uriSafeImage: undefined,
        pages: { unread: 0, all: 0, pages: 0, page: 0 },
      })
      Config.rooms['/path/'] = room
      await getRoomAndIncrementImage(knexFake, '/path/', 1)
    })
    it('should not call advancePage when images is already empty', () => {
      expect(getImagesStub.callCount).toBe(0)
    })
    it('should not call getCounts when images is already empty', () => {
      expect(getCountsStub.callCount).toBe(0)
    })
    it('should keep index at 0', () => {
      expect(room.index).toBe(0)
    })
    it('should keep images as empty array', () => {
      expect(room.images).toHaveLength(0)
    })
    it('should set uriSafeImage to empty string', () => {
      expect(room.uriSafeImage).toBe('')
    })
  })
  describe('when decrementing on a room that already has an empty image list', () => {
    let room = cast<SlideshowRoom>({})
    beforeEach(async () => {
      room = cast<SlideshowRoom>({
        countdown: 60,
        images: [],
        path: '/path/',
        index: 0,
        uriSafeImage: undefined,
        pages: { unread: 0, all: 0, pages: 0, page: 0 },
      })
      Config.rooms['/path/'] = room
      await getRoomAndIncrementImage(knexFake, '/path/', -1)
    })
    it('should not call advancePage when images is already empty', () => {
      expect(getImagesStub.callCount).toBe(0)
    })
    it('should not call getCounts when images is already empty', () => {
      expect(getCountsStub.callCount).toBe(0)
    })
    it('should keep index at 0', () => {
      expect(room.index).toBe(0)
    })
    it('should keep images as empty array', () => {
      expect(room.images).toHaveLength(0)
    })
    it('should set uriSafeImage to empty string', () => {
      expect(room.uriSafeImage).toBe('')
    })
  })
  describe('when incrementing to a page with no images', () => {
    let room = cast<SlideshowRoom>({})
    beforeEach(async () => {
      getImagesStub.resolves(pagedImages(1))
      room = await getRoomAndIncrementImage(knexFake, '/path/')
      getImagesStub.resolves([])
      getImagesStub.resetHistory()
      getCountsStub.resetHistory()
      markImageReadStub.resetHistory()
      await getRoomAndIncrementImage(knexFake, '/path/', 1)
    })
    it('should set index to 0', () => {
      expect(room.index).toBe(0)
    })
    it('should set uriSafeImage to empty string', () => {
      expect(room.uriSafeImage).toBe('')
    })
    it('should not call markImageRead for empty page', () => {
      expect(markImageReadStub.callCount).toBe(0)
    })
  })
  describe('when decrementing to a page with no images', () => {
    let room = cast<SlideshowRoom>({})
    beforeEach(async () => {
      getImagesStub.resolves(pagedImages(200, 200))
      room = await getRoomAndIncrementImage(knexFake, '/path/')
      getImagesStub.resolves([])
      getImagesStub.resetHistory()
      getCountsStub.resetHistory()
      markImageReadStub.resetHistory()
      await getRoomAndIncrementImage(knexFake, '/path/', -1)
    })
    it('should set index to 0', () => {
      expect(room.index).toBe(0)
    })
    it('should set uriSafeImage to empty string', () => {
      expect(room.uriSafeImage).toBe('')
    })
    it('should not call markImageRead for empty page', () => {
      expect(markImageReadStub.callCount).toBe(0)
    })
  })
  describe('when ticking a room after decrement landed on an empty page', () => {
    let room = cast<SlideshowRoom>({})
    beforeEach(async () => {
      getImagesStub.onFirstCall().resolves(pagedImages(200, 200)).onSecondCall().resolves([])
      room = await getRoomAndIncrementImage(knexFake, '/path/')
      await getRoomAndIncrementImage(knexFake, '/path/', -1)
      getImagesStub.resetHistory()
      getCountsStub.resetHistory()
      await getRoomAndIncrementImage(knexFake, '/path/', 1)
    })
    it('should not call advancePage again on subsequent tick', () => {
      expect(getImagesStub.callCount).toBe(0)
    })
    it('should not call getCounts again on subsequent tick', () => {
      expect(getCountsStub.callCount).toBe(0)
    })
    it('should keep index at 0', () => {
      expect(room.index).toBe(0)
    })
  })
  describe('countdown reset behaviour', () => {
    let room = cast<SlideshowRoom>({})
    beforeEach(() => {
      room = cast<SlideshowRoom>({
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
      await getRoomAndIncrementImage(knexFake, '/path/')
      expect(room.countdown).toBe(50)
    })
    it('should not reset countdown when zero increment specified', async () => {
      await getRoomAndIncrementImage(knexFake, '/path/', 0)
      expect(room.countdown).toBe(50)
    })
    it('should reset countdown when negative increment specified', async () => {
      await getRoomAndIncrementImage(knexFake, '/path/', -1)
      expect(room.countdown).toBe(100)
    })
    it('should reset countdown when positive increment specified', async () => {
      await getRoomAndIncrementImage(knexFake, '/path/', 1)
      expect(room.countdown).toBe(100)
    })
  })
})

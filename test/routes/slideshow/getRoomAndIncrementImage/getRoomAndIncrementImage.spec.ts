'use sanity'

import { cast, stubToKnex } from '#testutils/typeGuards.js'
import { STEP } from '#utils/helpers.js'
import { Config, getRoomAndIncrementImage, Internals, Imports, type SlideshowRoom } from '#routes/slideshow.js'
import type { MockInstance } from 'vitest'

const pagedImages = (count: number, offset = 0): string[] =>
  Array(count)
    .fill(undefined)
    .map((_, i: number) => `/image${i + offset}.png`)

const isNumberMutator = (o: unknown): o is (_: number) => number => typeof o === 'function'

describe('routes/slideshow/getRoomAndIncrementImage getRoomAndIncrementImage()', () => {
  afterEach(() => {
    Config.countdownDuration = 60
    Config.memorySize = 100
  })

  describe('room initialisation', () => {
    let stockImages = Array(Config.memorySize)
      .fill(undefined)
      .map((_, i) => `/image${i}.png`)
    let knexFake = stubToKnex({ knex: Math.random() })
    let getImagesStub: MockInstance = vi.fn()
    let getCountsStub: MockInstance = vi.fn()
    let markImageReadStub: MockInstance = vi.fn()
    let pages = {
      pages: 0,
      page: 0,
      unread: 0,
      all: 0,
    }
    beforeEach(() => {
      stockImages = Array(Config.memorySize)
        .fill(undefined)
        .map((_, i) => `/image${i}.png`)
      knexFake = stubToKnex({ knex: Math.random() })
      pages = { pages: 0, page: 0, unread: 0, all: 0 }
      Config.rooms = {}
      Config.countdownDuration = 60
      Config.memorySize = 100
      getImagesStub = vi.spyOn(Internals, 'getImages').mockResolvedValue(stockImages)
      markImageReadStub = vi.spyOn(Internals, 'markImageRead').mockResolvedValue(undefined)
      getCountsStub = vi.spyOn(Internals, 'getCounts').mockResolvedValue(pages)
    })
    it('it should create a room when the room does not exist in the cache', async () => {
      await getRoomAndIncrementImage(knexFake, '/images!/')
      expect(Config.rooms['/images!/']).not.toBe(undefined)
    })
    it('it should resolve to created room', async () => {
      const result = await getRoomAndIncrementImage(knexFake, '/images!/')
      expect(result).toBe(Config.rooms['/images!/'])
    })
    it('it should not overwrite a room populated by a concurrent call during async initialization', async () => {
      const concurrentRoom = {
        countdown: Config.countdownDuration,
        path: '/images!/',
        pages: { unread: 0, all: 0, pages: 0, page: 0 },
        images: ['/concurrentImage.png'],
        index: 0,
        uriSafeImage: undefined,
      }
      getCountsStub.mockImplementation(async () => {
        // Simulate a concurrent call completing and populating Config.rooms before this one finishes
        Config.rooms['/images!/'] = concurrentRoom
        return await Promise.resolve(pages)
      })
      await getRoomAndIncrementImage(knexFake, '/images!/')
      expect(Config.rooms['/images!/']).toBe(concurrentRoom)
    })
    it('it should return the canonical room when a concurrent call populates it during async initialization', async () => {
      const concurrentRoom = {
        countdown: Config.countdownDuration,
        path: '/images!/',
        pages: { unread: 0, all: 0, pages: 0, page: 0 },
        images: ['/concurrentImage.png'],
        index: 0,
        uriSafeImage: undefined,
      }
      getCountsStub.mockImplementation(async () => {
        Config.rooms['/images!/'] = concurrentRoom
        return await Promise.resolve(pages)
      })
      const result = await getRoomAndIncrementImage(knexFake, '/images!/')
      expect(result).toBe(concurrentRoom)
    })
    it('it should set expected countdown duration on new room', async () => {
      Config.countdownDuration = 69
      const room = await getRoomAndIncrementImage(knexFake, '/images!/')
      expect(room.countdown).toBe(69)
    })
    it('it should set expected path on new room', async () => {
      const name = `/path/${Math.random()}/`
      const room = await getRoomAndIncrementImage(knexFake, name)
      expect(room.path).toBe(name)
    })
    it('it should retrieve image counts with getCounts()', async () => {
      const name = `/path/${Math.random()}/`
      await getRoomAndIncrementImage(knexFake, name)
      expect(getCountsStub.mock.calls.length).toBe(1)
    })
    it('it should pass knex to getCounts()', async () => {
      const name = `/path/${Math.random()}/`
      await getRoomAndIncrementImage(knexFake, name)
      expect(getCountsStub.mock.calls[0]?.[0]).toBe(knexFake)
    })
    it('it should pass path to getCounts()', async () => {
      const name = `/path/${Math.random()}/`
      await getRoomAndIncrementImage(knexFake, name)
      expect(getCountsStub.mock.calls[0]?.[1]).toBe(name)
    })
    it('it should set pages config in result', async () => {
      const name = `/path/${Math.random()}/`
      const room = await getRoomAndIncrementImage(knexFake, name)
      expect(room.pages).toBe(pages)
    })
    it('it should get seed images on new room', async () => {
      Config.memorySize = 42
      pages.page = 92
      const name = `/path/${Math.random()}/`
      await getRoomAndIncrementImage(knexFake, name)
      expect(getImagesStub.mock.calls.length).toBe(1)
    })
    it('it should pass knex to getImages() to seed images on new room', async () => {
      Config.memorySize = 42
      pages.page = 92
      const name = `/path/${Math.random()}/`
      await getRoomAndIncrementImage(knexFake, name)
      expect(getImagesStub.mock.calls[0]?.[0]).toBe(knexFake)
    })
    it('it should pass path to getImages() to seed images on new room', async () => {
      Config.memorySize = 42
      pages.page = 92
      const name = `/path/${Math.random()}/`
      await getRoomAndIncrementImage(knexFake, name)
      expect(getImagesStub.mock.calls[0]?.[1]).toBe(name)
    })
    it('it should pass current page to getImages() to seed images on new room', async () => {
      Config.memorySize = 42
      pages.page = 92
      const name = `/path/${Math.random()}/`
      await getRoomAndIncrementImage(knexFake, name)
      expect(getImagesStub.mock.calls[0]?.[2]).toBe(92)
    })
    it('it should pass page size to getImages() to seed images on new room', async () => {
      Config.memorySize = 42
      pages.page = 92
      const name = `/path/${Math.random()}/`
      await getRoomAndIncrementImage(knexFake, name)
      expect(getImagesStub.mock.calls[0]?.[3]).toBe(42)
    })
    it('it should set default index on new room', async () => {
      const room = await getRoomAndIncrementImage(knexFake, '/path/')
      expect(room.index).toBe(0)
    })
    it('it should ignore negative increment on new room', async () => {
      const room = await getRoomAndIncrementImage(knexFake, '/path/', STEP.BACK)
      expect(room.index).toBe(0)
    })
    it('it should ignore positive increment on new room', async () => {
      const room = await getRoomAndIncrementImage(knexFake, '/path2/', STEP.FORWARD)
      expect(room.index).toBe(0)
    })
    it('it should set uriSafeImage', async () => {
      const room = await getRoomAndIncrementImage(knexFake, '/images!/')
      expect(room.uriSafeImage).toBe('/image0.png')
    })
    it('it should set uriSafeImage using encodeUriComponent', async () => {
      stockImages[0] = '/foo?/#bar/%image.gif'
      const room = await getRoomAndIncrementImage(knexFake, '/images!/')
      expect(room.uriSafeImage).toBe('/foo%3F/%23bar/%25image.gif')
    })
    it('it should set uriSafeImage to blank if there are no pictures', async () => {
      stockImages = []
      getImagesStub.mockResolvedValue([])
      const room = await getRoomAndIncrementImage(knexFake, '/images!/')
      expect(room.uriSafeImage).toBe('')
    })
    it('it should call markImageRead if there are pictures on fetch', async () => {
      await getRoomAndIncrementImage(knexFake, '/images!/')
      expect(markImageReadStub.mock.calls.length).toBe(1)
    })
    it('it should call markImageRead with 2 arguments if there are pictures on fetch', async () => {
      await getRoomAndIncrementImage(knexFake, '/images!/')
      expect(markImageReadStub.mock.calls[0]).toHaveLength(2)
    })
    it('it should pass knex to markImageRead if there are pictures on fetch', async () => {
      await getRoomAndIncrementImage(knexFake, '/images!/')
      expect(markImageReadStub.mock.calls[0]?.[0]).toBe(knexFake)
    })
    it('it should pass first image path to markImageRead if there are pictures on fetch', async () => {
      await getRoomAndIncrementImage(knexFake, '/images!/')
      expect(markImageReadStub.mock.calls[0]?.[1]).toBe('/image0.png')
    })
    it('it should omit call to markImageRead if there are no pictures', async () => {
      stockImages = []
      getImagesStub.mockResolvedValue([])
      await getRoomAndIncrementImage(knexFake, '/images!/')
      expect(markImageReadStub.mock.calls.length).toBe(0)
    })

    describe('logging', () => {
      let loggerStub: MockInstance = vi.fn()
      const ROOM_CREATED_FORMAT = 'slideshow room created: %s (pages=%d unread=%d)'
      const isRoomCreatedCall = (c: readonly unknown[]): boolean => c[0] === ROOM_CREATED_FORMAT
      beforeEach(() => {
        loggerStub = vi.spyOn(Imports, 'logger').mockImplementation((..._args: unknown[]) => undefined)
      })

      it('should log room-created format when creating a new room', async () => {
        pages.pages = 5
        pages.unread = 12
        getCountsStub.mockResolvedValue(pages)
        await getRoomAndIncrementImage(knexFake, '/new-room/')
        expect(loggerStub.mock.calls[0]?.[0]).toBe('slideshow room created: %s (pages=%d unread=%d)')
      })

      it('should log the room name when creating a new room', async () => {
        await getRoomAndIncrementImage(knexFake, '/new-room/')
        expect(loggerStub.mock.calls[0]?.[1]).toBe('/new-room/')
      })

      it('should log the page count when creating a new room', async () => {
        pages.pages = 7
        getCountsStub.mockResolvedValue(pages)
        await getRoomAndIncrementImage(knexFake, '/new-room/')
        expect(loggerStub.mock.calls[0]?.[2]).toBe(7)
      })

      it('should log the unread count when creating a new room', async () => {
        pages.unread = 42
        getCountsStub.mockResolvedValue(pages)
        await getRoomAndIncrementImage(knexFake, '/new-room/')
        expect(loggerStub.mock.calls[0]?.[3]).toBe(42)
      })

      it('should not log room-created when room already exists', async () => {
        Config.rooms['/existing/'] = {
          countdown: 60,
          path: '/existing/',
          pages: { pages: 0, page: 0, unread: 0, all: 0 },
          images: stockImages,
          index: 0,
          uriSafeImage: undefined,
        }
        await getRoomAndIncrementImage(knexFake, '/existing/')
        const hasCreateLog = loggerStub.mock.calls.some(isRoomCreatedCall)
        expect(hasCreateLog).toBe(false)
      })
    })
  })

  describe('index navigation', () => {
    let stockImages = pagedImages(Config.memorySize)
    let knexFake = stubToKnex({ knex: Math.random() })
    let getImagesStub: MockInstance = vi.fn()
    let getCountsStub: MockInstance = vi.fn()
    let markImageReadStub: MockInstance = vi.fn()
    let pages = { pages: 0, page: 0, unread: 0, all: 0 }
    beforeEach(() => {
      stockImages = pagedImages(Config.memorySize)
      knexFake = stubToKnex({ knex: Math.random() })
      pages = { pages: 0, page: 0, unread: 0, all: 0 }
      Config.rooms = {}
      Config.countdownDuration = 60
      Config.memorySize = 100
      getImagesStub = vi.spyOn(Internals, 'getImages').mockResolvedValue(stockImages)
      markImageReadStub = vi.spyOn(Internals, 'markImageRead').mockResolvedValue(undefined)
      getCountsStub = vi.spyOn(Internals, 'getCounts').mockResolvedValue(pages)
    })
    describe('when decrementing past the start of the current page', () => {
      let room = cast<SlideshowRoom>({})
      let second: string[] = []
      beforeEach(async () => {
        second = pagedImages(100)
        getImagesStub.mockResolvedValueOnce(pagedImages(200, 200)).mockResolvedValueOnce(second)
        pages.page = 10
        room = await getRoomAndIncrementImage(knexFake, '/path/')
        getCountsStub.mockClear()
        await getRoomAndIncrementImage(knexFake, '/path/', -1)
      })
      it('should call getCounts once', () => {
        expect(getCountsStub.mock.calls.length).toBe(1)
      })
      it('should call getCounts with 4 arguments', () => {
        expect(getCountsStub.mock.calls[0]).toHaveLength(4)
      })
      it('should pass knex to getCounts', () => {
        expect(getCountsStub.mock.calls[0]?.[0]).toBe(knexFake)
      })
      it('should pass path to getCounts', () => {
        expect(getCountsStub.mock.calls[0]?.[1]).toBe('/path/')
      })
      it('should pass current page to getCounts', () => {
        expect(getCountsStub.mock.calls[0]?.[2]).toBe(10)
      })
      it('should pass decrement mutator to getCounts', () => {
        expect(cast(getCountsStub.mock.calls[0]?.[3], isNumberMutator)(4)).toBe(3)
      })
      it('should reload images from the new page', () => {
        expect(getImagesStub.mock.calls.length).toBe(2)
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
        getImagesStub.mockResolvedValueOnce(second)
        await getRoomAndIncrementImage(knexFake, '/path/')
        await getRoomAndIncrementImage(knexFake, '/path/', STEP.BACK)
        getCountsStub.mockClear()
        await getRoomAndIncrementImage(knexFake, '/path/', STEP.BACK)
      })
      it('should call getCounts once', () => {
        expect(getCountsStub.mock.calls.length).toBe(1)
      })
      it('should call getCounts with 4 arguments', () => {
        expect(getCountsStub.mock.calls[0]).toHaveLength(4)
      })
      it('should pass knex to getCounts', () => {
        expect(getCountsStub.mock.calls[0]?.[0]).toBe(knexFake)
      })
      it('should pass path to getCounts', () => {
        expect(getCountsStub.mock.calls[0]?.[1]).toBe('/path/')
      })
      it('should pass current page to getCounts', () => {
        expect(getCountsStub.mock.calls[0]?.[2]).toBe(11)
      })
      it('should pass decrement mutator to getCounts', () => {
        expect(cast(getCountsStub.mock.calls[0]?.[3], isNumberMutator)(4)).toBe(3)
      })
      it('should reload images from the new page', () => {
        expect(getImagesStub.mock.calls.length).toBe(1)
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
        getImagesStub.mockResolvedValueOnce(pagedImages(200, 200)).mockResolvedValueOnce(second)
        room = await getRoomAndIncrementImage(knexFake, '/path/')
        await getRoomAndIncrementImage(knexFake, '/path/', STEP.BACK)
      })
      it('should set index to last image of new page', () => {
        expect(room.index).toBe(99)
      })
      it('should reload images from new page', () => {
        expect(getImagesStub.mock.calls.length).toBe(2)
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
        getImagesStub.mockResolvedValueOnce(pagedImages(200, 200)).mockResolvedValueOnce(second)
        room = await getRoomAndIncrementImage(knexFake, '/path/')
        room.index = room.images.length + STEP.BACK
        room.pages.page = 13
        getCountsStub.mockClear()
        await getRoomAndIncrementImage(knexFake, '/path/', STEP.FORWARD)
      })
      it('should call getCounts once', () => {
        expect(getCountsStub.mock.calls.length).toBe(1)
      })
      it('should call getCounts with 4 arguments', () => {
        expect(getCountsStub.mock.calls[0]).toHaveLength(4)
      })
      it('should pass knex to getCounts', () => {
        expect(getCountsStub.mock.calls[0]?.[0]).toBe(knexFake)
      })
      it('should pass path to getCounts', () => {
        expect(getCountsStub.mock.calls[0]?.[1]).toBe('/path/')
      })
      it('should pass current page to getCounts', () => {
        expect(getCountsStub.mock.calls[0]?.[2]).toBe(13)
      })
      it('should pass increment mutator to getCounts', () => {
        expect(cast(getCountsStub.mock.calls[0]?.[3], isNumberMutator)(4)).toBe(5)
      })
      it('should reload images from the new page', () => {
        expect(getImagesStub.mock.calls.length).toBe(2)
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
        expect(getImagesStub.mock.calls.length).toBe(0)
      })
      it('should not call getCounts when images is already empty', () => {
        expect(getCountsStub.mock.calls.length).toBe(0)
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
        expect(getImagesStub.mock.calls.length).toBe(0)
      })
      it('should not call getCounts when images is already empty', () => {
        expect(getCountsStub.mock.calls.length).toBe(0)
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
        getImagesStub.mockResolvedValue(pagedImages(1))
        room = await getRoomAndIncrementImage(knexFake, '/path/')
        getImagesStub.mockResolvedValue([])
        getImagesStub.mockClear()
        getCountsStub.mockClear()
        markImageReadStub.mockClear()
        await getRoomAndIncrementImage(knexFake, '/path/', 1)
      })
      it('should set index to 0', () => {
        expect(room.index).toBe(0)
      })
      it('should set uriSafeImage to empty string', () => {
        expect(room.uriSafeImage).toBe('')
      })
      it('should not call markImageRead for empty page', () => {
        expect(markImageReadStub.mock.calls.length).toBe(0)
      })
    })
    describe('when decrementing to a page with no images', () => {
      let room = cast<SlideshowRoom>({})
      beforeEach(async () => {
        getImagesStub.mockResolvedValue(pagedImages(200, 200))
        room = await getRoomAndIncrementImage(knexFake, '/path/')
        getImagesStub.mockResolvedValue([])
        getImagesStub.mockClear()
        getCountsStub.mockClear()
        markImageReadStub.mockClear()
        await getRoomAndIncrementImage(knexFake, '/path/', -1)
      })
      it('should set index to 0', () => {
        expect(room.index).toBe(0)
      })
      it('should set uriSafeImage to empty string', () => {
        expect(room.uriSafeImage).toBe('')
      })
      it('should not call markImageRead for empty page', () => {
        expect(markImageReadStub.mock.calls.length).toBe(0)
      })
    })
    describe('when ticking a room after decrement landed on an empty page', () => {
      let room = cast<SlideshowRoom>({})
      beforeEach(async () => {
        getImagesStub.mockResolvedValueOnce(pagedImages(200, 200)).mockResolvedValueOnce([])
        room = await getRoomAndIncrementImage(knexFake, '/path/')
        await getRoomAndIncrementImage(knexFake, '/path/', -1)
        getImagesStub.mockClear()
        getCountsStub.mockClear()
        await getRoomAndIncrementImage(knexFake, '/path/', 1)
      })
      it('should not call advancePage again on subsequent tick', () => {
        expect(getImagesStub.mock.calls.length).toBe(0)
      })
      it('should not call getCounts again on subsequent tick', () => {
        expect(getCountsStub.mock.calls.length).toBe(0)
      })
      it('should keep index at 0', () => {
        expect(room.index).toBe(0)
      })
    })
    describe('countdown reset behavior', () => {
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

  describe('unread to all-images mode transition', () => {
    let knexFake = stubToKnex({ knex: Math.random() })
    let getImagesStub: MockInstance = vi.fn()
    let getCountsStub: MockInstance = vi.fn()
    let markImageReadStub: MockInstance = vi.fn()
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
      knexFake = stubToKnex({ knex: Math.random() })
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
      getImagesStub = vi.spyOn(Internals, 'getImages').mockResolvedValue([])
      markImageReadStub = vi.spyOn(Internals, 'markImageRead').mockResolvedValue(undefined)
      getCountsStub = vi.spyOn(Internals, 'getCounts')
      getCountsStub.mockResolvedValueOnce(transitionPages)
      getCountsStub.mockResolvedValueOnce(freshPages)
      Config.rooms['/path/'] = unreadRoom
    })
    it('it should call getCounts twice when transitioning from unread to all-images on increment', async () => {
      await getRoomAndIncrementImage(knexFake, '/path/', 1)
      expect(getCountsStub.mock.calls.length).toBe(2)
    })
    it('it should call second getCounts with no currentPage on unread to all-images transition on increment', async () => {
      await getRoomAndIncrementImage(knexFake, '/path/', 1)
      expect(getCountsStub.mock.calls[1]).toHaveLength(2)
    })
    it('it should call second getCounts with knex on unread to all-images transition on increment', async () => {
      await getRoomAndIncrementImage(knexFake, '/path/', 1)
      expect(getCountsStub.mock.calls[1]?.[0]).toBe(knexFake)
    })
    it('it should call second getCounts with path on unread to all-images transition on increment', async () => {
      await getRoomAndIncrementImage(knexFake, '/path/', 1)
      expect(getCountsStub.mock.calls[1]?.[1]).toBe('/path/')
    })
    it('it should load images from fresh random page on unread to all-images transition on increment', async () => {
      await getRoomAndIncrementImage(knexFake, '/path/', 1)
      expect(getImagesStub.mock.calls[0]?.[2]).toBe(freshPages.page)
    })
    it('it should call getCounts twice when transitioning from unread to all-images on decrement', async () => {
      unreadRoom.index = 0
      await getRoomAndIncrementImage(knexFake, '/path/', -1)
      expect(getCountsStub.mock.calls.length).toBe(2)
    })
    it('it should call second getCounts with no currentPage on unread to all-images transition on decrement', async () => {
      unreadRoom.index = 0
      await getRoomAndIncrementImage(knexFake, '/path/', -1)
      expect(getCountsStub.mock.calls[1]).toHaveLength(2)
    })
    it('it should load images from fresh random page on unread to all-images transition on decrement', async () => {
      unreadRoom.index = 0
      await getRoomAndIncrementImage(knexFake, '/path/', -1)
      expect(getImagesStub.mock.calls[0]?.[2]).toBe(freshPages.page)
    })
    it('it should not call getCounts twice when unread remains above zero on increment', async () => {
      getCountsStub.mockReset()
      getCountsStub.mockResolvedValue({ ...transitionPages, unread: 3 })
      await getRoomAndIncrementImage(knexFake, '/path/', 1)
      expect(getCountsStub.mock.calls.length).toBe(1)
    })
    it('it should not call getCounts twice when unread remains above zero on decrement', async () => {
      unreadRoom.index = 0
      getCountsStub.mockReset()
      getCountsStub.mockResolvedValue({ ...transitionPages, unread: 3 })
      await getRoomAndIncrementImage(knexFake, '/path/', -1)
      expect(getCountsStub.mock.calls.length).toBe(1)
    })
    it('it should not call getCounts twice when already in all-images mode on increment', async () => {
      unreadRoom.pages.unread = 0
      await getRoomAndIncrementImage(knexFake, '/path/', 1)
      expect(getCountsStub.mock.calls.length).toBe(1)
    })
    it('it should not call getCounts twice when already in all-images mode on decrement', async () => {
      unreadRoom.pages.unread = 0
      unreadRoom.index = 0
      await getRoomAndIncrementImage(knexFake, '/path/', -1)
      expect(getCountsStub.mock.calls.length).toBe(1)
    })
    it('it should call markImageRead once on unread to all-images transition on increment', async () => {
      getImagesStub.mockResolvedValue(['/new_image.png'])
      await getRoomAndIncrementImage(knexFake, '/path/', 1)
      expect(markImageReadStub.mock.calls.length).toBe(1)
    })
    it('it should call markImageRead with knex on unread to all-images transition on increment', async () => {
      getImagesStub.mockResolvedValue(['/new_image.png'])
      await getRoomAndIncrementImage(knexFake, '/path/', 1)
      expect(markImageReadStub.mock.calls[0]?.[0]).toBe(knexFake)
    })
    it('it should call markImageRead with the first fresh image on unread to all-images transition on increment', async () => {
      getImagesStub.mockResolvedValue(['/new_image.png'])
      await getRoomAndIncrementImage(knexFake, '/path/', 1)
      expect(markImageReadStub.mock.calls[0]?.[1]).toBe('/new_image.png')
    })
    it('it should call markImageRead once on unread to all-images transition on decrement', async () => {
      unreadRoom.index = 0
      getImagesStub.mockResolvedValue(['/prev_a.png', '/prev_b.png'])
      await getRoomAndIncrementImage(knexFake, '/path/', -1)
      expect(markImageReadStub.mock.calls.length).toBe(1)
    })
    it('it should call markImageRead with knex on unread to all-images transition on decrement', async () => {
      unreadRoom.index = 0
      getImagesStub.mockResolvedValue(['/prev_a.png', '/prev_b.png'])
      await getRoomAndIncrementImage(knexFake, '/path/', -1)
      expect(markImageReadStub.mock.calls[0]?.[0]).toBe(knexFake)
    })
    it('it should call markImageRead with the last fresh image on unread to all-images transition on decrement', async () => {
      unreadRoom.index = 0
      getImagesStub.mockResolvedValue(['/prev_a.png', '/prev_b.png'])
      await getRoomAndIncrementImage(knexFake, '/path/', -1)
      expect(markImageReadStub.mock.calls[0]?.[1]).toBe('/prev_b.png')
    })
    it('it should not call markImageRead when no images are available after transition', async () => {
      await getRoomAndIncrementImage(knexFake, '/path/', 1)
      expect(markImageReadStub.mock.calls.length).toBe(0)
    })
  })
})

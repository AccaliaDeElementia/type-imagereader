'use sanity'

import Sinon from 'sinon'
import { StubToKnex } from '#testutils/TypeGuards.js'
import { STEP } from '#utils/helpers.js'
import { expect } from 'chai'
import { Config, Functions, Imports } from '#routes/slideshow.js'

const sandbox = Sinon.createSandbox()

describe('routes/slideshow function GetRoomAndIncrementImage() room initialisation', () => {
  let stockImages = Array(Config.memorySize)
    .fill(undefined)
    .map((_, i) => `/image${i}.png`)
  let knexFake = StubToKnex({ knex: Math.random() })
  let getImagesStub = sandbox.stub()
  let getCountsStub = sandbox.stub()
  let markImageReadStub = sandbox.stub()
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
  it('it should create a room when the room does not exist in the cache', async () => {
    await Functions.GetRoomAndIncrementImage(knexFake, '/images!/')
    expect(Config.rooms['/images!/']).to.not.equal(undefined)
  })
  it('it should resolve to created room', async () => {
    const result = await Functions.GetRoomAndIncrementImage(knexFake, '/images!/')
    expect(result).to.equal(Config.rooms['/images!/'])
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
    getCountsStub.callsFake(async () => {
      // Simulate a concurrent call completing and populating Config.rooms before this one finishes
      Config.rooms['/images!/'] = concurrentRoom
      return await Promise.resolve(pages)
    })
    await Functions.GetRoomAndIncrementImage(knexFake, '/images!/')
    expect(Config.rooms['/images!/']).to.equal(concurrentRoom)
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
    getCountsStub.callsFake(async () => {
      Config.rooms['/images!/'] = concurrentRoom
      return await Promise.resolve(pages)
    })
    const result = await Functions.GetRoomAndIncrementImage(knexFake, '/images!/')
    expect(result).to.equal(concurrentRoom)
  })
  it('it should set expected countdown duration on new room', async () => {
    Config.countdownDuration = 69
    const room = await Functions.GetRoomAndIncrementImage(knexFake, '/images!/')
    expect(room.countdown).to.equal(69)
  })
  it('it should set expected path on new room', async () => {
    const name = `/path/${Math.random()}/`
    const room = await Functions.GetRoomAndIncrementImage(knexFake, name)
    expect(room.path).to.equal(name)
  })
  it('it should retrieve image counts with GetCounts()', async () => {
    const name = `/path/${Math.random()}/`
    await Functions.GetRoomAndIncrementImage(knexFake, name)
    expect(getCountsStub.callCount).to.equal(1)
  })
  it('it should pass knex to GetCounts()', async () => {
    const name = `/path/${Math.random()}/`
    await Functions.GetRoomAndIncrementImage(knexFake, name)
    expect(getCountsStub.firstCall.args[0]).to.equal(knexFake)
  })
  it('it should pass path to GetCounts()', async () => {
    const name = `/path/${Math.random()}/`
    await Functions.GetRoomAndIncrementImage(knexFake, name)
    expect(getCountsStub.firstCall.args[1]).to.equal(name)
  })
  it('it should set pages config in result', async () => {
    const name = `/path/${Math.random()}/`
    const room = await Functions.GetRoomAndIncrementImage(knexFake, name)
    expect(room.pages).to.equal(pages)
  })
  it('it should get seed images on new room', async () => {
    Config.memorySize = 42
    pages.page = 92
    const name = `/path/${Math.random()}/`
    await Functions.GetRoomAndIncrementImage(knexFake, name)
    expect(getImagesStub.callCount).to.equal(1)
  })
  it('it should pass knex to GetImages() to seed images on new room', async () => {
    Config.memorySize = 42
    pages.page = 92
    const name = `/path/${Math.random()}/`
    await Functions.GetRoomAndIncrementImage(knexFake, name)
    expect(getImagesStub.firstCall.args[0]).to.equal(knexFake)
  })
  it('it should pass path to GetImages() to seed images on new room', async () => {
    Config.memorySize = 42
    pages.page = 92
    const name = `/path/${Math.random()}/`
    await Functions.GetRoomAndIncrementImage(knexFake, name)
    expect(getImagesStub.firstCall.args[1]).to.equal(name)
  })
  it('it should pass current page to GetImages() to seed images on new room', async () => {
    Config.memorySize = 42
    pages.page = 92
    const name = `/path/${Math.random()}/`
    await Functions.GetRoomAndIncrementImage(knexFake, name)
    expect(getImagesStub.firstCall.args[2]).to.equal(92)
  })
  it('it should pass page size to GetImages() to seed images on new room', async () => {
    Config.memorySize = 42
    pages.page = 92
    const name = `/path/${Math.random()}/`
    await Functions.GetRoomAndIncrementImage(knexFake, name)
    expect(getImagesStub.firstCall.args[3]).to.equal(42)
  })
  it('it should set default index on new room', async () => {
    const room = await Functions.GetRoomAndIncrementImage(knexFake, '/path/')
    expect(room.index).to.equal(0)
  })
  it('it should ignore negative increment on new room', async () => {
    const room = await Functions.GetRoomAndIncrementImage(knexFake, '/path/', STEP.BACK)
    expect(room.index).to.equal(0)
  })
  it('it should ignore positive increment on new room', async () => {
    const room = await Functions.GetRoomAndIncrementImage(knexFake, '/path2/', STEP.FORWARD)
    expect(room.index).to.equal(0)
  })
  it('it should set uriSafeImage', async () => {
    const room = await Functions.GetRoomAndIncrementImage(knexFake, '/images!/')
    expect(room.uriSafeImage).to.equal('/image0.png')
  })
  it('it should set uriSafeImage using encodeUriComponent', async () => {
    stockImages[0] = '/foo?/#bar/%image.gif'
    const room = await Functions.GetRoomAndIncrementImage(knexFake, '/images!/')
    expect(room.uriSafeImage).to.equal('/foo%3F/%23bar/%25image.gif')
  })
  it('it should set uriSafeImage to blank if there are no pictures', async () => {
    stockImages = []
    getImagesStub.resolves([])
    const room = await Functions.GetRoomAndIncrementImage(knexFake, '/images!/')
    expect(room.uriSafeImage).to.equal('')
  })
  it('it should call MarkImageRead if there are pictures on fetch', async () => {
    await Functions.GetRoomAndIncrementImage(knexFake, '/images!/')
    expect(markImageReadStub.callCount).to.equal(1)
  })
  it('it should call MarkImageRead with 2 arguments if there are pictures on fetch', async () => {
    await Functions.GetRoomAndIncrementImage(knexFake, '/images!/')
    expect(markImageReadStub.firstCall.args).to.have.lengthOf(2)
  })
  it('it should pass knex to MarkImageRead if there are pictures on fetch', async () => {
    await Functions.GetRoomAndIncrementImage(knexFake, '/images!/')
    expect(markImageReadStub.firstCall.args[0]).to.equal(knexFake)
  })
  it('it should pass first image path to MarkImageRead if there are pictures on fetch', async () => {
    await Functions.GetRoomAndIncrementImage(knexFake, '/images!/')
    expect(markImageReadStub.firstCall.args[1]).to.equal('/image0.png')
  })
  it('it should omit call to MarkImageRead if there are no pictures', async () => {
    stockImages = []
    getImagesStub.resolves([])
    await Functions.GetRoomAndIncrementImage(knexFake, '/images!/')
    expect(markImageReadStub.callCount).to.equal(0)
  })

  describe('logging', () => {
    let loggerStub = sandbox.stub()
    const ROOM_CREATED_FORMAT = 'slideshow room created: %s (pages=%d unread=%d)'
    const isRoomCreatedCall = (c: Sinon.SinonSpyCall): boolean => c.args[0] === ROOM_CREATED_FORMAT
    beforeEach(() => {
      loggerStub = sandbox.stub(Imports, 'logger')
    })

    it('should log room-created format when creating a new room', async () => {
      pages.pages = 5
      pages.unread = 12
      getCountsStub.resolves(pages)
      await Functions.GetRoomAndIncrementImage(knexFake, '/new-room/')
      expect(loggerStub.firstCall.args[0]).to.equal('slideshow room created: %s (pages=%d unread=%d)')
    })

    it('should log the room name when creating a new room', async () => {
      await Functions.GetRoomAndIncrementImage(knexFake, '/new-room/')
      expect(loggerStub.firstCall.args[1]).to.equal('/new-room/')
    })

    it('should log the page count when creating a new room', async () => {
      pages.pages = 7
      getCountsStub.resolves(pages)
      await Functions.GetRoomAndIncrementImage(knexFake, '/new-room/')
      expect(loggerStub.firstCall.args[2]).to.equal(7)
    })

    it('should log the unread count when creating a new room', async () => {
      pages.unread = 42
      getCountsStub.resolves(pages)
      await Functions.GetRoomAndIncrementImage(knexFake, '/new-room/')
      expect(loggerStub.firstCall.args[3]).to.equal(42)
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
      await Functions.GetRoomAndIncrementImage(knexFake, '/existing/')
      const hasCreateLog = loggerStub.getCalls().some(isRoomCreatedCall)
      expect(hasCreateLog).to.equal(false)
    })
  })
})

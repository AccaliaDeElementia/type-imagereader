'use sanity'

import Sinon from 'sinon'
import { StubToKnex } from '../../../../testutils/TypeGuards'
import { expect } from 'chai'
import { Config, Functions } from '../../../../routes/slideshow'

describe('routes/slideshow function GetRoomAndIncrementImage() room initialisation', () => {
  let stockImages = Array(Config.memorySize)
    .fill(undefined)
    .map((_, i) => `/image${i}.png`)
  let knexFake = StubToKnex({ knex: Math.random() })
  let getImagesStub = Sinon.stub()
  let getCountsStub = Sinon.stub()
  let markImageReadStub = Sinon.stub()
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
    getImagesStub = Sinon.stub(Functions, 'GetImages').resolves(stockImages)
    markImageReadStub = Sinon.stub(Functions, 'MarkImageRead').resolves()
    getCountsStub = Sinon.stub(Functions, 'GetCounts').resolves(pages)
  })
  afterEach(() => {
    getCountsStub.restore()
    getImagesStub.restore()
    markImageReadStub.restore()
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
  it('it should ignore increment on new room', async () => {
    const room = await Functions.GetRoomAndIncrementImage(knexFake, '/path/', -10)
    expect(room.index).to.equal(0)
    const room2 = await Functions.GetRoomAndIncrementImage(knexFake, '/path2/', 5)
    expect(room2.index).to.equal(0)
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
})

'use sanity'

import Sinon from 'sinon'
import { Cast, StubToKnex } from '../../testutils/TypeGuards'
import { expect } from 'chai'
import { Config, Functions } from '../../../routes/slideshow'

describe('routes/slideshow function GetRoomAndIncrementImage()', () => {
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
    getImagesStub = Sinon.stub()
    getCountsStub = Sinon.stub()
    markImageReadStub = Sinon.stub()
    pages = {
      pages: 0,
      page: 0,
      unread: 0,
      all: 0,
    }
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
  it('it should set expected countdown duration on new room', async () => {
    Config.countdownDuration = 69
    const room = await Functions.GetRoomAndIncrementImage(knexFake, '/images!/')
    expect(room.countdown).to.equal(69)
  })
  it('it should set expected path duration on new room', async () => {
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
  it('it pass path tp GetCounts()', async () => {
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
  it('it pass knex to GetImages() to seed images on new room', async () => {
    Config.memorySize = 42
    pages.page = 92
    const name = `/path/${Math.random()}/`
    await Functions.GetRoomAndIncrementImage(knexFake, name)
    expect(getImagesStub.firstCall.args[0]).to.equal(knexFake)
  })
  it('it should pass path tp GetImages() to seed images on new room', async () => {
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
    Config.memorySize = 100
    const room = await Functions.GetRoomAndIncrementImage(knexFake, '/path/')
    expect(room.index).to.equal(0)
  })
  it('it should ignore increment on new room', async () => {
    Config.memorySize = 100
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
  it('it should move back one page reversing off the end of history', async () => {
    const first = Array(200)
      .fill(undefined)
      .map((_, i) => `/image${i + 200}.png`)
    const second = Array(100)
      .fill(undefined)
      .map((_, i) => `/image${i}.png`)
    getImagesStub.onFirstCall().resolves(first).onSecondCall().resolves(second)
    pages.page = 10
    Config.memorySize = 100
    const room = await Functions.GetRoomAndIncrementImage(knexFake, '/path/')
    expect(getImagesStub.callCount).to.equal(1)
    expect(room.index).to.equal(0)
    getCountsStub.resetHistory()
    await Functions.GetRoomAndIncrementImage(knexFake, '/path/', -1)
    expect(getCountsStub.callCount).to.equal(1)
    expect(getCountsStub.firstCall.args).to.have.lengthOf(4)
    expect(getCountsStub.firstCall.args[0]).to.equal(knexFake)
    expect(getCountsStub.firstCall.args[1]).to.equal('/path/')
    expect(getCountsStub.firstCall.args[2]).to.equal(10)
    expect(
      Cast(getCountsStub.firstCall.args[3], (o: unknown): o is (_: number) => number => typeof o === 'function')(4),
    ).to.equal(3)
    expect(getImagesStub.callCount).to.equal(2)
    expect(room.index).to.equal(99)
    expect(room.images).to.deep.equal(second)
  })
  it('it should rotate memory backwards when reversing off the end of history with small folder', async () => {
    const first = Array(20)
      .fill(undefined)
      .map((_, i) => `/image${i + 200}.png`)
    const second = Array(30)
      .fill(undefined)
      .map((_, i) => `/image${i}.png`)
    const room = {
      countdown: 50,
      images: first,
      path: '/path/',
      index: 10,
      uriSafeImage: undefined,
      pages: {
        unread: 0,
        all: 0,
        pages: 0,
        page: 11,
      },
    }
    Config.rooms['/path/'] = room
    getImagesStub.onFirstCall().resolves(second)
    Config.memorySize = 100
    await Functions.GetRoomAndIncrementImage(knexFake, '/path/')
    expect(room.index).to.equal(10)
    expect(getImagesStub.callCount).to.equal(0)
    await Functions.GetRoomAndIncrementImage(knexFake, '/path/', -10)
    expect(getImagesStub.callCount).to.equal(0)
    expect(room.index).to.equal(0)
    getCountsStub.resetHistory()
    await Functions.GetRoomAndIncrementImage(knexFake, '/path/', -1)
    expect(getCountsStub.callCount).to.equal(1)
    expect(getCountsStub.firstCall.args).to.have.lengthOf(4)
    expect(getCountsStub.firstCall.args[0]).to.equal(knexFake)
    expect(getCountsStub.firstCall.args[1]).to.equal('/path/')
    expect(getCountsStub.firstCall.args[2]).to.equal(11)
    expect(
      Cast(getCountsStub.firstCall.args[3], (o: unknown): o is (_: number) => number => typeof o === 'function')(4),
    ).to.equal(3)
    expect(getImagesStub.callCount).to.equal(1)
    expect(room.index).to.equal(29)
    expect(room.images).to.have.lengthOf(30)
    expect(room.images).to.deep.equal(second)
  })
  it('it should rotate memory backwards when reversing far off the end of history', async () => {
    const first = Array(200)
      .fill(undefined)
      .map((_, i) => `/image${i + 200}.png`)
    const second = Array(100)
      .fill(undefined)
      .map((_, i) => `/image${i}.png`)
    getImagesStub.onFirstCall().resolves(first).onSecondCall().resolves(second)
    Config.memorySize = 100
    const room = await Functions.GetRoomAndIncrementImage(knexFake, '/path/')
    expect(room.index).to.equal(0)
    expect(getImagesStub.callCount).to.equal(1)
    await Functions.GetRoomAndIncrementImage(knexFake, '/path/', -1000)
    expect(room.index).to.equal(99)
    expect(getImagesStub.callCount).to.equal(2)
    expect(room.images).to.have.lengthOf(100)
    expect(room.images).to.equal(second)
  })
  it('it should rotate memory forwards when incrementing off the end of history', async () => {
    const first = Array(200)
      .fill(undefined)
      .map((_, i) => `/image${i + 200}.png`)
    const second = Array(100)
      .fill(undefined)
      .map((_, i) => `/image${i}.png`)
    getImagesStub.onFirstCall().resolves(first).onSecondCall().resolves(second)
    Config.memorySize = 100
    const room = await Functions.GetRoomAndIncrementImage(knexFake, '/path/')
    expect(room.index).to.equal(0)
    expect(getImagesStub.callCount).to.equal(1)
    await Functions.GetRoomAndIncrementImage(knexFake, '/path/', 199)
    expect(getImagesStub.callCount).to.equal(1)
    expect(room.index).to.equal(199)
    room.pages.page = 13
    getCountsStub.resetHistory()
    await Functions.GetRoomAndIncrementImage(knexFake, '/path/', 1)
    expect(getCountsStub.callCount).to.equal(1)
    expect(getCountsStub.firstCall.args).to.have.lengthOf(4)
    expect(getCountsStub.firstCall.args[0]).to.equal(knexFake)
    expect(getCountsStub.firstCall.args[1]).to.equal('/path/')
    expect(getCountsStub.firstCall.args[2]).to.equal(13)
    expect(
      Cast(getCountsStub.firstCall.args[3], (o: unknown): o is (_: number) => number => typeof o === 'function')(4),
    ).to.equal(5)
    expect(getImagesStub.callCount).to.equal(2)
    expect(room.index).to.equal(0)
    expect(room.images).to.have.lengthOf(100)
    expect(room.images).to.equal(second)
  })
  it('it should call to MarkImageRead if there are pictures on fetch', async () => {
    await Functions.GetRoomAndIncrementImage(knexFake, '/images!/')
    expect(markImageReadStub.callCount).to.equal(1)
    expect(markImageReadStub.firstCall.args).to.have.lengthOf(2)
    expect(markImageReadStub.firstCall.args[0]).to.equal(knexFake)
    expect(markImageReadStub.firstCall.args[1]).to.equal('/image0.png')
  })
  it('it should omit call to MarkImageRead if there are no pictures', async () => {
    stockImages = []
    getImagesStub.resolves([])
    await Functions.GetRoomAndIncrementImage(knexFake, '/images!/')
    expect(markImageReadStub.callCount).to.equal(0)
  })
  it('it should not reset countdown when no increment specified', async () => {
    const first = Array(20)
      .fill(undefined)
      .map((_, i) => `/image${i}.png`)
    const room = {
      countdown: 50,
      images: first,
      path: '/path/',
      index: 10,
      uriSafeImage: undefined,
      pages: {
        unread: 0,
        all: 0,
        pages: 0,
        page: 11,
      },
    }
    Config.rooms['/path/'] = room
    Config.countdownDuration = 100
    await Functions.GetRoomAndIncrementImage(knexFake, '/path/')
    expect(room.countdown).to.equal(50)
  })
  it('it should not reset countdown when zero increment specified', async () => {
    const first = Array(20)
      .fill(undefined)
      .map((_, i) => `/image${i}.png`)
    const room = {
      countdown: 50,
      images: first,
      path: '/path/',
      index: 10,
      uriSafeImage: undefined,
      pages: {
        unread: 0,
        all: 0,
        pages: 0,
        page: 11,
      },
    }
    Config.rooms['/path/'] = room
    Config.countdownDuration = 100
    await Functions.GetRoomAndIncrementImage(knexFake, '/path/', 0)
    expect(room.countdown).to.equal(50)
  })
  it('it should reset countdown when negative increment specified', async () => {
    const first = Array(20)
      .fill(undefined)
      .map((_, i) => `/image${i}.png`)
    const room = {
      countdown: 50,
      images: first,
      path: '/path/',
      index: 10,
      uriSafeImage: undefined,
      pages: {
        unread: 0,
        all: 0,
        pages: 0,
        page: 11,
      },
    }
    Config.rooms['/path/'] = room
    Config.countdownDuration = 100
    await Functions.GetRoomAndIncrementImage(knexFake, '/path/', -1)
    expect(room.countdown).to.equal(100)
  })
  it('it should reset countdown when positive increment specified', async () => {
    const first = Array(20)
      .fill(undefined)
      .map((_, i) => `/image${i}.png`)
    const room = {
      countdown: 50,
      images: first,
      path: '/path/',
      index: 10,
      uriSafeImage: undefined,
      pages: {
        unread: 0,
        all: 0,
        pages: 0,
        page: 11,
      },
    }
    Config.rooms['/path/'] = room
    Config.countdownDuration = 100
    await Functions.GetRoomAndIncrementImage(knexFake, '/path/', 1)
    expect(room.countdown).to.equal(100)
  })
})

'use sanity'

import { expect } from 'chai'
import { suite, test } from '@testdeck/mocha'
import Sinon, * as sinon from 'sinon'

import { Application, Router } from 'express'
import { Server } from 'http'
import { Server as WebSocketServer, Socket } from 'socket.io'
import { StatusCodes } from 'http-status-codes'
import { Knex } from 'knex'

import { getRouter, Config, Functions, Imports } from '../../routes/slideshow'
import persistance from '../../utils/persistance'

import assert from 'assert'

@suite
export class SlideshowGetImagesTests {
  KnexInstance = {
    select: sinon.stub().returnsThis(),
    where: sinon.stub().returnsThis(),
    orderBy: sinon.stub().returnsThis(),
    orderByRaw: sinon.stub().returnsThis(),
    limit: sinon.stub().resolves([])
  }

  KnexStub = sinon.stub().returns(this.KnexInstance)
  KnexFake = this.KnexStub as unknown as Knex

  @test
  async 'it should select from pictures table' () {
    await Functions.GetImages(this.KnexFake, '/foo/bar/', 40)
    expect(this.KnexStub.callCount).to.equal(1)
    expect(this.KnexStub.firstCall.args).to.deep.equal(['pictures'])
  }

  @test
  async 'it should select only the path column' () {
    await Functions.GetImages(this.KnexFake, '/foo/bar/', 40)
    expect(this.KnexInstance.select.callCount).to.equal(1)
    expect(this.KnexInstance.select.firstCall.args).to.deep.equal(['path'])
  }

  @test
  async 'it should filter to path prefix' () {
    await Functions.GetImages(this.KnexFake, '/foo/bar/', 40)
    expect(this.KnexInstance.where.callCount).to.equal(1)
    expect(this.KnexInstance.where.firstCall.args).to.deep.equal(['path', 'like', '/foo/bar/%'])
  }

  @test
  async 'it should order by seen to prioritize unseen images' () {
    await Functions.GetImages(this.KnexFake, '/foo/bar/', 40)
    expect(this.KnexInstance.orderBy.callCount).to.equal(1)
    expect(this.KnexInstance.orderBy.firstCall.args).to.deep.equal(['seen'])
  }

  @test
  async 'it should second order sort on RANDOM()' () {
    await Functions.GetImages(this.KnexFake, '/foo/bar/', 40)
    expect(this.KnexInstance.orderByRaw.callCount).to.equal(1)
    expect(this.KnexInstance.orderByRaw.firstCall.args).to.deep.equal(['RANDOM()'])
  }

  @test
  async 'it should limit to requested count' () {
    await Functions.GetImages(this.KnexFake, '/foo/bar/', 40)
    expect(this.KnexInstance.limit.callCount).to.equal(1)
    expect(this.KnexInstance.limit.firstCall.args).to.deep.equal([40])
  }

  @test
  async 'it should extract paths from results' () {
    const input = [
      { path: '/foo/image.txt' },
      { path: '/foo/spreadhseet.png' },
      { path: '/foo/program.mp4' },
      { path: '/foo/movie.xls' },
      { path: '/foo/webpage.exe' }
    ]
    this.KnexInstance.limit.resolves(input)
    const images = await Functions.GetImages(this.KnexFake, '/foo/bar', 69)
    const result = ['/foo/image.txt', '/foo/spreadhseet.png', '/foo/program.mp4',
      '/foo/movie.xls', '/foo/webpage.exe']
    expect(images).to.deep.equal(result)
  }
}

@suite
export class SlidewhowMarkImageReadTests {
  KnexFirstInstance = {
    select: sinon.stub().returnsThis(),
    where: sinon.stub().resolves()
  }

  KnexSecondInstance = {
    increment: sinon.stub().returnsThis(),
    whereIn: sinon.stub().resolves()
  }

  KnexThirdInstance = {
    update: sinon.stub().returnsThis(),
    where: sinon.stub().resolves()
  }

  KnexStub = sinon.stub()
    .onFirstCall().returns(this.KnexFirstInstance)
    .onSecondCall().returns(this.KnexSecondInstance)
    .onThirdCall().returns(this.KnexThirdInstance)

  KnexFake = this.KnexStub as unknown as Knex

  @test
  async 'it should select from database to test if image is seen' () {
    await Functions.MarkImageRead(this.KnexFake, '/foo/bar/baz.png')
    expect(this.KnexStub.callCount).to.be.greaterThanOrEqual(1)
    expect(this.KnexStub.firstCall.args).to.deep.equal(['pictures'])
    expect(this.KnexFirstInstance.select.callCount).to.equal(1)
    expect(this.KnexFirstInstance.select.firstCall.args).to.deep.equal(['seen'])
    expect(this.KnexFirstInstance.where.callCount).to.equal(1)
    expect(this.KnexFirstInstance.where.firstCall.args).to.deep.equal([{
      seen: false,
      path: '/foo/bar/baz.png'
    }])
  }

  @test
  async 'it should abort when select resolved to nothing' () {
    this.KnexFirstInstance.where.resolves()
    await Functions.MarkImageRead(this.KnexFake, '/foo/bar/baz.png')
    expect(this.KnexStub.callCount).to.be.equal(1)
  }

  @test
  async 'it should abort when select resolved to empty' () {
    this.KnexFirstInstance.where.resolves([])
    await Functions.MarkImageRead(this.KnexFake, '/foo/bar/baz.png')
    expect(this.KnexStub.callCount).to.be.equal(1)
  }

  @test
  async 'it should continue when select resolves to record' () {
    this.KnexFirstInstance.where.resolves([{ seen: false }])
    await Functions.MarkImageRead(this.KnexFake, '/foo/bar/baz.png')
    expect(this.KnexStub.callCount).to.be.greaterThan(1)
  }

  @test
  async 'it should increment seen counts for all parent folders' () {
    this.KnexFirstInstance.where.resolves([{ seen: false }])
    await Functions.MarkImageRead(this.KnexFake, '/foo/bar/baz.png')
    expect(this.KnexStub.callCount).to.be.greaterThanOrEqual(2)
    expect(this.KnexStub.secondCall.args).to.deep.equal(['folders'])
    expect(this.KnexSecondInstance.increment.callCount).to.equal(1)
    expect(this.KnexSecondInstance.increment.firstCall.args).to.deep.equal(['seenCount', 1])
    expect(this.KnexSecondInstance.whereIn.callCount).to.equal(1)
    expect(this.KnexSecondInstance.whereIn.firstCall.args).to.deep.equal([
      'path',
      ['/foo/bar/', '/foo/', '/']
    ])
  }

  @test
  async 'it should update seen status for image' () {
    this.KnexFirstInstance.where.resolves([{ seen: false }])
    await Functions.MarkImageRead(this.KnexFake, '/foo/bar/baz.png')
    expect(this.KnexStub.callCount).to.be.greaterThanOrEqual(3)
    expect(this.KnexStub.thirdCall.args).to.deep.equal(['pictures'])
    expect(this.KnexThirdInstance.update.callCount).to.equal(1)
    expect(this.KnexThirdInstance.update.firstCall.args).to.deep.equal([{
      seen: true
    }])
    expect(this.KnexThirdInstance.where.callCount).to.equal(1)
    expect(this.KnexThirdInstance.where.firstCall.args).to.deep.equal([{
      path: '/foo/bar/baz.png'
    }])
  }
}

@suite
export class SlideshowGetRoomAndIncrementImageTests {
  StockImages = Array(Config.memorySize * 2).fill(undefined).map((_, i) => `/image${i}.png`)
  KnexFake = { knex: Math.random() } as unknown as Knex
  GetImagesStub?: Sinon.SinonStub
  MarkImageReadStub?: Sinon.SinonStub

  before () {
    Config.rooms = {}
    Config.countdownDuration = 60
    Config.memorySize = 100
    this.GetImagesStub = sinon.stub(Functions, 'GetImages').resolves(this.StockImages)
    this.MarkImageReadStub = sinon.stub(Functions, 'MarkImageRead').resolves()
  }

  after () {
    this.GetImagesStub?.restore()
    this.MarkImageReadStub?.restore()
    Config.countdownDuration = 60
    Config.memorySize = 100
  }

  @test
  async 'it should create a room when the room does not exist in the cache' () {
    await Functions.GetRoomAndIncrementImage(this.KnexFake, '/images!/')
    expect(Config.rooms['/images!/']).to.not.equal(undefined)
  }

  @test
  async 'it should resolve to created room' () {
    const result = await Functions.GetRoomAndIncrementImage(this.KnexFake, '/images!/')
    expect(result).to.equal(Config.rooms['/images!/'])
  }

  @test
  async 'it should set expected countdown duration on new room' () {
    Config.countdownDuration = 69
    const room = await Functions.GetRoomAndIncrementImage(this.KnexFake, '/images!/')
    expect(room.countdown).to.equal(69)
  }

  @test
  async 'it should set expected path duration on new room' () {
    const name = `/path/${Math.random()}/`
    const room = await Functions.GetRoomAndIncrementImage(this.KnexFake, name)
    expect(room.path).to.equal(name)
  }

  @test
  async 'it should get seed images on new room' () {
    Config.memorySize = 42
    const name = `/path/${Math.random()}/`
    await Functions.GetRoomAndIncrementImage(this.KnexFake, name)
    expect(this.GetImagesStub?.callCount).to.equal(1)
    expect(this.GetImagesStub?.firstCall.args).to.have.lengthOf(3)
    expect(this.GetImagesStub?.firstCall.args[0]).to.equal(this.KnexFake)
    expect(this.GetImagesStub?.firstCall.args[1]).to.equal(name)
    expect(this.GetImagesStub?.firstCall.args[2]).to.equal(84)
  }

  @test
  async 'it should set default index on new room' () {
    Config.memorySize = 100
    const room = await Functions.GetRoomAndIncrementImage(this.KnexFake, '/path/')
    expect(room.index).to.equal(99)
  }

  @test
  async 'it should ignore increment on new room' () {
    Config.memorySize = 100
    const room = await Functions.GetRoomAndIncrementImage(this.KnexFake, '/path/', -10)
    expect(room.index).to.equal(99)
    const room2 = await Functions.GetRoomAndIncrementImage(this.KnexFake, '/path2/', 5)
    expect(room2.index).to.equal(99)
  }

  @test
  async 'it should set uriSafeImage' () {
    const room = await Functions.GetRoomAndIncrementImage(this.KnexFake, '/images!/')
    expect(room.uriSafeImage).to.equal('/image99.png')
  }

  @test
  async 'it should set uriSafeImage using encodeUriComponent' () {
    this.StockImages[99] = '/foo?/#bar/%image.gif'
    const room = await Functions.GetRoomAndIncrementImage(this.KnexFake, '/images!/')
    expect(room.uriSafeImage).to.equal('/foo%3F/%23bar/%25image.gif')
  }

  @test
  async 'it should set uriSafeImage to blank if there are no pictures' () {
    this.StockImages = []
    this.GetImagesStub?.resolves([])
    const room = await Functions.GetRoomAndIncrementImage(this.KnexFake, '/images!/')
    expect(room.uriSafeImage).to.equal('')
  }

  @test
  async 'it should rotate memory backwards when reversing off the end of history' () {
    const first = Array(200).fill(undefined).map((_, i) => `/image${i + 200}.png`)
    const second = Array(100).fill(undefined).map((_, i) => `/image${i}.png`)
    this.GetImagesStub?.onFirstCall().resolves(first).onSecondCall().resolves(second)
    Config.memorySize = 100
    const room = await Functions.GetRoomAndIncrementImage(this.KnexFake, '/path/')
    expect(room.index).to.equal(99)
    expect(this.GetImagesStub?.callCount).to.equal(1)
    await Functions.GetRoomAndIncrementImage(this.KnexFake, '/path/', -99)
    expect(this.GetImagesStub?.callCount).to.equal(1)
    expect(room.index).to.equal(0)
    await Functions.GetRoomAndIncrementImage(this.KnexFake, '/path/', -1)
    expect(this.GetImagesStub?.callCount).to.equal(2)
    expect(room.index).to.equal(99)
    expect(room.images).to.have.lengthOf(200)
    expect(room.images.slice(0, 100)).to.deep.equal(second)
    expect(room.images.slice(-100)).to.deep.equal(first.slice(0, 100))
  }

  @test
  async 'it should rotate memory backwards when reversing off the end of history with small folder' () {
    const first = Array(20).fill(undefined).map((_, i) => `/image${i + 200}.png`)
    const second = Array(30).fill(undefined).map((_, i) => `/image${i}.png`)
    const room = {
      countdown: 50,
      images: first,
      path: '/path/',
      index: 10,
      uriSafeImage: undefined
    }
    Config.rooms['/path/'] = room
    this.GetImagesStub?.onFirstCall().resolves(second)
    Config.memorySize = 100
    await Functions.GetRoomAndIncrementImage(this.KnexFake, '/path/')
    expect(room.index).to.equal(10)
    expect(this.GetImagesStub?.callCount).to.equal(0)
    await Functions.GetRoomAndIncrementImage(this.KnexFake, '/path/', -10)
    expect(this.GetImagesStub?.callCount).to.equal(0)
    expect(room.index).to.equal(0)
    await Functions.GetRoomAndIncrementImage(this.KnexFake, '/path/', -1)
    expect(this.GetImagesStub?.callCount).to.equal(1)
    expect(room.index).to.equal(29)
    expect(room.images).to.have.lengthOf(50)
    expect(room.images.slice(0, 30)).to.deep.equal(second)
    expect(room.images.slice(-20)).to.deep.equal(first)
  }

  @test
  async 'it should rotate memory backwards when reversing far off the end of history' () {
    const first = Array(200).fill(undefined).map((_, i) => `/image${i + 200}.png`)
    const second = Array(100).fill(undefined).map((_, i) => `/image${i}.png`)
    this.GetImagesStub?.onFirstCall().resolves(first).onSecondCall().resolves(second)
    Config.memorySize = 100
    const room = await Functions.GetRoomAndIncrementImage(this.KnexFake, '/path/')
    expect(room.index).to.equal(99)
    expect(this.GetImagesStub?.callCount).to.equal(1)
    await Functions.GetRoomAndIncrementImage(this.KnexFake, '/path/', -99)
    expect(room.index).to.equal(0)
    expect(this.GetImagesStub?.callCount).to.equal(1)
    await Functions.GetRoomAndIncrementImage(this.KnexFake, '/path/', -1000)
    expect(room.index).to.equal(99)
    expect(this.GetImagesStub?.callCount).to.equal(2)
    expect(room.images).to.have.lengthOf(200)
    expect(room.images.slice(0, 100)).to.deep.equal(second)
    expect(room.images.slice(-100)).to.deep.equal(first.slice(0, 100))
  }

  @test
  async 'it should rotate memory forwards when incrementing off the end of history' () {
    const first = Array(200).fill(undefined).map((_, i) => `/image${i + 200}.png`)
    const second = Array(100).fill(undefined).map((_, i) => `/image${i}.png`)
    this.GetImagesStub?.onFirstCall().resolves(first).onSecondCall().resolves(second)
    Config.memorySize = 100
    const room = await Functions.GetRoomAndIncrementImage(this.KnexFake, '/path/')
    expect(room.index).to.equal(99)
    expect(this.GetImagesStub?.callCount).to.equal(1)
    await Functions.GetRoomAndIncrementImage(this.KnexFake, '/path/', 100)
    expect(this.GetImagesStub?.callCount).to.equal(1)
    expect(room.index).to.equal(199)
    await Functions.GetRoomAndIncrementImage(this.KnexFake, '/path/', 1)
    expect(this.GetImagesStub?.callCount).to.equal(2)
    expect(room.index).to.equal(100)
    expect(room.images).to.have.lengthOf(200)
    expect(room.images.slice(0, 100)).to.deep.equal(first.slice(-100))
    expect(room.images.slice(-100)).to.deep.equal(second)
  }

  @test
  async 'it should call to MarkImageRead if there are pictures on fetch' () {
    await Functions.GetRoomAndIncrementImage(this.KnexFake, '/images!/')
    expect(this.MarkImageReadStub?.callCount).to.equal(1)
    expect(this.MarkImageReadStub?.firstCall.args).to.have.lengthOf(2)
    expect(this.MarkImageReadStub?.firstCall.args[0]).to.equal(this.KnexFake)
    expect(this.MarkImageReadStub?.firstCall.args[1]).to.equal('/image99.png')
  }

  @test
  async 'it should omit call to MarkImageRead if there are no pictures' () {
    this.StockImages = []
    this.GetImagesStub?.resolves([])
    await Functions.GetRoomAndIncrementImage(this.KnexFake, '/images!/')
    expect(this.MarkImageReadStub?.callCount).to.equal(0)
  }
}

@suite
export class SlideshowTickCountdownTests {
  KnexFake = { knex: Math.random() } as unknown as Knex

  IoStub = {
    of: sinon.stub().returnsThis(),
    adapter: {},
    rooms: {},
    to: sinon.stub().returnsThis(),
    get: sinon.stub().returns([]),
    emit: sinon.stub().returnsThis()
  }

  IoFake = this.IoStub as unknown as WebSocketServer

  GetRoomStub?: Sinon.SinonStub

  before () {
    this.IoStub.adapter = this.IoStub
    this.IoStub.rooms = this.IoStub
    Config.rooms = {}
    this.GetRoomStub = sinon.stub(Functions, 'GetRoomAndIncrementImage')
  }

  after () {
    this.GetRoomStub?.restore()
  }

  @test
  async 'it should accept empty room list' () {
    await Functions.TickCountdown(this.KnexFake, this.IoFake)
    expect(this.IoStub.of.callCount).to.equal(0)
    expect(this.GetRoomStub?.callCount).to.equal(0)
  }

  @test
  async 'it should remove expired room that has no clients' () {
    Config.rooms['/Test/Room/'] = {
      countdown: -3599,
      path: '/Test/Room/',
      images: [],
      index: 0,
      uriSafeImage: ''
    }
    expect(Config.rooms).to.have.any.keys('/Test/Room/')
    await Functions.TickCountdown(this.KnexFake, this.IoFake)
    expect(this.IoStub.of.callCount).to.equal(0)
    expect(this.GetRoomStub?.callCount).to.equal(0)
    expect(Config.rooms).to.not.have.any.keys('/Test/Room/')
  }

  @test
  async 'it should only decrement room with undefined clients' () {
    Config.rooms['/Test/Room/'] = {
      countdown: -1,
      path: '/Test/Room/',
      images: [],
      index: 0,
      uriSafeImage: ''
    }
    this.IoStub.get.returns(undefined)
    await Functions.TickCountdown(this.KnexFake, this.IoFake)
    expect(Config.rooms['/Test/Room/'].countdown).to.equal(-2)
    expect(this.IoStub.of.callCount).to.equal(1)
    expect(this.IoStub.of.firstCall.args).to.deep.equal(['/'])
    expect(this.IoStub.get.callCount).to.equal(1)
    expect(this.IoStub.get.firstCall.args).to.deep.equal(['/Test/Room/'])
    expect(this.IoStub.emit.callCount).to.equal(0)
    expect(this.GetRoomStub?.callCount).to.equal(0)
  }

  @test
  async 'it should only decrement room with empty clients' () {
    Config.rooms['/Test/Room/'] = {
      countdown: -1,
      path: '/Test/Room/',
      images: [],
      index: 0,
      uriSafeImage: ''
    }
    this.IoStub.get.returns(new Set())
    await Functions.TickCountdown(this.KnexFake, this.IoFake)
    expect(Config.rooms['/Test/Room/'].countdown).to.equal(-2)
    expect(this.IoStub.of.callCount).to.equal(1)
    expect(this.IoStub.of.firstCall.args).to.deep.equal(['/'])
    expect(this.IoStub.get.callCount).to.equal(1)
    expect(this.IoStub.get.firstCall.args).to.deep.equal(['/Test/Room/'])
    expect(this.IoStub.emit.callCount).to.equal(0)
    expect(this.GetRoomStub?.callCount).to.equal(0)
  }

  @test
  async 'it should only decrement unexpired room' () {
    Config.rooms['/Test/Room/'] = {
      countdown: 2,
      path: '/Test/Room/',
      images: [],
      index: 0,
      uriSafeImage: ''
    }
    this.IoStub.get.returns(new Set(['/']))
    await Functions.TickCountdown(this.KnexFake, this.IoFake)
    expect(Config.rooms['/Test/Room/'].countdown).to.equal(1)
    expect(this.IoStub.emit.callCount).to.equal(0)
    expect(this.GetRoomStub?.callCount).to.equal(0)
  }

  @test
  async 'it should reset countdown for room thats expired with clients' () {
    Config.rooms['/Test/Room/'] = {
      countdown: -1,
      path: '/Test/Room/',
      images: [],
      index: 0,
      uriSafeImage: ''
    }
    this.IoStub.get.returns(new Set(['/']))
    await Functions.TickCountdown(this.KnexFake, this.IoFake)
    expect(Config.rooms['/Test/Room/'].countdown).to.equal(Config.countdownDuration)
  }

  @test
  async 'it should increment image for room thats expired with clients' () {
    Config.rooms['/Test/Room/'] = {
      countdown: -1,
      path: '/Test/Room/',
      images: [],
      index: 0,
      uriSafeImage: ''
    }
    this.IoStub.get.returns(new Set(['/']))
    await Functions.TickCountdown(this.KnexFake, this.IoFake)
    expect(this.GetRoomStub?.callCount).to.equal(1)
    expect(this.GetRoomStub?.firstCall.args).to.have.lengthOf(3)
    expect(this.GetRoomStub?.firstCall.args[0]).to.equal(this.KnexFake)
    expect(this.GetRoomStub?.firstCall.args[1]).to.equal('/Test/Room/')
    expect(this.GetRoomStub?.firstCall.args[2]).to.equal(1)
  }

  @test
  async 'it should emit new image for room thats expired with clients' () {
    Config.rooms['/Test/Room/'] = {
      countdown: -1,
      path: '/Test/Room/',
      images: [],
      index: 0,
      uriSafeImage: '/this/is/my/image.png'
    }
    this.IoStub.get.returns(new Set(['/']))
    await Functions.TickCountdown(this.KnexFake, this.IoFake)
    expect(this.IoStub.to.callCount).to.equal(1)
    expect(this.IoStub.to.firstCall.args).to.deep.equal(['/Test/Room/'])
    expect(this.IoStub.emit.callCount).to.equal(1)
    expect(this.IoStub.emit.firstCall.args).to.have.lengthOf(2)
    expect(this.IoStub.emit.firstCall.args[0]).to.equal('new-image')
    expect(this.IoStub.emit.firstCall.args[1]).to.equal('/this/is/my/image.png')
  }
}

@suite
export class SlideshowHandleSocketTests {
  KnexFake = { knex: Math.random() } as unknown as Knex

  IoStub = {
    to: sinon.stub().returnsThis(),
    emit: sinon.stub().returnsThis()
  }

  IoFake = this.IoStub as unknown as WebSocketServer

  SocketStub = {
    emit: sinon.stub(),
    join: sinon.stub(),
    on: sinon.stub()
  }

  SocketFake = this.SocketStub as unknown as Socket

  GetRoomStub?: Sinon.SinonStub
  SetLatestStub?: Sinon.SinonStub

  Room = {
    countdown: 30,
    index: 1,
    path: '/test/path',
    images: ['', '/test/path/some/image.png'],
    uriSafeImage: '/some/image.bmp'
  }

  before () {
    Config.rooms = {}
    this.GetRoomStub = sinon.stub(Functions, 'GetRoomAndIncrementImage').resolves(this.Room)
    this.SetLatestStub = sinon.stub(Imports, 'setLatest').resolves('/test/path/some/')
  }

  after () {
    this.GetRoomStub?.restore()
    this.SetLatestStub?.restore()
  }

  async joinSlideshow (roomname: string) {
    const fn = this.SocketStub.on.getCalls().filter(call => call.args[0] === 'join-slideshow').map(call => call.args[1])[0]
    assert(fn)
    expect(fn).to.be.a('function')
    await fn(roomname)
    this.SocketStub.join.resetHistory()
    this.SocketStub.emit.resetHistory()
    this.GetRoomStub?.resetHistory()
  }

  @test
  'it should register four event listeners' () {
    Functions.HandleSocket(this.KnexFake, this.IoFake, this.SocketFake)
    expect(this.SocketStub.on.callCount).to.equal(5)
  }

  @test
  'it should register `get-launchId` event listeners' () {
    Functions.HandleSocket(this.KnexFake, this.IoFake, this.SocketFake)
    expect(this.SocketStub.on.calledWith('get-launchId')).to.equal(true)
  }

  @test
  async 'on(get-launchId) it should reply with current launchId' () {
    Functions.HandleSocket(this.KnexFake, this.IoFake, this.SocketFake)
    const fn = this.SocketStub.on.getCalls()
      .filter(call => call.args[0] === 'get-launchId')
      .map(call => call.args[1])[0]
    assert(fn)
    expect(fn).to.be.a('function')
    const expected = Math.random() * 1000000
    Config.launchId = expected
    const spy = sinon.stub()
    await fn(spy)
    expect(spy.callCount).to.equal(1)
    expect(spy.firstCall.args).to.have.lengthOf(1)
    expect(spy.firstCall.args[0]).to.equal(expected)
  }

  @test
  'it should register `join-slideshow` event listeners' () {
    Functions.HandleSocket(this.KnexFake, this.IoFake, this.SocketFake)
    expect(this.SocketStub.on.calledWith('join-slideshow')).to.equal(true)
  }

  @test
  async 'on(join-slideshow) it should join socket to provided room' () {
    Functions.HandleSocket(this.KnexFake, this.IoFake, this.SocketFake)
    const fn = this.SocketStub.on.getCalls()
      .filter(call => call.args[0] === 'join-slideshow')
      .map(call => call.args[1])[0]
    assert(fn)
    expect(fn).to.be.a('function')
    const expected = `/testRoom/${Math.random()}`
    await fn(expected)
    expect(this.SocketStub.join.callCount).to.equal(1)
    expect(this.SocketStub.join.firstCall.args).to.deep.equal([expected])
  }

  @test
  async 'on(join-slideshow) it should fetch room without increment' () {
    Functions.HandleSocket(this.KnexFake, this.IoFake, this.SocketFake)
    const fn = this.SocketStub.on.getCalls()
      .filter(call => call.args[0] === 'join-slideshow')
      .map(call => call.args[1])[0]
    assert(fn)
    expect(fn).to.be.a('function')
    const expected = `/testRoom/${Math.random()}`
    await fn(expected)
    expect(this.GetRoomStub?.callCount).to.equal(1)
    expect(this.GetRoomStub?.firstCall.args).to.have.lengthOf(2)
    expect(this.GetRoomStub?.firstCall.args[0]).to.equal(this.KnexFake)
    expect(this.GetRoomStub?.firstCall.args[1]).to.equal(expected)
  }

  @test
  async 'on(join-slideshow) it emit to socket current image' () {
    Functions.HandleSocket(this.KnexFake, this.IoFake, this.SocketFake)
    const fn = this.SocketStub.on.getCalls()
      .filter(call => call.args[0] === 'join-slideshow')
      .map(call => call.args[1])[0]
    assert(fn)
    expect(fn).to.be.a('function')
    const expected = `/testRoom/${Math.random()}`
    await fn(expected)
    expect(this.SocketStub.emit.callCount).to.equal(1)
    expect(this.SocketStub.emit.firstCall.args).to.have.lengthOf(2)
    expect(this.SocketStub.emit.firstCall.args[0]).to.equal('new-image')
    expect(this.SocketStub.emit.firstCall.args[1]).to.equal(this.Room.uriSafeImage)
  }

  @test
  'it should register `prev-inage` event listeners' () {
    Functions.HandleSocket(this.KnexFake, this.IoFake, this.SocketFake)
    expect(this.SocketStub.on.calledWith('prev-image')).to.equal(true)
  }

  @test
  async 'on(prev-image) it should ignore call when not joined to room' () {
    Functions.HandleSocket(this.KnexFake, this.IoFake, this.SocketFake)
    const fn = this.SocketStub.on.getCalls()
      .filter(call => call.args[0] === 'prev-image')
      .map(call => call.args[1])[0]
    assert(fn)
    expect(fn).to.be.a('function')
    await fn()
    expect(this.GetRoomStub?.callCount).to.equal(0)
    expect(this.IoStub.to.callCount).to.equal(0)
    expect(this.IoStub.emit.callCount).to.equal(0)
  }

  @test
  async 'on(prev-image) it increment image when connected to room' () {
    Functions.HandleSocket(this.KnexFake, this.IoFake, this.SocketFake)
    const roomname = `/testRoom/${Math.random()}`
    await this.joinSlideshow(roomname)
    const fn = this.SocketStub.on.getCalls()
      .filter(call => call.args[0] === 'prev-image')
      .map(call => call.args[1])[0]
    assert(fn)
    expect(fn).to.be.a('function')
    await fn()
    expect(this.GetRoomStub?.callCount).to.equal(1)
    expect(this.GetRoomStub?.firstCall.args).to.have.lengthOf(3)
    expect(this.GetRoomStub?.firstCall.args[0]).to.equal(this.KnexFake)
    expect(this.GetRoomStub?.firstCall.args[1]).to.equal(roomname)
    expect(this.GetRoomStub?.firstCall.args[2]).to.equal(-1)
  }

  @test
  async 'on(prev-image) it emit new image to all clients' () {
    Functions.HandleSocket(this.KnexFake, this.IoFake, this.SocketFake)
    const roomname = `/testRoom/${Math.random()}`
    await this.joinSlideshow(roomname)
    const fn = this.SocketStub.on.getCalls()
      .filter(call => call.args[0] === 'prev-image')
      .map(call => call.args[1])[0]
    assert(fn)
    expect(fn).to.be.a('function')
    await fn()
    expect(this.IoStub.to.callCount).to.equal(1)
    expect(this.IoStub.to.firstCall.args).to.deep.equal([this.Room.path])
    expect(this.IoStub.emit.callCount).to.equal(1)
    expect(this.IoStub.emit.firstCall.args).to.have.lengthOf(2)
    expect(this.IoStub.emit.firstCall.args[0]).to.equal('new-image')
    expect(this.IoStub.emit.firstCall.args[1]).to.equal(this.Room.uriSafeImage)
  }

  @test
  'it should register `next-image` event listeners' () {
    Functions.HandleSocket(this.KnexFake, this.IoFake, this.SocketFake)
    expect(this.SocketStub.on.calledWith('next-image')).to.equal(true)
  }

  @test
  async 'on(next-image) it should ignore call when not joined to room' () {
    Functions.HandleSocket(this.KnexFake, this.IoFake, this.SocketFake)
    const fn = this.SocketStub.on.getCalls()
      .filter(call => call.args[0] === 'next-image')
      .map(call => call.args[1])[0]
    assert(fn)
    expect(fn).to.be.a('function')
    await fn()
    expect(this.GetRoomStub?.callCount).to.equal(0)
    expect(this.IoStub.to.callCount).to.equal(0)
    expect(this.IoStub.emit.callCount).to.equal(0)
  }

  @test
  async 'on(next-image) it increment image when connected to room' () {
    Functions.HandleSocket(this.KnexFake, this.IoFake, this.SocketFake)
    const roomname = `/testRoom/${Math.random()}`
    await this.joinSlideshow(roomname)
    const fn = this.SocketStub.on.getCalls()
      .filter(call => call.args[0] === 'next-image')
      .map(call => call.args[1])[0]
    assert(fn)
    expect(fn).to.be.a('function')
    await fn()
    expect(this.GetRoomStub?.callCount).to.equal(1)
    expect(this.GetRoomStub?.firstCall.args).to.have.lengthOf(3)
    expect(this.GetRoomStub?.firstCall.args[0]).to.equal(this.KnexFake)
    expect(this.GetRoomStub?.firstCall.args[1]).to.equal(roomname)
    expect(this.GetRoomStub?.firstCall.args[2]).to.equal(1)
  }

  @test
  async 'on(next-image) it emit new image to all clients' () {
    Functions.HandleSocket(this.KnexFake, this.IoFake, this.SocketFake)
    const roomname = `/testRoom/${Math.random()}`
    await this.joinSlideshow(roomname)
    const fn = this.SocketStub.on.getCalls()
      .filter(call => call.args[0] === 'next-image')
      .map(call => call.args[1])[0]
    assert(fn)
    expect(fn).to.be.a('function')
    await fn()
    expect(this.IoStub.to.callCount).to.equal(1)
    expect(this.IoStub.to.firstCall.args).to.deep.equal([this.Room.path])
    expect(this.IoStub.emit.callCount).to.equal(1)
    expect(this.IoStub.emit.firstCall.args).to.have.lengthOf(2)
    expect(this.IoStub.emit.firstCall.args[0]).to.equal('new-image')
    expect(this.IoStub.emit.firstCall.args[1]).to.equal(this.Room.uriSafeImage)
  }

  @test
  'it should register `goto-image` event listeners' () {
    Functions.HandleSocket(this.KnexFake, this.IoFake, this.SocketFake)
    expect(this.SocketStub.on.calledWith('goto-image')).to.equal(true)
  }

  @test
  async 'on(goto-image) it should ignore call when not joined to room' () {
    Functions.HandleSocket(this.KnexFake, this.IoFake, this.SocketFake)
    const fn = this.SocketStub.on.getCalls()
      .filter(call => call.args[0] === 'goto-image')
      .map(call => call.args[1])[0]
    assert(fn)
    expect(fn).to.be.a('function')
    const callback = sinon.stub()
    await fn(callback)
    expect(this.GetRoomStub?.callCount).to.equal(0)
    expect(this.IoStub.to.callCount).to.equal(0)
    expect(this.IoStub.emit.callCount).to.equal(0)
    expect(callback.callCount).to.equal(1)
    expect(callback.firstCall.args).to.deep.equal([null])
  }

  @test
  async 'on(goto-image) it retrieves full room data' () {
    Functions.HandleSocket(this.KnexFake, this.IoFake, this.SocketFake)
    const roomname = `/testRoom/${Math.random()}`
    await this.joinSlideshow(roomname)
    const fn = this.SocketStub.on.getCalls()
      .filter(call => call.args[0] === 'goto-image')
      .map(call => call.args[1])[0]
    assert(fn)
    expect(fn).to.be.a('function')
    const callback = sinon.stub()
    await fn(callback)
    expect(this.GetRoomStub?.callCount).to.equal(1)
    expect(this.GetRoomStub?.firstCall.args).to.have.lengthOf(2)
    expect(this.GetRoomStub?.firstCall.args[0]).to.equal(this.KnexFake)
    expect(this.GetRoomStub?.firstCall.args[1]).to.equal(roomname)
  }

  @test
  async 'on(goto-image) it marks current image as latest via api' () {
    Functions.HandleSocket(this.KnexFake, this.IoFake, this.SocketFake)
    const roomname = `/testRoom/${Math.random()}`
    await this.joinSlideshow(roomname)
    const fn = this.SocketStub.on.getCalls()
      .filter(call => call.args[0] === 'goto-image')
      .map(call => call.args[1])[0]
    assert(fn)
    expect(fn).to.be.a('function')
    const callback = sinon.stub()
    const expected = `/some/test/image/${Math.random()}.png`
    this.Room.images[99] = expected
    this.Room.index = 99
    await fn(callback)
    expect(this.SetLatestStub?.callCount).to.equal(1)
    expect(this.SetLatestStub?.firstCall.args).to.have.lengthOf(2)
    expect(this.SetLatestStub?.firstCall.args[0]).to.equal(this.KnexFake)
    expect(this.SetLatestStub?.firstCall.args[1]).to.equal(expected)
  }

  @test
  async 'on(goto-image) it passes folder path to callback' () {
    Functions.HandleSocket(this.KnexFake, this.IoFake, this.SocketFake)
    const roomname = `/testRoom/${Math.random()}`
    await this.joinSlideshow(roomname)
    const fn = this.SocketStub.on.getCalls()
      .filter(call => call.args[0] === 'goto-image')
      .map(call => call.args[1])[0]
    assert(fn)
    expect(fn).to.be.a('function')
    const callback = sinon.stub()
    const expected = `/some/test/path/${Math.random()}/`
    this.SetLatestStub?.resolves(expected)
    await fn(callback)
    expect(callback.callCount).to.equal(1)
    expect(callback.firstCall.args).to.deep.equal([expected])
  }

  @test
  async 'on(goto-image) it should resolve null on missing image' () {
    Functions.HandleSocket(this.KnexFake, this.IoFake, this.SocketFake)
    const roomname = `/testRoom/${Math.random()}`
    await this.joinSlideshow(roomname)
    const fn = this.SocketStub.on.getCalls()
      .filter(call => call.args[0] === 'goto-image')
      .map(call => call.args[1])[0]
    assert(fn)
    expect(fn).to.be.a('function')
    const callback = sinon.stub()
    const room = { images: [], index: 0 }
    this.GetRoomStub?.resolves(room)
    await fn(callback)
    expect(callback.callCount).to.equal(1)
    expect(callback.firstCall.args).to.deep.equal([null])
  }

  @test
  async 'on(goto-image) it should not set latest image on missing image' () {
    Functions.HandleSocket(this.KnexFake, this.IoFake, this.SocketFake)
    const roomname = `/testRoom/${Math.random()}`
    await this.joinSlideshow(roomname)
    const fn = this.SocketStub.on.getCalls()
      .filter(call => call.args[0] === 'goto-image')
      .map(call => call.args[1])[0]
    assert(fn)
    expect(fn).to.be.a('function')
    const callback = sinon.stub()
    const room = { images: [], index: 0 }
    this.GetRoomStub?.resolves(room)
    await fn(callback)
    expect(this.SetLatestStub?.callCount).to.equal(0)
  }
}

@suite
export class SlideshowGetRouterTests {
  KnexFake = { Knex: Math.random() } as unknown as Knex

  AppFake = { App: Math.random() } as unknown as Application

  ServerFake = { Server: Math.random() } as unknown as Server

  IoStub = {
    on: sinon.stub().returnsThis()
  }

  IoFake = this.IoStub as unknown as WebSocketServer

  SocketFake = { Socket: Math.random() } as unknown as Socket

  AppRouterStub = {
    get: sinon.stub()
  }

  RequestStub = {
    params: [] as string[]
  }

  ResponseStub = {
    status: sinon.stub().returnsThis(),
    render: sinon.stub().returnsThis(),
    json: sinon.stub().returnsThis()
  }

  RouterStub?: Sinon.SinonStub
  InitializeStub?: Sinon.SinonStub
  setIntervalStub?: Sinon.SinonStub
  GetRoomStub?: Sinon.SinonStub
  HandleSocketStub?: Sinon.SinonStub
  TickCountdownStub?: Sinon.SinonStub

  before () {
    this.setIntervalStub = sinon.stub(Imports, 'setInterval')
    this.InitializeStub = sinon.stub(persistance, 'initialize').resolves(this.KnexFake)
    this.RouterStub = sinon.stub(Imports, 'Router').returns(this.AppRouterStub as unknown as Router)
    this.GetRoomStub = sinon.stub(Functions, 'GetRoomAndIncrementImage').resolves()
    this.HandleSocketStub = sinon.stub(Functions, 'HandleSocket')
    this.TickCountdownStub = sinon.stub(Functions, 'TickCountdown').resolves()
  }

  after () {
    this.setIntervalStub?.restore()
    this.InitializeStub?.restore()
    this.RouterStub?.restore()
    this.GetRoomStub?.restore()
    this.HandleSocketStub?.restore()
    this.TickCountdownStub?.restore()
  }

  @test
  async 'it should set launch Id' () {
    const expected = Math.ceil(Math.random() * 1e10)
    const clock = sinon.useFakeTimers(expected)
    try {
      await getRouter(this.AppFake, this.ServerFake, this.IoFake)
      expect(Config.launchId).to.equal(expected)
    } finally {
      clock.restore()
    }
  }

  @test
  async 'it should resolve to router' () {
    const router = await getRouter(this.AppFake, this.ServerFake, this.IoFake)
    expect(router).to.equal(this.AppRouterStub)
  }

  @test
  async 'it should listen to route /launchId' () {
    await getRouter(this.AppFake, this.ServerFake, this.IoFake)
    expect(this.AppRouterStub.get.calledWith('/launchId')).to.equal(true)
  }

  @test
  async 'it should reply to /launchId with the launch id' () {
    const expected = Math.random()
    await getRouter(this.AppFake, this.ServerFake, this.IoFake)
    const handler = this.AppRouterStub.get.getCalls()
      .filter(call => call.args[0] === '/launchId')
      .map(call => call.args[1])[0]
    Config.launchId = expected
    assert(handler)
    await handler(this.RequestStub, this.ResponseStub)
    expect(this.ResponseStub.status.callCount).to.equal(0)
    expect(this.ResponseStub.render.callCount).to.equal(0)
    expect(this.ResponseStub.json.callCount).to.equal(1)
    expect(this.ResponseStub.json.firstCall.args).to.have.lengthOf(1)
    expect(this.ResponseStub.json.firstCall.args[0]).to.deep.equal({ launchId: expected })
  }

  @test
  async 'it should listen to route /' () {
    await getRouter(this.AppFake, this.ServerFake, this.IoFake)
    expect(this.AppRouterStub.get.calledWith('/')).to.equal(true)
  }

  @test
  async 'it should listen to route /*' () {
    await getRouter(this.AppFake, this.ServerFake, this.IoFake)
    expect(this.AppRouterStub.get.calledWith('/*')).to.equal(true)
  }

  @test
  async 'it should us same handler for / and /* router' () {
    await getRouter(this.AppFake, this.ServerFake, this.IoFake)
    const fn = this.AppRouterStub.get.getCalls()
      .filter(call => call.args[0] === '/')
      .map(call => call.args[1])[0]
    const fn2 = this.AppRouterStub.get.getCalls()
      .filter(call => call.args[0] === '/*')
      .map(call => call.args[1])[0]
    assert(fn)
    assert(fn2)
    expect(fn).to.equal(fn2)
  }

  @test
  async 'it should reject Forbidden with error on directory traversal attack' () {
    await getRouter(this.AppFake, this.ServerFake, this.IoFake)
    const handler = this.AppRouterStub.get.getCalls()
      .filter(call => call.args[0] === '/')
      .map(call => call.args[1])[0]
    assert(handler)
    this.RequestStub.params = ['foo/../bar/']
    await handler(this.RequestStub, this.ResponseStub)
    expect(this.ResponseStub.status.callCount).to.equal(1)
    expect(this.ResponseStub.status.firstCall.args).to.have.lengthOf(1)
    expect(this.ResponseStub.status.firstCall.args[0]).to.equal(StatusCodes.FORBIDDEN)
  }

  @test
  async 'it should render error on directory traversal attack' () {
    await getRouter(this.AppFake, this.ServerFake, this.IoFake)
    const handler = this.AppRouterStub.get.getCalls()
      .filter(call => call.args[0] === '/')
      .map(call => call.args[1])[0]
    assert(handler)
    this.RequestStub.params = ['foo/../bar/']
    await handler(this.RequestStub, this.ResponseStub)
    expect(this.ResponseStub.render.callCount).to.equal(1)
    expect(this.ResponseStub.render.firstCall.args).to.have.lengthOf(2)
    expect(this.ResponseStub.render.firstCall.args[0]).to.equal('error')
    expect(this.ResponseStub.render.firstCall.args[1]).to.deep.equal({
      title: 'ERROR',
      code: 'E_NO_TRAVERSE',
      message: 'Directory Traversal is not Allowed!'
    })
  }

  @test
  async 'it should find room with default path' () {
    await getRouter(this.AppFake, this.ServerFake, this.IoFake)
    const handler = this.AppRouterStub.get.getCalls()
      .filter(call => call.args[0] === '/')
      .map(call => call.args[1])[0]
    assert(handler)
    this.RequestStub.params = []
    await handler(this.RequestStub, this.ResponseStub)
    expect(this.GetRoomStub?.callCount).to.equal(1)
    expect(this.GetRoomStub?.firstCall.args).to.have.lengthOf(2)
    expect(this.GetRoomStub?.firstCall.args[0]).to.equal(this.KnexFake)
    expect(this.GetRoomStub?.firstCall.args[1]).to.equal('/')
  }

  @test
  async 'it should find room with given path' () {
    await getRouter(this.AppFake, this.ServerFake, this.IoFake)
    const handler = this.AppRouterStub.get.getCalls()
      .filter(call => call.args[0] === '/')
      .map(call => call.args[1])[0]
    assert(handler)
    this.RequestStub.params = ['foo/bar/']
    await handler(this.RequestStub, this.ResponseStub)
    expect(this.GetRoomStub?.callCount).to.equal(1)
    expect(this.GetRoomStub?.firstCall.args).to.have.lengthOf(2)
    expect(this.GetRoomStub?.firstCall.args[0]).to.equal(this.KnexFake)
    expect(this.GetRoomStub?.firstCall.args[1]).to.equal('/foo/bar/')
  }

  @test
  async 'it should reject Not Found with error on missing folder' () {
    await getRouter(this.AppFake, this.ServerFake, this.IoFake)
    const handler = this.AppRouterStub.get.getCalls()
      .filter(call => call.args[0] === '/')
      .map(call => call.args[1])[0]
    assert(handler)
    this.RequestStub.params = ['foo/bar/']
    this.GetRoomStub?.resolves(undefined)
    await handler(this.RequestStub, this.ResponseStub)
    expect(this.ResponseStub.status.callCount).to.equal(1)
    expect(this.ResponseStub.status.firstCall.args).to.have.lengthOf(1)
    expect(this.ResponseStub.status.firstCall.args[0]).to.equal(StatusCodes.NOT_FOUND)
  }

  @test
  async 'it should render error on missing folder' () {
    await getRouter(this.AppFake, this.ServerFake, this.IoFake)
    const handler = this.AppRouterStub.get.getCalls()
      .filter(call => call.args[0] === '/')
      .map(call => call.args[1])[0]
    assert(handler)
    this.RequestStub.params = ['foo/bar/']
    this.GetRoomStub?.resolves(undefined)
    await handler(this.RequestStub, this.ResponseStub)
    expect(this.ResponseStub.render.callCount).to.equal(1)
    expect(this.ResponseStub.render.firstCall.args).to.have.lengthOf(2)
    expect(this.ResponseStub.render.firstCall.args[0]).to.equal('error')
    expect(this.ResponseStub.render.firstCall.args[1]).to.deep.equal({
      title: 'ERROR',
      code: 'E_NOT_FOUND',
      message: 'Not Found'
    })
  }

  @test
  async 'it should reject Not Found with error on empty folder' () {
    await getRouter(this.AppFake, this.ServerFake, this.IoFake)
    const handler = this.AppRouterStub.get.getCalls()
      .filter(call => call.args[0] === '/')
      .map(call => call.args[1])[0]
    assert(handler)
    this.RequestStub.params = ['foo/bar/']
    this.GetRoomStub?.resolves({ images: [] })
    await handler(this.RequestStub, this.ResponseStub)
    expect(this.ResponseStub.status.callCount).to.equal(1)
    expect(this.ResponseStub.status.firstCall.args).to.have.lengthOf(1)
    expect(this.ResponseStub.status.firstCall.args[0]).to.equal(StatusCodes.NOT_FOUND)
  }

  @test
  async 'it should render error on empty folder' () {
    await getRouter(this.AppFake, this.ServerFake, this.IoFake)
    const handler = this.AppRouterStub.get.getCalls()
      .filter(call => call.args[0] === '/')
      .map(call => call.args[1])[0]
    assert(handler)
    this.RequestStub.params = ['foo/bar/']
    this.GetRoomStub?.resolves({ images: [] })
    await handler(this.RequestStub, this.ResponseStub)
    expect(this.ResponseStub.render.callCount).to.equal(1)
    expect(this.ResponseStub.render.firstCall.args).to.have.lengthOf(2)
    expect(this.ResponseStub.render.firstCall.args[0]).to.equal('error')
    expect(this.ResponseStub.render.firstCall.args[1]).to.deep.equal({
      title: 'ERROR',
      code: 'E_NOT_FOUND',
      message: 'Not Found'
    })
  }

  @test
  async 'it should render slideshow on valid folder' () {
    await getRouter(this.AppFake, this.ServerFake, this.IoFake)
    const handler = this.AppRouterStub.get.getCalls()
      .filter(call => call.args[0] === '/')
      .map(call => call.args[1])[0]
    assert(handler)
    this.RequestStub.params = ['foo/bar/']
    this.GetRoomStub?.resolves({
      images: [1],
      uriSafeImage: '/foo/bar/pngImage.gif'
    })
    await handler(this.RequestStub, this.ResponseStub)
    expect(this.ResponseStub.status.callCount).to.equal(0)
    expect(this.ResponseStub.render.callCount).to.equal(1)
    expect(this.ResponseStub.render.firstCall.args).to.have.lengthOf(2)
    expect(this.ResponseStub.render.firstCall.args[0]).to.equal('slideshow')
    expect(this.ResponseStub.render.firstCall.args[1]).to.deep.equal({
      title: '/foo/bar/',
      folder: '/foo/bar/',
      image: '/foo/bar/pngImage.gif'
    })
  }

  @test
  async 'it should handle web socket connections' () {
    await getRouter(this.AppFake, this.ServerFake, this.IoFake)
    expect(this.IoStub.on.callCount).to.equal(1)
    expect(this.IoStub.on.firstCall.args).to.have.lengthOf(2)
    expect(this.IoStub.on.firstCall.args[0]).to.equal('connection')
    expect(this.IoStub.on.firstCall.args[1]).to.be.a('function')
    this.IoStub.on.firstCall.args[1](this.SocketFake)
    expect(this.HandleSocketStub?.callCount).to.equal(1)
    expect(this.HandleSocketStub?.firstCall.args).to.have.lengthOf(3)
    expect(this.HandleSocketStub?.firstCall.args[0]).to.equal(this.KnexFake)
    expect(this.HandleSocketStub?.firstCall.args[1]).to.equal(this.IoFake)
    expect(this.HandleSocketStub?.firstCall.args[2]).to.equal(this.SocketFake)
  }

  @test
  async 'it should set interval for changing images' () {
    await getRouter(this.AppFake, this.ServerFake, this.IoFake)
    expect(this.setIntervalStub?.callCount).to.equal(1)
    expect(this.setIntervalStub?.firstCall.args).to.have.lengthOf(2)
    expect(this.setIntervalStub?.firstCall.args[0]).to.be.a('function')
    expect(this.setIntervalStub?.firstCall.args[1]).to.equal(1000)
    await this.setIntervalStub?.firstCall.args[0]()
    expect(this.TickCountdownStub?.callCount).to.equal(1)
    expect(this.TickCountdownStub?.firstCall.args).to.have.lengthOf(2)
    expect(this.TickCountdownStub?.firstCall.args[0]).to.equal(this.KnexFake)
    expect(this.TickCountdownStub?.firstCall.args[1]).to.equal(this.IoFake)
  }
}

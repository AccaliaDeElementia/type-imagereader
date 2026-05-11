'use sanity'

import Sinon from 'sinon'
import { cast, stubToKnex } from '#testutils/typeGuards.js'
import { SlideshowSocketState, handleSocket, gotoImage, Internals, Imports } from '#routes/slideshow.js'
import type { Server as WebSocketServer, Socket } from 'socket.io'

const sandbox = Sinon.createSandbox()

describe('routes/slideshow socket goto-image', () => {
  let knexFake = stubToKnex({})
  let ioStub = {}
  let serverFake = cast<WebSocketServer>(ioStub)
  let socketStub = { on: sandbox.stub() }
  let socketFake = cast<Socket>(socketStub)
  let socketState = new SlideshowSocketState()
  let folder = { path: '/foo/bar' }
  let roomData = { images: [folder], index: -1 }
  let getRoomStub = sandbox.stub().resolves(roomData)
  let picturePath = ''
  let setLatestStub = sandbox.stub().resolves(picturePath)
  beforeEach(() => {
    knexFake = stubToKnex({})
    ioStub = {}
    serverFake = cast<WebSocketServer>(ioStub)
    socketStub = { on: sandbox.stub() }
    socketFake = cast<Socket>(socketStub)
    socketState = handleSocket(knexFake, serverFake, socketFake)
    folder = { path: '/foo/bar' }
    roomData = { images: [folder], index: -1 }
    getRoomStub = sandbox.stub(Internals, 'getRoomAndIncrementImage')
    getRoomStub.resolves(roomData)
    picturePath = `Picture-${Math.random()}.png`
    setLatestStub = sandbox.stub(Imports, 'setLatest').resolves(picturePath)
  })
  afterEach(() => {
    sandbox.restore()
  })

  describe('with null room', () => {
    let spy = sandbox.stub()
    beforeEach(async () => {
      spy = sandbox.stub()
      socketState.roomName = null
      roomData.index = 0
      await gotoImage(spy, socketState, knexFake)
    })
    it('should not get room', () => {
      expect(getRoomStub.callCount).toBe(0)
    })
    it('should not provide callback path', () => {
      expect(spy.firstCall.args).toEqual([null])
    })
    it('should not set latest', () => {
      expect(setLatestStub.callCount).toBe(0)
    })
  })

  describe('with valid room and bad index (-1)', () => {
    let spy = sandbox.stub()
    beforeEach(async () => {
      spy = sandbox.stub()
      socketState.roomName = '/foo'
      roomData.index = -1
      await gotoImage(spy, socketState, knexFake)
    })
    it('should get room', () => {
      expect(getRoomStub.callCount).toBe(1)
    })
    it('should get room with knex', () => {
      expect(getRoomStub.firstCall.args[0]).toBe(knexFake)
    })
    it('should get room with room name', () => {
      expect(getRoomStub.firstCall.args[1]).toBe('/foo')
    })
    it('should get room without increment', () => {
      expect(getRoomStub.firstCall.args).toHaveLength(2)
    })
    it('should not provide callback path', () => {
      expect(spy.firstCall.args).toEqual([null])
    })
  })

  describe('with valid room and good index (0)', () => {
    let spy = sandbox.stub()
    beforeEach(async () => {
      spy = sandbox.stub()
      socketState.roomName = '/foo'
      roomData.index = 0
      await gotoImage(spy, socketState, knexFake)
    })
    it('should get room with knex', () => {
      expect(getRoomStub.firstCall.args[0]).toBe(knexFake)
    })
    it('should get room with room name', () => {
      expect(getRoomStub.firstCall.args[1]).toBe('/foo')
    })
    it('should get room without increment', () => {
      expect(getRoomStub.firstCall.args).toHaveLength(2)
    })
    it('should send callback path', () => {
      expect(spy.firstCall.args[0]).toBe(picturePath)
    })
    it('should set latest', () => {
      expect(setLatestStub.callCount).toBe(1)
    })
    it('should set latest with knex', () => {
      expect(setLatestStub.firstCall.args[0]).toBe(knexFake)
    })
    it('should set latest with folder object', () => {
      expect(setLatestStub.firstCall.args[1]).toBe(folder)
    })
  })

  describe('with valid room and out-of-range index (12)', () => {
    beforeEach(async () => {
      const spy = sandbox.stub()
      socketState.roomName = '/foo'
      roomData.index = 12
      await gotoImage(spy, socketState, knexFake)
    })
    it('should not set latest', () => {
      expect(setLatestStub.callCount).toBe(0)
    })
  })

  it('should send null callback path when setLatest returns null', async () => {
    setLatestStub.resolves(null)
    socketState.roomName = '/foo'
    roomData.index = 0
    const spy = sandbox.stub()
    await gotoImage(spy, socketState, knexFake)
    expect(spy.firstCall.args[0]).toBe(null)
  })

  describe('logging', () => {
    let loggerStub = sandbox.stub()
    beforeEach(() => {
      loggerStub = sandbox.stub(Imports, 'logger')
    })

    it('should log gotoImage format on valid invocation', async () => {
      socketState.roomName = '/foo'
      roomData.index = 0
      await gotoImage(sandbox.stub(), socketState, knexFake)
      expect(loggerStub.firstCall.args[0]).toBe('gotoImage in %s')
    })

    it('should log the room name on valid invocation', async () => {
      socketState.roomName = '/foo'
      roomData.index = 0
      await gotoImage(sandbox.stub(), socketState, knexFake)
      expect(loggerStub.firstCall.args[1]).toBe('/foo')
    })

    it('should not log when room name is null', async () => {
      socketState.roomName = null
      await gotoImage(sandbox.stub(), socketState, knexFake)
      expect(loggerStub.callCount).toBe(0)
    })
  })
})

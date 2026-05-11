'use sanity'

import Sinon from 'sinon'
import { cast, stubToKnex } from '#testutils/typeGuards.js'
import { SlideshowSocketState, handleSocket, prevImage, Internals, Imports } from '#routes/slideshow.js'
import type { Server as WebSocketServer, Socket } from 'socket.io'

const sandbox = Sinon.createSandbox()

describe('routes/slideshow socket prev-image', () => {
  let knexFake = stubToKnex({})
  let ioStub = { emit: sandbox.stub(), to: sandbox.stub().returnsThis() }
  let serverFake = cast<WebSocketServer>(ioStub)
  let socketStub = { on: sandbox.stub() }
  let socketFake = cast<Socket>(socketStub)
  let socketState = new SlideshowSocketState()
  let roomData = { path: '', uriSafeImage: '' }
  let getRoomStub = sandbox.stub().resolves(roomData)
  beforeEach(() => {
    knexFake = stubToKnex({})
    ioStub = { emit: sandbox.stub(), to: sandbox.stub().returnsThis() }
    serverFake = cast<WebSocketServer>(ioStub)
    socketStub = { on: sandbox.stub() }
    socketFake = cast<Socket>(socketStub)
    socketState = handleSocket(knexFake, serverFake, socketFake)
    roomData = {
      path: '/foo/bar',
      uriSafeImage: '/foo/quux.png',
    }
    getRoomStub = sandbox.stub(Internals, 'getRoomAndIncrementImage')
    getRoomStub.resolves(roomData)
  })
  afterEach(() => {
    sandbox.restore()
  })

  describe('with null room', () => {
    beforeEach(async () => {
      socketState.roomName = null
      await prevImage(socketState, serverFake, knexFake)
    })
    it('should not decrement image', () => {
      expect(getRoomStub.callCount).toBe(0)
    })
    it('should not broadcast message', () => {
      expect(ioStub.to.callCount).toBe(0)
    })
    it('should not emit message', () => {
      expect(ioStub.emit.callCount).toBe(0)
    })
  })

  describe('with valid room "/foo"', () => {
    beforeEach(async () => {
      socketState.roomName = '/foo'
      await prevImage(socketState, serverFake, knexFake)
    })
    it('should decrement image once', () => {
      expect(getRoomStub.callCount).toBe(1)
    })
    it('should decrement image with knex', () => {
      expect(getRoomStub.firstCall.args[0]).toBe(knexFake)
    })
    it('should decrement image with room name', () => {
      expect(getRoomStub.firstCall.args[1]).toBe('/foo')
    })
    it('should decrement image by exactly one image', () => {
      expect(getRoomStub.firstCall.args[2]).toBe(-1)
    })
    it('should broadcast message once', () => {
      expect(ioStub.to.callCount).toBe(1)
    })
    it('should broadcast to room name', () => {
      expect(ioStub.to.firstCall.args).toEqual(['/foo/bar'])
    })
    it('should emit message once', () => {
      expect(ioStub.emit.callCount).toBe(1)
    })
    it("should emit 'image-changed' message", () => {
      expect(ioStub.emit.firstCall.args[0]).toBe('image-changed')
    })
    it('should emit message for image', () => {
      expect(ioStub.emit.firstCall.args[1]).toBe('/foo/quux.png')
    })
  })

  describe('logging', () => {
    let loggerStub = sandbox.stub()
    beforeEach(() => {
      loggerStub = sandbox.stub(Imports, 'logger')
    })

    it('should log prevImage format on valid invocation', async () => {
      socketState.roomName = '/foo'
      await prevImage(socketState, serverFake, knexFake)
      expect(loggerStub.firstCall.args[0]).toBe('prevImage in %s')
    })

    it('should log the room name on valid invocation', async () => {
      socketState.roomName = '/foo'
      await prevImage(socketState, serverFake, knexFake)
      expect(loggerStub.firstCall.args[1]).toBe('/foo')
    })

    it('should not log when room name is null', async () => {
      socketState.roomName = null
      await prevImage(socketState, serverFake, knexFake)
      expect(loggerStub.callCount).toBe(0)
    })
  })
})

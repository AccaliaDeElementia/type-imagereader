'use sanity'

import { cast, stubToKnex } from '#testutils/typeGuards.js'
import { SlideshowSocketState, handleSocket, prevImage, Internals, Imports } from '#routes/slideshow.js'
import type { Server as WebSocketServer, Socket } from 'socket.io'
import type { MockInstance } from 'vitest'

describe('routes/slideshow socket prev-image', () => {
  let knexFake = stubToKnex({})
  let ioStub = {
    emit: vi.fn(),
    to: vi.fn().mockImplementation(function (this: object): unknown {
      return this
    }),
  }
  let serverFake = cast<WebSocketServer>(ioStub)
  let socketStub = { on: vi.fn() }
  let socketFake = cast<Socket>(socketStub)
  let socketState = new SlideshowSocketState()
  let roomData = { path: '', uriSafeImage: '' }
  let getRoomStub = vi.fn().mockResolvedValue(roomData)
  beforeEach(() => {
    knexFake = stubToKnex({})
    ioStub = {
      emit: vi.fn(),
      to: vi.fn().mockImplementation(function (this: object): unknown {
        return this
      }),
    }
    serverFake = cast<WebSocketServer>(ioStub)
    socketStub = { on: vi.fn() }
    socketFake = cast<Socket>(socketStub)
    socketState = handleSocket(knexFake, serverFake, socketFake)
    roomData = {
      path: '/foo/bar',
      uriSafeImage: '/foo/quux.png',
    }
    getRoomStub = vi.spyOn(Internals, 'getRoomAndIncrementImage').mockResolvedValue(cast(roomData))
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('with null room', () => {
    beforeEach(async () => {
      socketState.roomName = null
      await prevImage(socketState, serverFake, knexFake)
    })
    it('should not decrement image', () => {
      expect(getRoomStub.mock.calls.length).toBe(0)
    })
    it('should not broadcast message', () => {
      expect(ioStub.to.mock.calls.length).toBe(0)
    })
    it('should not emit message', () => {
      expect(ioStub.emit.mock.calls.length).toBe(0)
    })
  })

  describe('with valid room "/foo"', () => {
    beforeEach(async () => {
      socketState.roomName = '/foo'
      await prevImage(socketState, serverFake, knexFake)
    })
    it('should decrement image once', () => {
      expect(getRoomStub.mock.calls.length).toBe(1)
    })
    it('should decrement image with knex', () => {
      expect(getRoomStub.mock.calls[0]?.[0]).toBe(knexFake)
    })
    it('should decrement image with room name', () => {
      expect(getRoomStub.mock.calls[0]?.[1]).toBe('/foo')
    })
    it('should decrement image by exactly one image', () => {
      expect(getRoomStub.mock.calls[0]?.[2]).toBe(-1)
    })
    it('should broadcast message once', () => {
      expect(ioStub.to.mock.calls.length).toBe(1)
    })
    it('should broadcast to room name', () => {
      expect(ioStub.to.mock.calls[0]).toEqual(['/foo/bar'])
    })
    it('should emit message once', () => {
      expect(ioStub.emit.mock.calls.length).toBe(1)
    })
    it("should emit 'image-changed' message", () => {
      expect(ioStub.emit.mock.calls[0]?.[0]).toBe('image-changed')
    })
    it('should emit message for image', () => {
      expect(ioStub.emit.mock.calls[0]?.[1]).toBe('/foo/quux.png')
    })
  })

  describe('logging', () => {
    let loggerStub: MockInstance = vi.fn()
    beforeEach(() => {
      loggerStub = vi.spyOn(Imports, 'logger').mockImplementation((..._args: unknown[]) => undefined)
    })

    it('should log prevImage format on valid invocation', async () => {
      socketState.roomName = '/foo'
      await prevImage(socketState, serverFake, knexFake)
      expect(loggerStub.mock.calls[0]?.[0]).toBe('prevImage in %s')
    })

    it('should log the room name on valid invocation', async () => {
      socketState.roomName = '/foo'
      await prevImage(socketState, serverFake, knexFake)
      expect(loggerStub.mock.calls[0]?.[1]).toBe('/foo')
    })

    it('should not log when room name is null', async () => {
      socketState.roomName = null
      await prevImage(socketState, serverFake, knexFake)
      expect(loggerStub.mock.calls.length).toBe(0)
    })
  })
})

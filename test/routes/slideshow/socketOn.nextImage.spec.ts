'use sanity'

import Sinon from 'sinon'
import { cast, stubToKnex } from '#testutils/typeGuards.js'
import { SlideshowSocketState, handleSocket, nextImage, Internals, Imports } from '#routes/slideshow.js'
import type { Server as WebSocketServer, Socket } from 'socket.io'

const sandbox = Sinon.createSandbox()

describe('routes/slideshow socket next-image', () => {
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
  const tests: Array<[string, string | null, () => void]> = [
    [
      'not decrement image for null room',
      null,
      () => {
        expect(getRoomStub.callCount).toBe(0)
      },
    ],
    [
      'not broadcast message for null room',
      null,
      () => {
        expect(ioStub.to.callCount).toBe(0)
      },
    ],
    [
      'not emit message for null room',
      null,
      () => {
        expect(ioStub.emit.callCount).toBe(0)
      },
    ],
    [
      'decrement image for valid room',
      '/foo',
      () => {
        expect(getRoomStub.callCount).toBe(1)
      },
    ],
    [
      'decrement image with knex',
      '/foo',
      () => {
        expect(getRoomStub.firstCall.args[0]).toBe(knexFake)
      },
    ],
    [
      'decrement image with room name',
      '/foo',
      () => {
        expect(getRoomStub.firstCall.args[1]).toBe('/foo')
      },
    ],
    [
      'increment image by exactly one image',
      '/foo',
      () => {
        expect(getRoomStub.firstCall.args[2]).toBe(1)
      },
    ],
    [
      'broadcast message for valid room',
      '/foo',
      () => {
        expect(ioStub.to.callCount).toBe(1)
      },
    ],
    [
      'broadcast message to room name',
      '/foo',
      () => {
        expect(ioStub.to.firstCall.args).toEqual(['/foo/bar'])
      },
    ],
    [
      'emit message for valid room',
      '/foo',
      () => {
        expect(ioStub.emit.callCount).toBe(1)
      },
    ],
    [
      "emit 'image-changed' message",
      '/foo',
      () => {
        expect(ioStub.emit.firstCall.args[0]).toBe('image-changed')
      },
    ],
    [
      'emit message for image',
      '/foo',
      () => {
        expect(ioStub.emit.firstCall.args[1]).toBe('/foo/quux.png')
      },
    ],
  ]
  tests.forEach(([title, room, validationFn]) => {
    it(`should ${title}`, async () => {
      socketState.roomName = room
      await nextImage(socketState, serverFake, knexFake)
      validationFn()
    })
  })

  describe('logging', () => {
    let loggerStub = sandbox.stub()
    beforeEach(() => {
      loggerStub = sandbox.stub(Imports, 'logger')
    })

    it('should log nextImage format on valid invocation', async () => {
      socketState.roomName = '/foo'
      await nextImage(socketState, serverFake, knexFake)
      expect(loggerStub.firstCall.args[0]).toBe('nextImage in %s')
    })

    it('should log the room name on valid invocation', async () => {
      socketState.roomName = '/foo'
      await nextImage(socketState, serverFake, knexFake)
      expect(loggerStub.firstCall.args[1]).toBe('/foo')
    })

    it('should not log when room name is null', async () => {
      socketState.roomName = null
      await nextImage(socketState, serverFake, knexFake)
      expect(loggerStub.callCount).toBe(0)
    })
  })
})

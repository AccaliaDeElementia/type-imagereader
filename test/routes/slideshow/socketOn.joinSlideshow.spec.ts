'use sanity'

import Sinon from 'sinon'
import { cast, stubToKnex } from '#testutils/typeGuards.js'
import { SlideshowSocketState, handleSocket, joinSlideshow, Internals, Imports } from '#routes/slideshow.js'
import type { Server as WebSocketServer, Socket } from 'socket.io'

const sandbox = Sinon.createSandbox()

describe('routes/slideshow socket join-slideshow()', () => {
  let knexFake = stubToKnex({})
  let serverFake = cast<WebSocketServer>({})
  let socketStub = { on: sandbox.stub(), join: sandbox.stub().resolves(), emit: sandbox.stub() }
  let socketFake = cast<Socket>(socketStub)
  let socketState = new SlideshowSocketState()
  let roomData = {
    uriSafeImage: '/foo/bar/quux.png',
  }
  let getRoomStub = sandbox.stub().resolves(roomData)
  beforeEach(() => {
    knexFake = stubToKnex({})
    serverFake = cast<WebSocketServer>({})
    socketStub = { on: sandbox.stub(), join: sandbox.stub().resolves(), emit: sandbox.stub() }
    socketFake = cast<Socket>(socketStub)
    socketState = handleSocket(knexFake, serverFake, socketFake)
    socketState.roomName = 'NO_ROOM' // assign sentinel value to test against later
    roomData = {
      uriSafeImage: '/foo/quux.png',
    }
    getRoomStub = sandbox.stub(Internals, 'getRoomAndIncrementImage')
    getRoomStub.resolves(roomData)
  })
  afterEach(() => {
    sandbox.restore()
  })

  describe('with no-room value', () => {
    const noRoomCases: Array<[string, string | null | undefined]> = [
      ['undefined', undefined],
      ['null', null],
      ['empty string', ''],
    ]
    noRoomCases.forEach(([label, room]) => {
      describe(label, () => {
        beforeEach(async () => {
          await joinSlideshow(room, socketState, socketFake, knexFake)
        })
        it('should not join socket', () => {
          expect(socketStub.join.callCount).toBe(0)
        })
        it('should not save room name to state', () => {
          expect(socketState.roomName).toBe('NO_ROOM')
        })
        it('should not get room', () => {
          expect(getRoomStub.callCount).toBe(0)
        })
        it('should not emit message', () => {
          expect(socketStub.emit.callCount).toBe(0)
        })
      })
    })
  })

  describe('with valid room "/foo"', () => {
    beforeEach(async () => {
      await joinSlideshow('/foo', socketState, socketFake, knexFake)
    })
    it('should join socket', () => {
      expect(socketStub.join.callCount).toBe(1)
    })
    it('should join socket with room name', () => {
      expect(socketStub.join.firstCall.args).toEqual(['/foo'])
    })
    it('should save room name to state', () => {
      expect(socketState.roomName).toBe('/foo')
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
    it('should emit message once', () => {
      expect(socketStub.emit.callCount).toBe(1)
    })
    it("should emit 'image-changed' message", () => {
      expect(socketStub.emit.firstCall.args[0]).toBe('image-changed')
    })
    it('should emit message with image path', () => {
      expect(socketStub.emit.firstCall.args[1]).toBe('/foo/quux.png')
    })
  })

  describe('logging', () => {
    let loggerStub = sandbox.stub()
    beforeEach(() => {
      loggerStub = sandbox.stub(Imports, 'logger')
      cast<{ id: string }>(socketStub).id = 'socket-id-123'
    })

    it('should log joinSlideshow format on valid invocation', async () => {
      await joinSlideshow('/foo', socketState, socketFake, knexFake)
      expect(loggerStub.firstCall.args[0]).toBe('joinSlideshow %s (socket=%s)')
    })

    it('should log the room name on valid invocation', async () => {
      await joinSlideshow('/foo', socketState, socketFake, knexFake)
      expect(loggerStub.firstCall.args[1]).toBe('/foo')
    })

    it('should log the socket id on valid invocation', async () => {
      await joinSlideshow('/foo', socketState, socketFake, knexFake)
      expect(loggerStub.firstCall.args[2]).toBe('socket-id-123')
    })

    it('should not log when room name is missing', async () => {
      await joinSlideshow(undefined, socketState, socketFake, knexFake)
      expect(loggerStub.callCount).toBe(0)
    })
  })
})

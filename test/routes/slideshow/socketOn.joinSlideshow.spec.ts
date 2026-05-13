'use sanity'

import { cast, stubToKnex } from '#testutils/typeGuards.js'
import { SlideshowSocketState, handleSocket, joinSlideshow, Internals, Imports } from '#routes/slideshow.js'
import type { Server as WebSocketServer, Socket } from 'socket.io'
import type { MockInstance } from 'vitest'

describe('routes/slideshow socket join-slideshow()', () => {
  let knexFake = stubToKnex({})
  let serverFake = cast<WebSocketServer>({})
  let socketStub = { on: vi.fn(), join: vi.fn().mockResolvedValue(undefined), emit: vi.fn() }
  let socketFake = cast<Socket>(socketStub)
  let socketState = new SlideshowSocketState()
  let roomData = {
    uriSafeImage: '/foo/bar/quux.png',
  }
  let getRoomStub = vi.fn().mockResolvedValue(roomData)
  beforeEach(() => {
    knexFake = stubToKnex({})
    serverFake = cast<WebSocketServer>({})
    socketStub = { on: vi.fn(), join: vi.fn().mockResolvedValue(undefined), emit: vi.fn() }
    socketFake = cast<Socket>(socketStub)
    socketState = handleSocket(knexFake, serverFake, socketFake)
    socketState.roomName = 'NO_ROOM' // assign sentinel value to test against later
    roomData = {
      uriSafeImage: '/foo/quux.png',
    }
    getRoomStub = vi.spyOn(Internals, 'getRoomAndIncrementImage').mockResolvedValue(cast(roomData))
  })
  afterEach(() => {
    vi.restoreAllMocks()
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
          expect(socketStub.join.mock.calls.length).toBe(0)
        })
        it('should not save room name to state', () => {
          expect(socketState.roomName).toBe('NO_ROOM')
        })
        it('should not get room', () => {
          expect(getRoomStub.mock.calls.length).toBe(0)
        })
        it('should not emit message', () => {
          expect(socketStub.emit.mock.calls.length).toBe(0)
        })
      })
    })
  })

  describe('with valid room "/foo"', () => {
    beforeEach(async () => {
      await joinSlideshow('/foo', socketState, socketFake, knexFake)
    })
    it('should join socket', () => {
      expect(socketStub.join.mock.calls.length).toBe(1)
    })
    it('should join socket with room name', () => {
      expect(socketStub.join.mock.calls[0]).toEqual(['/foo'])
    })
    it('should save room name to state', () => {
      expect(socketState.roomName).toBe('/foo')
    })
    it('should get room', () => {
      expect(getRoomStub.mock.calls.length).toBe(1)
    })
    it('should get room with knex', () => {
      expect(getRoomStub.mock.calls[0]?.[0]).toBe(knexFake)
    })
    it('should get room with room name', () => {
      expect(getRoomStub.mock.calls[0]?.[1]).toBe('/foo')
    })
    it('should get room without increment', () => {
      expect(getRoomStub.mock.calls[0]).toHaveLength(2)
    })
    it('should emit message once', () => {
      expect(socketStub.emit.mock.calls.length).toBe(1)
    })
    it("should emit 'image-changed' message", () => {
      expect(socketStub.emit.mock.calls[0]?.[0]).toBe('image-changed')
    })
    it('should emit message with image path', () => {
      expect(socketStub.emit.mock.calls[0]?.[1]).toBe('/foo/quux.png')
    })
  })

  describe('logging', () => {
    let loggerStub: MockInstance = vi.fn()
    beforeEach(() => {
      loggerStub = vi.spyOn(Imports, 'logger').mockImplementation((..._args: unknown[]) => undefined)
      cast<{ id: string }>(socketStub).id = 'socket-id-123'
    })

    it('should log joinSlideshow format on valid invocation', async () => {
      await joinSlideshow('/foo', socketState, socketFake, knexFake)
      expect(loggerStub.mock.calls[0]?.[0]).toBe('joinSlideshow %s (socket=%s)')
    })

    it('should log the room name on valid invocation', async () => {
      await joinSlideshow('/foo', socketState, socketFake, knexFake)
      expect(loggerStub.mock.calls[0]?.[1]).toBe('/foo')
    })

    it('should log the socket id on valid invocation', async () => {
      await joinSlideshow('/foo', socketState, socketFake, knexFake)
      expect(loggerStub.mock.calls[0]?.[2]).toBe('socket-id-123')
    })

    it('should not log when room name is missing', async () => {
      await joinSlideshow(undefined, socketState, socketFake, knexFake)
      expect(loggerStub.mock.calls.length).toBe(0)
    })
  })
})

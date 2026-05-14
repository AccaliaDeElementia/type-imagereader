'use sanity'

import { cast, stubToKnex } from '#testutils/typeGuards.js'
import { voidFn } from '#testutils/mocks.js'
import { SlideshowSocketState, handleSocket, gotoImage, Internals, Imports } from '#routes/slideshow.js'
import type { Server as WebSocketServer, Socket } from 'socket.io'
import type { MockInstance } from 'vitest'

describe('routes/slideshow socket goto-image', () => {
  let knexFake = stubToKnex({})
  let ioStub = {}
  let serverFake = cast<WebSocketServer>(ioStub)
  let socketStub = { on: voidFn() }
  let socketFake = cast<Socket>(socketStub)
  let socketState = new SlideshowSocketState()
  let folder = { path: '/foo/bar' }
  let roomData = { images: [folder], index: -1 }
  let getRoomStub = vi.fn().mockResolvedValue(roomData)
  let picturePath = ''
  let setLatestStub = vi.fn().mockResolvedValue(picturePath)
  beforeEach(() => {
    knexFake = stubToKnex({})
    ioStub = {}
    serverFake = cast<WebSocketServer>(ioStub)
    socketStub = { on: voidFn() }
    socketFake = cast<Socket>(socketStub)
    socketState = handleSocket(knexFake, serverFake, socketFake)
    folder = { path: '/foo/bar' }
    roomData = { images: [folder], index: -1 }
    getRoomStub = vi.spyOn(Internals, 'getRoomAndIncrementImage').mockResolvedValue(cast(roomData))
    picturePath = `Picture-${Math.random()}.png`
    setLatestStub = vi.spyOn(Imports, 'setLatest').mockResolvedValue(picturePath)
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('with null room', () => {
    let spy = voidFn()
    beforeEach(async () => {
      spy = voidFn()
      socketState.roomName = null
      roomData.index = 0
      await gotoImage(spy, socketState, knexFake)
    })
    it('should not get room', () => {
      expect(getRoomStub.mock.calls.length).toBe(0)
    })
    it('should not provide callback path', () => {
      expect(spy.mock.calls[0]).toEqual([null])
    })
    it('should not set latest', () => {
      expect(setLatestStub.mock.calls.length).toBe(0)
    })
  })

  describe('with valid room and bad index (-1)', () => {
    let spy = voidFn()
    beforeEach(async () => {
      spy = voidFn()
      socketState.roomName = '/foo'
      roomData.index = -1
      await gotoImage(spy, socketState, knexFake)
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
    it('should not provide callback path', () => {
      expect(spy.mock.calls[0]).toEqual([null])
    })
  })

  describe('with valid room and good index (0)', () => {
    let spy = voidFn()
    beforeEach(async () => {
      spy = voidFn()
      socketState.roomName = '/foo'
      roomData.index = 0
      await gotoImage(spy, socketState, knexFake)
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
    it('should send callback path', () => {
      expect(spy.mock.calls[0]?.[0]).toBe(picturePath)
    })
    it('should set latest', () => {
      expect(setLatestStub.mock.calls.length).toBe(1)
    })
    it('should set latest with knex', () => {
      expect(setLatestStub.mock.calls[0]?.[0]).toBe(knexFake)
    })
    it('should set latest with folder object', () => {
      expect(setLatestStub.mock.calls[0]?.[1]).toBe(folder)
    })
  })

  describe('with valid room and out-of-range index (12)', () => {
    beforeEach(async () => {
      const spy = voidFn()
      socketState.roomName = '/foo'
      roomData.index = 12
      await gotoImage(spy, socketState, knexFake)
    })
    it('should not set latest', () => {
      expect(setLatestStub.mock.calls.length).toBe(0)
    })
  })

  it('should send null callback path when setLatest returns null', async () => {
    setLatestStub.mockResolvedValue(null)
    socketState.roomName = '/foo'
    roomData.index = 0
    const spy = voidFn()
    await gotoImage(spy, socketState, knexFake)
    expect(spy.mock.calls[0]?.[0]).toBe(null)
  })

  describe('logging', () => {
    let loggerStub: MockInstance = voidFn()
    beforeEach(() => {
      loggerStub = vi.spyOn(Imports, 'logger').mockImplementation((..._args: unknown[]) => undefined)
    })

    it('should log gotoImage format on valid invocation', async () => {
      socketState.roomName = '/foo'
      roomData.index = 0
      await gotoImage(voidFn(), socketState, knexFake)
      expect(loggerStub.mock.calls[0]?.[0]).toBe('gotoImage in %s')
    })

    it('should log the room name on valid invocation', async () => {
      socketState.roomName = '/foo'
      roomData.index = 0
      await gotoImage(voidFn(), socketState, knexFake)
      expect(loggerStub.mock.calls[0]?.[1]).toBe('/foo')
    })

    it('should not log when room name is null', async () => {
      socketState.roomName = null
      await gotoImage(voidFn(), socketState, knexFake)
      expect(loggerStub.mock.calls.length).toBe(0)
    })
  })
})

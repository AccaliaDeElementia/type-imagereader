'use sanity'

import { cast, stubToKnex } from '#testutils/typeGuards.js'
import { voidFn } from '#testutils/mocks.js'
import assert from 'node:assert'
import { handleSocket, Internals, Imports } from '#routes/slideshow.js'
import type { Server as WebSocketServer, Socket } from 'socket.io'
import type { MockInstance } from 'vitest'

describe('routes/slideshow handleSocket()', () => {
  let knexFake = stubToKnex({})
  let serverFake = cast<WebSocketServer>({})
  let socketStub = { on: vi.fn() }
  let socketFake = cast<Socket>(socketStub)
  let socketStubs: Array<[string, MockInstance]> = []
  beforeEach(() => {
    knexFake = stubToKnex({})
    serverFake = cast<WebSocketServer>({})
    socketStub = { on: vi.fn() }
    socketFake = cast<Socket>(socketStub)
    socketStubs = [
      ['get-launchId', vi.spyOn(Internals, 'getLaunchId').mockImplementation((..._args: unknown[]) => undefined)],
      ['join-slideshow', vi.spyOn(Internals, 'joinSlideshow').mockResolvedValue(undefined)],
      ['prev-image', vi.spyOn(Internals, 'prevImage').mockResolvedValue(undefined)],
      ['next-image', vi.spyOn(Internals, 'nextImage').mockResolvedValue(undefined)],
      ['goto-image', vi.spyOn(Internals, 'gotoImage').mockResolvedValue(undefined)],
    ]
  })
  const endpoints = ['get-launchId', 'join-slideshow', 'prev-image', 'next-image', 'goto-image']
  it('should register expected endpoint count', () => {
    handleSocket(knexFake, serverFake, socketFake)
    expect(socketStub.on.mock.calls.length).toBe(endpoints.length)
  })
  const getCallback = (endpoint: string): unknown =>
    socketStub.on.mock.calls.filter((call) => call[0] === endpoint).map((call) => call[1] as unknown)[0]
  endpoints.forEach((endpoint) => {
    it(`should forward call for ${endpoint}`, () => {
      handleSocket(knexFake, serverFake, socketFake)
      const fn = cast<() => void>(getCallback(endpoint))
      fn()
      const stub = socketStubs.find(([name]) => name === endpoint)
      assert(stub !== undefined)
      expect(stub[1].mock.calls.length).toBe(1)
    })
  })
  const catchLogEndpoints: Array<[string, string]> = [
    ['join-slideshow', 'joinSlideshow error'],
    ['prev-image', 'prevImage error'],
    ['next-image', 'nextImage error'],
  ]
  catchLogEndpoints.forEach(([endpoint, message]) => {
    it(`should route ${endpoint} failures through catchLog`, () => {
      const catchLogStub = vi.spyOn(Imports, 'catchLog').mockResolvedValue(undefined)
      handleSocket(knexFake, serverFake, socketFake)
      cast<(cb?: () => void) => void>(getCallback(endpoint))(() => undefined)
      expect(catchLogStub.mock.calls.length).toBe(1)
    })
    it(`should label ${endpoint} failures with its own message`, () => {
      const catchLogStub = vi.spyOn(Imports, 'catchLog').mockResolvedValue(undefined)
      handleSocket(knexFake, serverFake, socketFake)
      cast<(cb?: () => void) => void>(getCallback(endpoint))(() => undefined)
      expect(catchLogStub.mock.calls[0]?.[2]).toBe(message)
    })
  })
  it('should route goto-image through respondWithGotoImage', () => {
    const respondStub = vi.spyOn(Internals, 'respondWithGotoImage').mockResolvedValue(undefined)
    handleSocket(knexFake, serverFake, socketFake)
    const callbackStub = voidFn()
    cast<(cb: (arg: unknown) => void) => void>(getCallback('goto-image'))(callbackStub)
    expect(respondStub.mock.calls.length).toBe(1)
  })

  it('should return state object', () => {
    const state = handleSocket(knexFake, serverFake, socketFake)
    expect(Object.keys(state)).toEqual(['roomName'])
  })
  it('should set initial roomName to null', () => {
    const state = handleSocket(knexFake, serverFake, socketFake)
    expect(state.roomName).toBe(null)
  })
})

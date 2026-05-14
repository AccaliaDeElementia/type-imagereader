'use sanity'

import { cast, stubToKnex } from '#testutils/typeGuards.js'
import { voidFn } from '#testutils/mocks.js'
import assert from 'node:assert'
import { handleSocket, Internals, Imports } from '#routes/slideshow.js'
import type { Server as WebSocketServer, Socket } from 'socket.io'
import { setImmediate as yieldMacro } from 'node:timers/promises'
import type { MockInstance } from 'vitest'

describe('routes/slideshow handleSocket()', () => {
  let knexFake = stubToKnex({})
  let serverFake = cast<WebSocketServer>({})
  let socketStub = { on: vi.fn() }
  let socketFake = cast<Socket>(socketStub)
  let socketStubs: Array<[string, MockInstance]> = []
  let loggerStub: MockInstance = vi.fn()
  beforeEach(() => {
    knexFake = stubToKnex({})
    serverFake = cast<WebSocketServer>({})
    socketStub = { on: vi.fn() }
    socketFake = cast<Socket>(socketStub)
    loggerStub = vi.spyOn(Imports, 'logger').mockImplementation((..._args: unknown[]) => undefined)
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
    it(`should handle socket message '${endpoint}'`, () => {
      handleSocket(knexFake, serverFake, socketFake)
      expect(socketStub.on).toHaveBeenCalledWith(endpoint, expect.anything())
    })
    it(`should register a callback for '${endpoint}'`, () => {
      handleSocket(knexFake, serverFake, socketFake)
      expect(getCallback(endpoint)).toBeTypeOf('function')
    })
    it(`should forward call for ${endpoint}`, () => {
      handleSocket(knexFake, serverFake, socketFake)
      const fn = cast<() => void>(getCallback(endpoint))
      fn()
      const stub = socketStubs.find(([name]) => name === endpoint)
      assert(stub !== undefined)
      expect(stub[1].mock.calls.length).toBe(1)
    })
  })
  const asyncEndpoints: Array<[string, string]> = [
    ['join-slideshow', 'joinSlideshow'],
    ['prev-image', 'prevImage'],
    ['next-image', 'nextImage'],
    ['goto-image', 'gotoImage'],
  ]
  asyncEndpoints.forEach(([endpoint, handlerName]) => {
    it(`should log the error when ${endpoint} handler rejects`, async () => {
      const stub = socketStubs.find(([name]) => name === endpoint)
      assert(stub !== undefined)
      const err = new Error(`boom-${handlerName}`)
      stub[1].mockRejectedValue(err)
      handleSocket(knexFake, serverFake, socketFake)
      const fn = cast<(cb?: () => void) => void>(getCallback(endpoint))
      fn(() => undefined)
      await yieldMacro()
      const matching = loggerStub.mock.calls.find((call) => call[1] === err)
      assert(matching !== undefined, `expected logger to be called with the ${handlerName} error`)
    })
  })
  it('should invoke the client callback with null when goto-image rejects', async () => {
    const stub = socketStubs.find(([name]) => name === 'goto-image')
    assert(stub !== undefined)
    stub[1].mockRejectedValue(new Error('goto failed'))
    handleSocket(knexFake, serverFake, socketFake)
    const fn = cast<(cb: (arg: unknown) => void) => void>(getCallback('goto-image'))
    const callbackStub = voidFn()
    fn(callbackStub)
    await yieldMacro()
    expect(callbackStub.mock.calls[0]).toEqual([null])
  })
  it('should return an object for state storage', () => {
    const state = handleSocket(knexFake, serverFake, socketFake)
    expect(state).toBeTypeOf('object')
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

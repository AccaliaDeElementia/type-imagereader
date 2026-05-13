'use sanity'

import { cast, stubToKnex } from '#testutils/typeGuards.js'
import { Config, getLaunchId, handleSocket } from '#routes/slideshow.js'
import type { Server as WebSocketServer, Socket } from 'socket.io'

describe('routes/slideshow socket get-launchId()', () => {
  let knexFake = stubToKnex({})
  let serverFake = cast<WebSocketServer>({})
  let socketStub = { on: vi.fn() }
  let socketFake = cast<Socket>(socketStub)
  beforeEach(() => {
    knexFake = stubToKnex({})
    serverFake = cast<WebSocketServer>({})
    socketStub = { on: vi.fn() }
    socketFake = cast<Socket>(socketStub)
    handleSocket(knexFake, serverFake, socketFake)
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })
  it('should call provided callback on invocation', () => {
    const spy = vi.fn()
    getLaunchId(spy)
    expect(spy.mock.calls.length).toBe(1)
  })
  it('should retrieve Config.launchId on invocation', () => {
    const value = 1e9 + Math.floor(Math.random() * 1e9)
    Config.launchId = value
    const spy = vi.fn()
    getLaunchId(spy)
    expect(spy.mock.calls[0]).toEqual([value])
  })
})

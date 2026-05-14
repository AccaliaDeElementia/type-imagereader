'use sanity'

import type { Application, Router } from 'express'
import type { Server as WebSocketServer } from 'socket.io'
import type { Server } from 'node:http'
import { getRouter, Imports } from '#routes/root.js'
import { cast } from '#testutils/typeGuards.js'

describe('routes/root getRouter()', () => {
  const applicationFake = cast<Application>({})
  const serverFake = cast<Server>({})
  const socketsFake = cast<WebSocketServer>({})
  let routerStub = { get: vi.fn() }
  beforeEach(() => {
    routerStub = { get: vi.fn() }
    vi.spyOn(Imports, 'Router').mockReturnValue(cast<Router>(routerStub))
  })
  const endpoints = ['/', '/show', '/show/*path']
  it('should register expected number of endpoints', async () => {
    await getRouter(applicationFake, serverFake, socketsFake)
    expect(routerStub.get.mock.calls.length).toBe(endpoints.length)
  })
  endpoints.forEach((endpoint) => {
    it(`should register endpoint '${endpoint}`, async () => {
      await getRouter(applicationFake, serverFake, socketsFake)
      expect(routerStub.get).toHaveBeenCalledWith(endpoint, expect.anything())
    })
    it(`should register handler function for endpoint '${endpoint}`, async () => {
      await getRouter(applicationFake, serverFake, socketsFake)
      const fn = routerStub.get.mock.calls.find((call) => call[0] === endpoint)?.[1] as unknown
      expect(fn).toBeTypeOf('function')
    })
  })
})

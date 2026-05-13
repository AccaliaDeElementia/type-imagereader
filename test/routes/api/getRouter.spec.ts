'use sanity'

import type { Application, Router } from 'express'
import type { Server } from 'node:http'
import type { Server as WebSocketServer } from 'socket.io'
import { getRouter, Imports } from '#routes/api.js'
import { cast } from '#testutils/typeGuards.js'
import assert from 'node:assert'

describe('routes/api getRouter()', () => {
  let applicationFake = cast<Application>({ App: Math.random() })
  let serverFake = cast<Server>({ Server: Math.random() })
  let socketServerFake = cast<WebSocketServer>({ Sockets: Math.random() })
  let routerStub = {
    get: vi.fn(),
    post: vi.fn(),
  }
  beforeEach(() => {
    applicationFake = cast<Application>({ App: Math.random() })
    serverFake = cast<Server>({ Server: Math.random() })
    socketServerFake = cast<WebSocketServer>({ Sockets: Math.random() })
    routerStub = {
      get: vi.fn(),
      post: vi.fn(),
    }
    vi.spyOn(Imports, 'initialize').mockResolvedValue(cast(undefined))
    vi.spyOn(Imports, 'Router').mockReturnValue(cast<Router>(routerStub))
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })
  const getRoutes = ['/', '/healthcheck', '/listing/*path', '/listing', '/bookmarks/*path', '/bookmarks']
  getRoutes.forEach((path) => {
    it(`should attach handler for get \`${path}\``, async () => {
      await getRouter(applicationFake, serverFake, socketServerFake)
      expect(routerStub.get).toHaveBeenCalledWith(path, expect.anything())
    })
  })

  const postRoutes = ['/navigate/latest', '/mark/read', '/mark/unread', '/bookmarks/add', '/bookmarks/remove']
  postRoutes.forEach((path) => {
    it(`should attach handler for post \`${path}\``, async () => {
      await getRouter(applicationFake, serverFake, socketServerFake)
      expect(routerStub.post).toHaveBeenCalledWith(path, expect.anything())
    })
  })

  const aliasedRoutes: Array<[string, string]> = [
    ['/listing', '/listing/*path'],
    ['/bookmarks', '/bookmarks/*path'],
  ]
  aliasedRoutes.forEach(([base, wildcard]) => {
    it(`should use same handler for \`${base}\` and \`${wildcard}\``, async () => {
      await getRouter(applicationFake, serverFake, socketServerFake)
      const fn1 = routerStub.get.mock.calls.find((call) => call[0] === base)?.[1] as unknown
      const fn2 = routerStub.get.mock.calls.find((call) => call[0] === wildcard)?.[1] as unknown
      assert(fn1 !== undefined)
      assert(fn2 !== undefined)
      expect(fn1).toBe(fn2)
    })
  })
})

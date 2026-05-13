'use sanity'

import type { Express } from 'express'
import type { Server as WebSocketServer } from 'socket.io'
import type { Server } from 'node:http'
import { cast } from '#testutils/typeGuards.js'
import { createApp, Imports } from '#server.js'

describe('Server createApp', () => {
  let serverFake = cast<Server>({})
  let socketsFake = cast<WebSocketServer>({})
  let socketsServerStub = vi.fn()
  let appFake = cast<Express>({})
  let expressStub = vi.fn().mockReturnValue(appFake)
  let createServerStub = vi.fn().mockReturnValue(serverFake)
  beforeEach(() => {
    serverFake = cast<Server>({})
    socketsFake = cast<WebSocketServer>({})
    appFake = cast<Express>({})
    expressStub = vi.spyOn(Imports, 'express').mockReturnValue(appFake)
    createServerStub = vi.spyOn(Imports, 'createServer').mockReturnValue(serverFake)
    socketsServerStub = cast<typeof socketsServerStub>(
      vi.spyOn(Imports, 'WebSocketServer').mockImplementation(
        cast<typeof Imports.WebSocketServer>(function fakeWebSocketServer() {
          return socketsFake
        }),
      ),
    )
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })
  it('should construct express app', () => {
    createApp()
    expect(expressStub.mock.calls.length).toBe(1)
  })
  it('should construct express app with default config', () => {
    createApp()
    expect(expressStub.mock.calls[0]).toHaveLength(0)
  })
  it('should create an http server wrapping the express app', () => {
    createApp()
    expect(createServerStub.mock.calls.length).toBe(1)
  })
  it('should delegate incoming requests to the express app via the createServer listener', () => {
    const appCallStub = vi.fn()
    expressStub.mockReturnValue(cast<Express>(appCallStub))
    createApp()
    const listener = cast<(req: unknown, res: unknown) => void>(createServerStub.mock.calls[0]?.[0])
    const reqFake = { req: true }
    const resFake = { res: true }
    listener(reqFake, resFake)
    expect(appCallStub.mock.calls[0]).toEqual([reqFake, resFake])
  })
  it('should not start listening from createApp', () => {
    createApp()
    // createApp must stay passive — listening is deferred to listenOnPort at the end of start()
    // so requests cannot reach handlers until every router is registered.
    expect(serverFake).not.toHaveProperty('listen')
  })
  it('should create websocket server', () => {
    createApp()
    expect(socketsServerStub.mock.calls.length).toBe(1)
  })
  it('should create websocket server from the http server', () => {
    createApp()
    expect(socketsServerStub.mock.calls[0]?.[0]).toBe(serverFake)
  })
  it('should return tuple of [express app, http server, websocket server]', () => {
    const result = createApp()
    expect(result).toEqual([appFake, serverFake, socketsFake])
  })
})

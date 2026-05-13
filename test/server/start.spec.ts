'use sanity'

import { cast } from '#testutils/typeGuards.js'
import { start, Internals, setClacksOverhead } from '#server.js'
import type { Express } from 'express'
import type { Server as HttpServer } from 'node:http'
import type { Server as WebSocketServer } from 'socket.io'
import type { MockInstance } from 'vitest'

describe('Server start', () => {
  let appStub = { use: vi.fn() }
  let appFake = cast<Express>(appStub)
  let serverFake = cast<HttpServer>({})
  let socketsFake = cast<WebSocketServer>({})
  let createAppStub: MockInstance = vi.fn()
  let configureBaseAppStub: MockInstance = vi.fn()
  let configureLoggingStub: MockInstance = vi.fn()
  let configureErrorHandlerStub: MockInstance = vi.fn()
  let registerRoutersStub: MockInstance = vi.fn()
  let registerViewsStub: MockInstance = vi.fn()
  let listenOnPortStub: MockInstance = vi.fn()
  beforeEach(() => {
    appStub = { use: vi.fn() }
    appFake = cast<Express>(appStub)
    serverFake = cast<HttpServer>({})
    socketsFake = cast<WebSocketServer>({})
    createAppStub = vi.spyOn(Internals, 'createApp').mockReturnValue([appFake, serverFake, socketsFake])
    configureBaseAppStub = vi.spyOn(Internals, 'configureBaseApp').mockImplementation(() => undefined)
    configureLoggingStub = vi.spyOn(Internals, 'configureLogging').mockImplementation(() => undefined)
    configureErrorHandlerStub = vi.spyOn(Internals, 'configureErrorHandler').mockImplementation(() => undefined)
    registerRoutersStub = vi.spyOn(Internals, 'registerRouters').mockResolvedValue(undefined)
    registerViewsStub = vi.spyOn(Internals, 'registerViewsAndMiddleware').mockImplementation(() => undefined)
    listenOnPortStub = vi.spyOn(Internals, 'listenOnPort').mockImplementation(() => undefined)
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('when start(65535) succeeds', () => {
    beforeEach(async () => {
      await start(65535)
    })

    describe('createApp', () => {
      it('should be called once', () => {
        expect(createAppStub.mock.calls.length).toBe(1)
      })
      it('should be called with no arguments', () => {
        expect(createAppStub.mock.calls[0]).toHaveLength(0)
      })
    })

    describe('configureBaseApp', () => {
      it('should be called once', () => {
        expect(configureBaseAppStub.mock.calls.length).toBe(1)
      })
      it('should be called with one argument', () => {
        expect(configureBaseAppStub.mock.calls[0]).toHaveLength(1)
      })
      it('should be called with the app', () => {
        expect(configureBaseAppStub.mock.calls[0]?.[0]).toBe(appFake)
      })
    })

    describe('configureLogging', () => {
      it('should be called once', () => {
        expect(configureLoggingStub.mock.calls.length).toBe(1)
      })
      it('should be called with one argument', () => {
        expect(configureLoggingStub.mock.calls[0]).toHaveLength(1)
      })
      it('should be called with the app', () => {
        expect(configureLoggingStub.mock.calls[0]?.[0]).toBe(appFake)
      })
    })

    describe('registerRouters', () => {
      it('should be called once', () => {
        expect(registerRoutersStub.mock.calls.length).toBe(1)
      })
      it('should be called with three arguments', () => {
        expect(registerRoutersStub.mock.calls[0]).toHaveLength(3)
      })
      it('should be called with the app', () => {
        expect(registerRoutersStub.mock.calls[0]?.[0]).toBe(appFake)
      })
      it('should be called with the http server', () => {
        expect(registerRoutersStub.mock.calls[0]?.[1]).toBe(serverFake)
      })
      it('should be called with the websockets server', () => {
        expect(registerRoutersStub.mock.calls[0]?.[2]).toBe(socketsFake)
      })
    })

    describe('configureErrorHandler', () => {
      it('should be called once', () => {
        expect(configureErrorHandlerStub.mock.calls.length).toBe(1)
      })
      it('should be called with one argument', () => {
        expect(configureErrorHandlerStub.mock.calls[0]).toHaveLength(1)
      })
      it('should be called with the app', () => {
        expect(configureErrorHandlerStub.mock.calls[0]?.[0]).toBe(appFake)
      })
    })

    describe('registerViewsAndMiddleware', () => {
      it('should be called once', () => {
        expect(registerViewsStub.mock.calls.length).toBe(1)
      })
      it('should be called with one argument', () => {
        expect(registerViewsStub.mock.calls[0]).toHaveLength(1)
      })
      it('should be called with the app', () => {
        expect(registerViewsStub.mock.calls[0]?.[0]).toBe(appFake)
      })
    })

    describe('listenOnPort', () => {
      it('should be called once', () => {
        expect(listenOnPortStub.mock.calls.length).toBe(1)
      })
      it('should be called with the http server', () => {
        expect(listenOnPortStub.mock.calls[0]?.[0]).toBe(serverFake)
      })
      it('should be called with the provided port', () => {
        expect(listenOnPortStub.mock.calls[0]?.[1]).toBe(65535)
      })
    })

    describe('X-Clacks-Overhead middleware', () => {
      it('should be registered via app.use', () => {
        const clacksRegistration = appStub.use.mock.calls.find((c) => c[0] === setClacksOverhead)
        expect(clacksRegistration).not.toBe(undefined)
      })
    })

    describe('call ordering', () => {
      it('should configure base app before configuring logging', () => {
        expect(
          (configureBaseAppStub.mock.invocationCallOrder[0] ?? 0) <
            (configureLoggingStub.mock.invocationCallOrder[0] ?? 0),
        ).toBe(true)
      })
      it('should configure logging before registering routers so helmet/morgan apply to handled responses', () => {
        expect(
          (configureLoggingStub.mock.invocationCallOrder[0] ?? 0) <
            (registerRoutersStub.mock.invocationCallOrder[0] ?? 0),
        ).toBe(true)
      })
      it('should register the X-Clacks-Overhead middleware before registering routers', () => {
        const clacksIndex = appStub.use.mock.calls.findIndex((c) => c[0] === setClacksOverhead)
        expect(
          (appStub.use.mock.invocationCallOrder[clacksIndex] ?? 0) <
            (registerRoutersStub.mock.invocationCallOrder[0] ?? 0),
        ).toBe(true)
      })
      it('should register views before registering routers so view engine is set before any router can handle a request', () => {
        expect(
          (registerViewsStub.mock.invocationCallOrder[0] ?? 0) < (registerRoutersStub.mock.invocationCallOrder[0] ?? 0),
        ).toBe(true)
      })
      it('should configure error handler after registering routers so it catches errors thrown from them', () => {
        expect(
          (configureErrorHandlerStub.mock.invocationCallOrder[0] ?? 0) >
            (registerRoutersStub.mock.invocationCallOrder[0] ?? 0),
        ).toBe(true)
      })
      it('should listen on port only after all setup is complete', () => {
        expect(
          (listenOnPortStub.mock.invocationCallOrder[0] ?? 0) >
            (configureErrorHandlerStub.mock.invocationCallOrder[0] ?? 0),
        ).toBe(true)
      })
    })
  })

  it('should return app', async () => {
    const { app } = await start(1024)
    expect(app).toBe(appFake)
  })

  it('should return server', async () => {
    const { server } = await start(2048)
    expect(server).toBe(serverFake)
  })
})

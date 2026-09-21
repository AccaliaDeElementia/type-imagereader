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
  let serverFake = cast<HttpServer>({ httpServer: true })
  let socketsFake = cast<WebSocketServer>({ websocketServer: true })
  let createAppStub: MockInstance = vi.fn()
  let configureBaseAppStub: MockInstance = vi.fn()
  let configureLoggingStub: MockInstance = vi.fn()
  let configureErrorHandlerStub: MockInstance = vi.fn()
  let configureNotFoundStub: MockInstance = vi.fn()
  let registerRoutersStub: MockInstance = vi.fn()
  let registerViewsStub: MockInstance = vi.fn()
  let listenOnPortStub: MockInstance = vi.fn()
  beforeEach(() => {
    appStub = { use: vi.fn() }
    appFake = cast<Express>(appStub)
    serverFake = cast<HttpServer>({ httpServer: true })
    socketsFake = cast<WebSocketServer>({ websocketServer: true })
    createAppStub = vi.spyOn(Internals, 'createApp').mockReturnValue([appFake, serverFake, socketsFake])
    configureBaseAppStub = vi.spyOn(Internals, 'configureBaseApp').mockImplementation(() => undefined)
    configureLoggingStub = vi.spyOn(Internals, 'configureLogging').mockImplementation(() => undefined)
    configureErrorHandlerStub = vi.spyOn(Internals, 'configureErrorHandler').mockImplementation(() => undefined)
    configureNotFoundStub = vi.spyOn(Internals, 'configureNotFound').mockImplementation(() => undefined)
    registerRoutersStub = vi.spyOn(Internals, 'registerRouters').mockResolvedValue(undefined)
    registerViewsStub = vi.spyOn(Internals, 'registerViewsAndMiddleware').mockImplementation(() => undefined)
    listenOnPortStub = vi.spyOn(Internals, 'listenOnPort').mockImplementation(() => undefined)
  })
  describe('when start(65535) succeeds', () => {
    beforeEach(async () => {
      await start(65535)
    })

    interface StartStep {
      name: string
      stub: () => MockInstance
      expectedArgs: () => unknown[]
    }
    const startSteps: StartStep[] = [
      { name: 'createApp', stub: () => createAppStub, expectedArgs: () => [] },
      { name: 'configureBaseApp', stub: () => configureBaseAppStub, expectedArgs: () => [appFake] },
      { name: 'configureLogging', stub: () => configureLoggingStub, expectedArgs: () => [appFake] },
      { name: 'registerViewsAndMiddleware', stub: () => registerViewsStub, expectedArgs: () => [appFake] },
      {
        name: 'registerRouters',
        stub: () => registerRoutersStub,
        expectedArgs: () => [appFake, serverFake, socketsFake],
      },
      { name: 'configureNotFound', stub: () => configureNotFoundStub, expectedArgs: () => [appFake] },
      { name: 'configureErrorHandler', stub: () => configureErrorHandlerStub, expectedArgs: () => [appFake] },
      { name: 'listenOnPort', stub: () => listenOnPortStub, expectedArgs: () => [serverFake, 65535] },
    ]
    it.each(startSteps)(
      'should call $name exactly once with its expected arguments',
      ({ stub, expectedArgs }: StartStep) => {
        expect(stub().mock.calls).toEqual([expectedArgs()])
      },
    )

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
      it('should configure not-found after registering routers so unmatched paths fall through to it', () => {
        expect(
          (configureNotFoundStub.mock.invocationCallOrder[0] ?? 0) >
            (registerRoutersStub.mock.invocationCallOrder[0] ?? 0),
        ).toBe(true)
      })
      it('should configure not-found before configuring error handler so the error handler stays last', () => {
        expect(
          (configureNotFoundStub.mock.invocationCallOrder[0] ?? 0) <
            (configureErrorHandlerStub.mock.invocationCallOrder[0] ?? 0),
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

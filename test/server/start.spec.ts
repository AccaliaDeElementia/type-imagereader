'use sanity'

import Sinon from 'sinon'
import { cast } from '#testutils/typeGuards.js'
import { start, Internals, setClacksOverhead } from '#server.js'
import type { Express } from 'express'
import type { Server as HttpServer } from 'node:http'
import type { Server as WebSocketServer } from 'socket.io'

const sandbox = Sinon.createSandbox()

describe('Server start', () => {
  let appStub = { use: sandbox.stub() }
  let appFake = cast<Express>(appStub)
  let serverFake = cast<HttpServer>({})
  let socketsFake = cast<WebSocketServer>({})
  let createAppStub = sandbox.stub()
  let configureBaseAppStub = sandbox.stub()
  let configureLoggingStub = sandbox.stub()
  let configureErrorHandlerStub = sandbox.stub()
  let registerRoutersStub = sandbox.stub()
  let registerViewsStub = sandbox.stub()
  let listenOnPortStub = sandbox.stub()
  beforeEach(() => {
    appStub = { use: sandbox.stub() }
    appFake = cast<Express>(appStub)
    serverFake = cast<HttpServer>({})
    socketsFake = cast<WebSocketServer>({})
    createAppStub = sandbox.stub(Internals, 'createApp').returns([appFake, serverFake, socketsFake])
    configureBaseAppStub = sandbox.stub(Internals, 'configureBaseApp')
    configureLoggingStub = sandbox.stub(Internals, 'configureLogging')
    configureErrorHandlerStub = sandbox.stub(Internals, 'configureErrorHandler')
    registerRoutersStub = sandbox.stub(Internals, 'registerRouters').resolves()
    registerViewsStub = sandbox.stub(Internals, 'registerViewsAndMiddleware')
    listenOnPortStub = sandbox.stub(Internals, 'listenOnPort')
  })
  afterEach(() => {
    sandbox.restore()
  })
  const baseTests: Array<[string, () => void]> = [
    [
      'create app',
      () => {
        expect(createAppStub.callCount).toBe(1)
      },
    ],
    [
      'create app with no arguments',
      () => {
        expect(createAppStub.firstCall.args).toHaveLength(0)
      },
    ],
    [
      'configure base app',
      () => {
        expect(configureBaseAppStub.callCount).toBe(1)
      },
    ],
    [
      'configure base app with correct args',
      () => {
        expect(configureBaseAppStub.firstCall.args).toHaveLength(1)
      },
    ],
    [
      'configure base app with app',
      () => {
        expect(configureBaseAppStub.firstCall.args[0]).toBe(appFake)
      },
    ],
    [
      'configure logging',
      () => {
        expect(configureLoggingStub.callCount).toBe(1)
      },
    ],
    [
      'configure logging with correct args',
      () => {
        expect(configureLoggingStub.firstCall.args).toHaveLength(1)
      },
    ],
    [
      'configure logging with app',
      () => {
        expect(configureLoggingStub.firstCall.args[0]).toBe(appFake)
      },
    ],
    [
      'register routers',
      () => {
        expect(registerRoutersStub.callCount).toBe(1)
      },
    ],
    [
      'register routers with correct args',
      () => {
        expect(registerRoutersStub.firstCall.args).toHaveLength(3)
      },
    ],
    [
      'register routers with app',
      () => {
        expect(registerRoutersStub.firstCall.args[0]).toBe(appFake)
      },
    ],
    [
      'register routers with http server',
      () => {
        expect(registerRoutersStub.firstCall.args[1]).toBe(serverFake)
      },
    ],
    [
      'register routers with websockets',
      () => {
        expect(registerRoutersStub.firstCall.args[2]).toBe(socketsFake)
      },
    ],
    [
      'configure error handler',
      () => {
        expect(configureErrorHandlerStub.callCount).toBe(1)
      },
    ],
    [
      'configure error handler with correct args',
      () => {
        expect(configureErrorHandlerStub.firstCall.args).toHaveLength(1)
      },
    ],
    [
      'configure error handler with app',
      () => {
        expect(configureErrorHandlerStub.firstCall.args[0]).toBe(appFake)
      },
    ],
    [
      'register views',
      () => {
        expect(registerViewsStub.callCount).toBe(1)
      },
    ],
    [
      'register views with correct args',
      () => {
        expect(registerViewsStub.firstCall.args).toHaveLength(1)
      },
    ],
    [
      'register views with app',
      () => {
        expect(registerViewsStub.firstCall.args[0]).toBe(appFake)
      },
    ],
    [
      'listen on port',
      () => {
        expect(listenOnPortStub.callCount).toBe(1)
      },
    ],
    [
      'listen on port with the http server',
      () => {
        expect(listenOnPortStub.firstCall.args[0]).toBe(serverFake)
      },
    ],
    [
      'listen on port with the provided port',
      () => {
        expect(listenOnPortStub.firstCall.args[1]).toBe(65535)
      },
    ],
  ]
  baseTests.forEach(([title, validationFn]) => {
    it(`should ${title}`, async () => {
      await start(65535)
      validationFn()
    })
  })
  it('should configure base app before configuring logging', async () => {
    await start(65535)
    expect(configureBaseAppStub.calledBefore(configureLoggingStub)).toBe(true)
  })
  it('should configure logging before registering routers so helmet/morgan apply to handled responses', async () => {
    await start(65535)
    expect(configureLoggingStub.calledBefore(registerRoutersStub)).toBe(true)
  })
  it('should register the X-Clacks-Overhead middleware before registering routers', async () => {
    await start(65535)
    const clacksRegistration = appStub.use.getCalls().find((c) => c.args[0] === setClacksOverhead)
    expect(clacksRegistration?.calledBefore(registerRoutersStub.firstCall)).toBe(true)
  })
  it('should register views before registering routers so view engine is set before any router can handle a request', async () => {
    await start(65535)
    expect(registerViewsStub.calledBefore(registerRoutersStub)).toBe(true)
  })
  it('should configure error handler after registering routers so it catches errors thrown from them', async () => {
    await start(65535)
    expect(configureErrorHandlerStub.calledAfter(registerRoutersStub)).toBe(true)
  })
  it('should listen on port only after all setup is complete', async () => {
    await start(65535)
    expect(listenOnPortStub.calledAfter(configureErrorHandlerStub)).toBe(true)
  })
  it('should register the X-Clacks-Overhead middleware via app.use', async () => {
    await start(65535)
    const clacksRegistration = appStub.use.getCalls().find((c) => c.args[0] === setClacksOverhead)
    expect(clacksRegistration).not.toBe(undefined)
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

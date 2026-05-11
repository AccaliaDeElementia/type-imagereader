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

  describe('when start(65535) succeeds', () => {
    beforeEach(async () => {
      await start(65535)
    })

    describe('createApp', () => {
      it('should be called once', () => {
        expect(createAppStub.callCount).toBe(1)
      })
      it('should be called with no arguments', () => {
        expect(createAppStub.firstCall.args).toHaveLength(0)
      })
    })

    describe('configureBaseApp', () => {
      it('should be called once', () => {
        expect(configureBaseAppStub.callCount).toBe(1)
      })
      it('should be called with one argument', () => {
        expect(configureBaseAppStub.firstCall.args).toHaveLength(1)
      })
      it('should be called with the app', () => {
        expect(configureBaseAppStub.firstCall.args[0]).toBe(appFake)
      })
    })

    describe('configureLogging', () => {
      it('should be called once', () => {
        expect(configureLoggingStub.callCount).toBe(1)
      })
      it('should be called with one argument', () => {
        expect(configureLoggingStub.firstCall.args).toHaveLength(1)
      })
      it('should be called with the app', () => {
        expect(configureLoggingStub.firstCall.args[0]).toBe(appFake)
      })
    })

    describe('registerRouters', () => {
      it('should be called once', () => {
        expect(registerRoutersStub.callCount).toBe(1)
      })
      it('should be called with three arguments', () => {
        expect(registerRoutersStub.firstCall.args).toHaveLength(3)
      })
      it('should be called with the app', () => {
        expect(registerRoutersStub.firstCall.args[0]).toBe(appFake)
      })
      it('should be called with the http server', () => {
        expect(registerRoutersStub.firstCall.args[1]).toBe(serverFake)
      })
      it('should be called with the websockets server', () => {
        expect(registerRoutersStub.firstCall.args[2]).toBe(socketsFake)
      })
    })

    describe('configureErrorHandler', () => {
      it('should be called once', () => {
        expect(configureErrorHandlerStub.callCount).toBe(1)
      })
      it('should be called with one argument', () => {
        expect(configureErrorHandlerStub.firstCall.args).toHaveLength(1)
      })
      it('should be called with the app', () => {
        expect(configureErrorHandlerStub.firstCall.args[0]).toBe(appFake)
      })
    })

    describe('registerViewsAndMiddleware', () => {
      it('should be called once', () => {
        expect(registerViewsStub.callCount).toBe(1)
      })
      it('should be called with one argument', () => {
        expect(registerViewsStub.firstCall.args).toHaveLength(1)
      })
      it('should be called with the app', () => {
        expect(registerViewsStub.firstCall.args[0]).toBe(appFake)
      })
    })

    describe('listenOnPort', () => {
      it('should be called once', () => {
        expect(listenOnPortStub.callCount).toBe(1)
      })
      it('should be called with the http server', () => {
        expect(listenOnPortStub.firstCall.args[0]).toBe(serverFake)
      })
      it('should be called with the provided port', () => {
        expect(listenOnPortStub.firstCall.args[1]).toBe(65535)
      })
    })

    describe('X-Clacks-Overhead middleware', () => {
      it('should be registered via app.use', () => {
        const clacksRegistration = appStub.use.getCalls().find((c) => c.args[0] === setClacksOverhead)
        expect(clacksRegistration).not.toBe(undefined)
      })
    })

    describe('call ordering', () => {
      it('should configure base app before configuring logging', () => {
        expect(configureBaseAppStub.calledBefore(configureLoggingStub)).toBe(true)
      })
      it('should configure logging before registering routers so helmet/morgan apply to handled responses', () => {
        expect(configureLoggingStub.calledBefore(registerRoutersStub)).toBe(true)
      })
      it('should register the X-Clacks-Overhead middleware before registering routers', () => {
        const clacksRegistration = appStub.use.getCalls().find((c) => c.args[0] === setClacksOverhead)
        expect(clacksRegistration?.calledBefore(registerRoutersStub.firstCall)).toBe(true)
      })
      it('should register views before registering routers so view engine is set before any router can handle a request', () => {
        expect(registerViewsStub.calledBefore(registerRoutersStub)).toBe(true)
      })
      it('should configure error handler after registering routers so it catches errors thrown from them', () => {
        expect(configureErrorHandlerStub.calledAfter(registerRoutersStub)).toBe(true)
      })
      it('should listen on port only after all setup is complete', () => {
        expect(listenOnPortStub.calledAfter(configureErrorHandlerStub)).toBe(true)
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

'use sanity'

import { expect } from 'chai'
import Sinon from 'sinon'
import { Cast } from '#testutils/TypeGuards.js'
import start, { Functions } from '#Server.js'
import type { Express } from 'express'
import type { Server as HttpServer } from 'node:http'
import type { Server as WebSocketServer } from 'socket.io'

const sandbox = Sinon.createSandbox()

describe('Server function start', () => {
  let appStub = { use: sandbox.stub() }
  let appFake = Cast<Express>(appStub)
  let serverFake = Cast<HttpServer>({})
  let socketsFake = Cast<WebSocketServer>({})
  let createAppStub = sandbox.stub()
  let configureBaseAppStub = sandbox.stub()
  let configureLoggingStub = sandbox.stub()
  let configureErrorHandlerStub = sandbox.stub()
  let registerRoutersStub = sandbox.stub()
  let registerViewsStub = sandbox.stub()
  let listenOnPortStub = sandbox.stub()
  beforeEach(() => {
    appStub = { use: sandbox.stub() }
    appFake = Cast<Express>(appStub)
    serverFake = Cast<HttpServer>({})
    socketsFake = Cast<WebSocketServer>({})
    createAppStub = sandbox.stub(Functions, 'CreateApp').returns([appFake, serverFake, socketsFake])
    configureBaseAppStub = sandbox.stub(Functions, 'ConfigureBaseApp')
    configureLoggingStub = sandbox.stub(Functions, 'ConfigureLogging')
    configureErrorHandlerStub = sandbox.stub(Functions, 'ConfigureErrorHandler')
    registerRoutersStub = sandbox.stub(Functions, 'RegisterRouters').resolves()
    registerViewsStub = sandbox.stub(Functions, 'RegisterViewsAndMiddleware')
    listenOnPortStub = sandbox.stub(Functions, 'ListenOnPort')
  })
  afterEach(() => {
    sandbox.restore()
  })
  const baseTests: Array<[string, () => void]> = [
    ['create app', () => expect(createAppStub.callCount).to.equal(1)],
    ['create app with no arguments', () => expect(createAppStub.firstCall.args).to.have.lengthOf(0)],
    ['configure base app', () => expect(configureBaseAppStub.callCount).to.equal(1)],
    ['configure base app with correct args', () => expect(configureBaseAppStub.firstCall.args).to.have.lengthOf(1)],
    ['configure base app with app', () => expect(configureBaseAppStub.firstCall.args[0]).to.equal(appFake)],
    ['configure logging', () => expect(configureLoggingStub.callCount).to.equal(1)],
    ['configure logging with correct args', () => expect(configureLoggingStub.firstCall.args).to.have.lengthOf(1)],
    ['configure logging with app', () => expect(configureLoggingStub.firstCall.args[0]).to.equal(appFake)],
    ['register routers', () => expect(registerRoutersStub.callCount).to.equal(1)],
    ['register routers with correct args', () => expect(registerRoutersStub.firstCall.args).to.have.lengthOf(3)],
    ['register routers with app', () => expect(registerRoutersStub.firstCall.args[0]).to.equal(appFake)],
    ['register routers with http server', () => expect(registerRoutersStub.firstCall.args[1]).to.equal(serverFake)],
    ['register routers with websockets', () => expect(registerRoutersStub.firstCall.args[2]).to.equal(socketsFake)],
    ['configure error handler', () => expect(configureErrorHandlerStub.callCount).to.equal(1)],
    [
      'configure error handler with correct args',
      () => expect(configureErrorHandlerStub.firstCall.args).to.have.lengthOf(1),
    ],
    ['configure error handler with app', () => expect(configureErrorHandlerStub.firstCall.args[0]).to.equal(appFake)],
    ['register views', () => expect(registerViewsStub.callCount).to.equal(1)],
    ['register views with correct args', () => expect(registerViewsStub.firstCall.args).to.have.lengthOf(1)],
    ['register views with app', () => expect(registerViewsStub.firstCall.args[0]).to.equal(appFake)],
    ['listen on port', () => expect(listenOnPortStub.callCount).to.equal(1)],
    ['listen on port with the http server', () => expect(listenOnPortStub.firstCall.args[0]).to.equal(serverFake)],
    ['listen on port with the provided port', () => expect(listenOnPortStub.firstCall.args[1]).to.equal(65535)],
  ]
  baseTests.forEach(([title, validationFn]) => {
    it(`should ${title}`, async () => {
      await start(65535)
      validationFn()
    })
  })
  it('should configure base app before configuring logging', async () => {
    await start(65535)
    expect(configureBaseAppStub.calledBefore(configureLoggingStub)).to.equal(true)
  })
  it('should configure logging before registering routers so helmet/morgan apply to handled responses', async () => {
    await start(65535)
    expect(configureLoggingStub.calledBefore(registerRoutersStub)).to.equal(true)
  })
  it('should register the X-Clacks-Overhead middleware before registering routers', async () => {
    await start(65535)
    const clacksRegistration = appStub.use.getCalls().find((c) => c.args[0] === Functions.SetClacksOverhead)
    expect(clacksRegistration?.calledBefore(registerRoutersStub.firstCall)).to.equal(true)
  })
  it('should register views before registering routers so view engine is set before any router can handle a request', async () => {
    await start(65535)
    expect(registerViewsStub.calledBefore(registerRoutersStub)).to.equal(true)
  })
  it('should configure error handler after registering routers so it catches errors thrown from them', async () => {
    await start(65535)
    expect(configureErrorHandlerStub.calledAfter(registerRoutersStub)).to.equal(true)
  })
  it('should listen on port only after all setup is complete', async () => {
    await start(65535)
    expect(listenOnPortStub.calledAfter(configureErrorHandlerStub)).to.equal(true)
  })
  it('should register the X-Clacks-Overhead middleware via app.use', async () => {
    await start(65535)
    const clacksRegistration = appStub.use.getCalls().find((c) => c.args[0] === Functions.SetClacksOverhead)
    expect(clacksRegistration).to.not.equal(undefined)
  })
  it('should return app', async () => {
    const { app } = await start(1024)
    expect(app).to.equal(appFake)
  })
  it('should return server', async () => {
    const { server } = await start(2048)
    expect(server).to.equal(serverFake)
  })
})

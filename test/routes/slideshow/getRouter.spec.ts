'use sanity'

import Sinon from 'sinon'
import type { Request, Response, Application, Router } from 'express'
import type { Socket, Server as WebSocketServer } from 'socket.io'
import type { Server } from 'node:http'
import { Cast, StubToKnex } from '../../testutils/TypeGuards'
import { assert, expect } from 'chai'
import { Config, Functions, getRouter, Imports } from '../../../routes/slideshow'
import persistance from '../../../utils/persistance'

describe('routes/slideshow function getRouter', () => {
  let routerStub = { get: Sinon.stub() }
  let createRouterStub = Sinon.stub()
  let knexFake = StubToKnex({})
  let initializeStub = Sinon.stub().resolves(knexFake)
  let rootRouteStub = Sinon.stub()
  let handleSocketStub = Sinon.stub()
  let setIntervalStub = Sinon.stub()
  let tickCountdownStub = Sinon.stub()
  let applicationFake = Cast<Application>({})
  let serverFake = Cast<Server>({})
  let ioStub = {
    on: Sinon.stub(),
  }
  let socketsFake = Cast<WebSocketServer>(ioStub)
  let clockFake: Sinon.SinonFakeTimers | null = null
  let requestFake = Cast<Request>({})
  let responseStub = { json: Sinon.stub() }
  let responseFake = Cast<Response>(responseStub)
  beforeEach(() => {
    clockFake = Sinon.useFakeTimers({ now: 3141592 })
    routerStub = { get: Sinon.stub() }
    createRouterStub = Sinon.stub(Imports, 'Router').returns(Cast<Router>(routerStub))
    knexFake = StubToKnex({})
    initializeStub = Sinon.stub(persistance, 'initialize').resolves(knexFake)
    rootRouteStub = Sinon.stub(Functions, 'RootRoute').resolves()
    handleSocketStub = Sinon.stub(Functions, 'HandleSocket')
    setIntervalStub = Sinon.stub(global, 'setInterval')
    tickCountdownStub = Sinon.stub(Functions, 'TickCountdown').resolves()
    applicationFake = Cast<Application>({})
    serverFake = Cast<Server>({})
    ioStub = {
      on: Sinon.stub(),
    }
    socketsFake = Cast<WebSocketServer>(ioStub)
    Config.launchId = -1
    requestFake = Cast<Request>({})
    responseStub = { json: Sinon.stub() }
    responseFake = Cast<Response>(responseStub)
  })
  afterEach(() => {
    clockFake?.restore()
    tickCountdownStub.restore()
    setIntervalStub.restore()
    handleSocketStub.restore()
    rootRouteStub.restore()
    initializeStub.restore()
    createRouterStub.restore()
  })
  const routes = ['/launchId', '/', '/*']
  it('should set launch Id to current time', async () => {
    await getRouter(applicationFake, serverFake, socketsFake)
    expect(Config.launchId).to.equal(3141592)
  })
  it('should register correct route count', async () => {
    await getRouter(applicationFake, serverFake, socketsFake)
    expect(routerStub.get.callCount).to.equal(routes.length)
  })
  routes.forEach((route) => {
    it(`should register get handler for route '${route}`, async () => {
      await getRouter(applicationFake, serverFake, socketsFake)
      expect(routerStub.get.calledWith(route)).to.equal(true)
    })
  })
  const getArgs = (stub: Sinon.SinonStub): unknown[] => stub.firstCall.args
  const routeTests: Array<[string, string, () => void]> = [
    ['respond with json', '/launchId', () => expect(responseStub.json.callCount).to.equal(1)],
    ['respond with obj', '/launchId', () => expect(getArgs(responseStub.json)[0]).to.be.an.instanceOf(Object)],
    ['respond with keys', '/launchId', () => expect(getArgs(responseStub.json)[0]).to.have.all.keys('launchId')],
    ['send launchId', '/launchId', () => expect(getArgs(responseStub.json)[0]).to.deep.equal({ launchId: 3141592 })],
    ['call RootRoute', '/', () => expect(rootRouteStub.callCount).to.equal(1)],
    ['call RootRoute with knex', '/', () => expect(getArgs(rootRouteStub)[0]).to.equal(knexFake)],
    ['call RootRoute with knex', '/', () => expect(getArgs(rootRouteStub)[1]).to.equal(requestFake)],
    ['call RootRoute with knex', '/', () => expect(getArgs(rootRouteStub)[2]).to.equal(responseFake)],
    ['call RootRoute with knex', '/*', () => expect(getArgs(rootRouteStub)[0]).to.equal(knexFake)],
    ['call RootRoute with knex', '/*', () => expect(getArgs(rootRouteStub)[1]).to.equal(requestFake)],
    ['call RootRoute with knex', '/*', () => expect(getArgs(rootRouteStub)[2]).to.equal(responseFake)],
  ]
  routeTests.forEach(([title, path, validationFn]) => {
    it(`should ${title} for ${path}`, async () => {
      await getRouter(applicationFake, serverFake, socketsFake)
      const fn = Cast<(req: Request, res: Response) => void>(
        routerStub.get.getCalls().find((call) => call.args[0] === path)?.args[1],
      )
      fn(requestFake, responseFake)
      validationFn()
    })
  })
  it('should listen to socketIo events', async () => {
    await getRouter(applicationFake, serverFake, socketsFake)
    expect(ioStub.on.callCount).to.equal(1)
  })
  it('should listen to new websocket connections', async () => {
    await getRouter(applicationFake, serverFake, socketsFake)
    expect(ioStub.on.firstCall.args[0]).to.equal('connection')
  })
  it('should handle socket on new connection', async () => {
    await getRouter(applicationFake, serverFake, socketsFake)
    const socket = Cast<Socket>({})
    Cast<(socket: Socket) => void>(ioStub.on.firstCall.args[1])(socket)
    expect(handleSocketStub.callCount).to.equal(1)
  })
  it('should handle socket with knex', async () => {
    await getRouter(applicationFake, serverFake, socketsFake)
    const socket = Cast<Socket>({})
    Cast<(socket: Socket) => void>(ioStub.on.firstCall.args[1])(socket)
    expect(handleSocketStub.firstCall.args[0]).to.equal(knexFake)
  })
  it('should handle socket with socket.io server', async () => {
    await getRouter(applicationFake, serverFake, socketsFake)
    const socket = Cast<Socket>({})
    Cast<(socket: Socket) => void>(ioStub.on.firstCall.args[1])(socket)
    expect(handleSocketStub.firstCall.args[1]).to.equal(socketsFake)
  })
  it('should handle socket with socket', async () => {
    await getRouter(applicationFake, serverFake, socketsFake)
    const socket = Cast<Socket>({})
    Cast<(socket: Socket) => void>(ioStub.on.firstCall.args[1])(socket)
    expect(handleSocketStub.firstCall.args[2]).to.equal(socket)
  })
  it('should set interval for periodic processing', async () => {
    await getRouter(applicationFake, serverFake, socketsFake)
    expect(setIntervalStub.callCount).to.equal(1)
  })
  it('should set interval function for periodic processing', async () => {
    await getRouter(applicationFake, serverFake, socketsFake)
    const callback = setIntervalStub.firstCall.args[0] as unknown
    assert.isFunction(callback)
  })
  it('should process TickCountdown in set interval function', async () => {
    await getRouter(applicationFake, serverFake, socketsFake)
    const callback = Cast<() => Promise<void>>(setIntervalStub.firstCall.args[0])
    await callback()
    expect(tickCountdownStub.callCount).to.equal(1)
  })
  it('should process TickCountdown with knex in set interval function', async () => {
    await getRouter(applicationFake, serverFake, socketsFake)
    const callback = Cast<() => Promise<void>>(setIntervalStub.firstCall.args[0])
    await callback()
    expect(tickCountdownStub.firstCall.args[0]).to.equal(knexFake)
  })
  it('should process TickCountdown with websocket server in set interval function', async () => {
    await getRouter(applicationFake, serverFake, socketsFake)
    const callback = Cast<() => void>(setIntervalStub.firstCall.args[0])
    callback()
    expect(tickCountdownStub.firstCall.args[1]).to.equal(socketsFake)
  })
  it('should set interval of expected length for periodic processing', async () => {
    await getRouter(applicationFake, serverFake, socketsFake)
    expect(setIntervalStub.firstCall.args[1]).to.equal(1000)
  })
})

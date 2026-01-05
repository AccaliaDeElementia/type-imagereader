'use sanity'

import { assert, expect } from 'chai'
import { Functions, getRouter, Imports } from '../../../routes/weather'
import Sinon from 'sinon'

import type { Application, Router, Response } from 'express'
import type { Server as WebSocketServer } from 'socket.io'
import type { Server } from 'node:http'
import { Cast } from '../../testutils/TypeGuards'

describe('routes/weather function getRouter()', () => {
  let setIntervalStub = Sinon.stub()
  let updateWeatherStub = Sinon.stub()
  let routerStub = {
    get: Sinon.stub(),
  }
  let getRouterStub = Sinon.stub().returns(Cast<Router>(routerStub))
  let applicationFake = Cast<Application>({})
  let serverFake = Cast<Server>({})
  let socketFake = Cast<WebSocketServer>({})
  let responseStub = {
    status: Sinon.stub().returnsThis(),
    json: Sinon.stub().returnsThis(),
  }
  let responseFake = Cast<Response>(responseStub)
  beforeEach(() => {
    setIntervalStub = Sinon.stub(global, 'setInterval')
    updateWeatherStub = Sinon.stub(Functions, 'UpdateWeather').resolves()
    routerStub = {
      get: Sinon.stub(),
    }
    applicationFake = Cast<Application>({})
    serverFake = Cast<Server>({})
    socketFake = Cast<WebSocketServer>({})
    getRouterStub = Sinon.stub(Imports, 'Router').returns(Cast<Router>(routerStub))
    responseStub = {
      status: Sinon.stub().returnsThis(),
      json: Sinon.stub().returnsThis(),
    }
    responseFake = Cast<Response>(responseStub)
  })
  afterEach(() => {
    getRouterStub.restore()
    updateWeatherStub.restore()
    setIntervalStub.restore()
  })
  it('should create Router', async () => {
    await getRouter(applicationFake, serverFake, socketFake)
    expect(getRouterStub.callCount).to.equal(1)
  })
  it('should return Router', async () => {
    const result = await getRouter(applicationFake, serverFake, socketFake)
    expect(result).to.equal(routerStub)
  })
  it('should register correct endpoint count', async () => {
    await getRouter(applicationFake, serverFake, socketFake)
    expect(routerStub.get.callCount).to.equal(1)
  })
  it('should register root route', async () => {
    await getRouter(applicationFake, serverFake, socketFake)
    expect(routerStub.get.firstCall.args[0]).to.equal('/')
  })
  it('should register interval', async () => {
    await getRouter(applicationFake, serverFake, socketFake)
    expect(setIntervalStub.callCount).to.equal(1)
  })
  it('should register callback for interval', async () => {
    await getRouter(applicationFake, serverFake, socketFake)
    assert.isFunction(setIntervalStub.firstCall.args[0])
  })
  it('should call UpdateWearther when callback fires', async () => {
    await getRouter(applicationFake, serverFake, socketFake)
    const fn = Cast<() => void>(setIntervalStub.firstCall.args[0])
    updateWeatherStub.resetHistory()
    fn()
    expect(updateWeatherStub.callCount).to.equal(1)
  })
  it('should register interval of expected length', async () => {
    await getRouter(applicationFake, serverFake, socketFake)
    expect(setIntervalStub.firstCall.args[1]).to.equal(600000)
  })
  it('should call UpdateWearther when creating router', async () => {
    await getRouter(applicationFake, serverFake, socketFake)
    expect(updateWeatherStub.callCount).to.equal(1)
  })
  const successTests: Array<[string, () => void]> = [
    ['set status', () => expect(responseStub.status.callCount).to.equal(1)],
    ['set HTTP OK status', () => expect(responseStub.status.firstCall.args[0]).to.equal(200)],
    ['send json', () => expect(responseStub.json.callCount).to.equal(1)],
    ['send weather data', () => expect(responseStub.json.firstCall.args[0]).to.equal(Functions.weather)],
  ]
  successTests.forEach(([title, validationFn]) => {
    it(`should ${title} on success`, async () => {
      await getRouter(applicationFake, serverFake, socketFake)
      const fn = Cast<(_: unknown, res: Response) => Promise<void>>(routerStub.get.firstCall.args[1])
      await fn(null, responseFake)
      validationFn()
    })
  })
})

'use sanity'

import { assert, expect } from 'chai'
import { Functions, getRouter, Imports } from '#routes/weather'
import Sinon from 'sinon'

import type { Application, Router, Response } from 'express'
import type { Server as WebSocketServer } from 'socket.io'
import type { Server } from 'node:http'
import { Cast } from '#testutils/TypeGuards'
import { createResponseFake } from '#testutils/Express'

const sandbox = Sinon.createSandbox()

describe('routes/weather function getRouter()', () => {
  let setIntervalStub = sandbox.stub()
  let updateWeatherStub = sandbox.stub()
  let routerStub = {
    get: sandbox.stub(),
  }
  let getRouterStub = sandbox.stub().returns(Cast<Router>(routerStub))
  let applicationFake = Cast<Application>({})
  let serverFake = Cast<Server>({})
  let socketFake = Cast<WebSocketServer>({})
  let { stub: responseStub, fake: responseFake } = createResponseFake()
  beforeEach(() => {
    process.env.OPENWEATHER_APPID = 'test-appid'
    process.env.OPENWEATHER_LOCATION = 'test-location'
    setIntervalStub = sandbox.stub(global, 'setInterval')
    updateWeatherStub = sandbox.stub(Functions, 'UpdateWeather').resolves()
    routerStub = {
      get: sandbox.stub(),
    }
    applicationFake = Cast<Application>({})
    serverFake = Cast<Server>({})
    socketFake = Cast<WebSocketServer>({})
    getRouterStub = sandbox.stub(Imports, 'Router').returns(Cast<Router>(routerStub))
    ;({ stub: responseStub, fake: responseFake } = createResponseFake())
  })
  afterEach(() => {
    sandbox.restore()
    delete process.env.OPENWEATHER_APPID
    delete process.env.OPENWEATHER_LOCATION
  })
  it('should create Router', async () => {
    await getRouter(applicationFake, serverFake, socketFake)
    expect(getRouterStub.callCount).to.equal(1)
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
  it('should call UpdateWeather when callback fires', async () => {
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
  it('should call UpdateWeather when creating router', async () => {
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

  describe('with missing weather config', () => {
    let loggerStub = sandbox.stub()
    beforeEach(() => {
      loggerStub = sandbox.stub(Imports, 'logger')
    })

    it('should not register interval when OPENWEATHER_APPID is missing', async () => {
      delete process.env.OPENWEATHER_APPID
      await getRouter(applicationFake, serverFake, socketFake)
      expect(setIntervalStub.callCount).to.equal(0)
    })

    it('should not call UpdateWeather when OPENWEATHER_APPID is missing', async () => {
      delete process.env.OPENWEATHER_APPID
      await getRouter(applicationFake, serverFake, socketFake)
      expect(updateWeatherStub.callCount).to.equal(0)
    })

    it('should still register the root route when OPENWEATHER_APPID is missing', async () => {
      delete process.env.OPENWEATHER_APPID
      await getRouter(applicationFake, serverFake, socketFake)
      expect(routerStub.get.firstCall.args[0]).to.equal('/')
    })

    it('should log once when OPENWEATHER_APPID is missing', async () => {
      delete process.env.OPENWEATHER_APPID
      await getRouter(applicationFake, serverFake, socketFake)
      expect(loggerStub.callCount).to.equal(1)
    })

    it('should log without an Error instance when OPENWEATHER_APPID is missing', async () => {
      delete process.env.OPENWEATHER_APPID
      await getRouter(applicationFake, serverFake, socketFake)
      const hasErrorArg = loggerStub.firstCall.args.some((a: unknown) => a instanceof Error)
      expect(hasErrorArg).to.equal(false)
    })

    it('should name the missing OPENWEATHER_APPID env var in the log', async () => {
      delete process.env.OPENWEATHER_APPID
      await getRouter(applicationFake, serverFake, socketFake)
      const joined = loggerStub.firstCall.args.map((a: unknown) => String(a)).join(' ')
      expect(joined).to.contain('OPENWEATHER_APPID')
    })

    it('should not register interval when OPENWEATHER_LOCATION is missing', async () => {
      delete process.env.OPENWEATHER_LOCATION
      await getRouter(applicationFake, serverFake, socketFake)
      expect(setIntervalStub.callCount).to.equal(0)
    })

    it('should not call UpdateWeather when OPENWEATHER_LOCATION is missing', async () => {
      delete process.env.OPENWEATHER_LOCATION
      await getRouter(applicationFake, serverFake, socketFake)
      expect(updateWeatherStub.callCount).to.equal(0)
    })

    it('should name the missing OPENWEATHER_LOCATION env var in the log', async () => {
      delete process.env.OPENWEATHER_LOCATION
      await getRouter(applicationFake, serverFake, socketFake)
      const joined = loggerStub.firstCall.args.map((a: unknown) => String(a)).join(' ')
      expect(joined).to.contain('OPENWEATHER_LOCATION')
    })

    it('should not register interval when OPENWEATHER_APPID is blank', async () => {
      process.env.OPENWEATHER_APPID = ''
      await getRouter(applicationFake, serverFake, socketFake)
      expect(setIntervalStub.callCount).to.equal(0)
    })

    it('should not register interval when OPENWEATHER_LOCATION is blank', async () => {
      process.env.OPENWEATHER_LOCATION = ''
      await getRouter(applicationFake, serverFake, socketFake)
      expect(setIntervalStub.callCount).to.equal(0)
    })
  })
})

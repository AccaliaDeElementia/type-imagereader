'use sanity'

import { assert } from 'chai'
import { Internals, Weather, getRouter, Imports } from '#routes/weather.js'
import Sinon from 'sinon'

import type { Application, Router, Response } from 'express'
import type { Server as WebSocketServer } from 'socket.io'
import type { Server } from 'node:http'
import { cast } from '#testutils/typeGuards.js'
import { createResponseFake } from '#testutils/express.js'

const sandbox = Sinon.createSandbox()

describe('routes/weather getRouter()', () => {
  let setIntervalStub = sandbox.stub()
  let updateWeatherStub = sandbox.stub()
  let routerStub = {
    get: sandbox.stub(),
  }
  let getRouterStub = sandbox.stub().returns(cast<Router>(routerStub))
  let applicationFake = cast<Application>({})
  let serverFake = cast<Server>({})
  let socketFake = cast<WebSocketServer>({})
  let { stub: responseStub, fake: responseFake } = createResponseFake()
  beforeEach(() => {
    process.env.OPENWEATHER_APPID = 'test-appid'
    process.env.OPENWEATHER_LOCATION = 'test-location'
    setIntervalStub = sandbox.stub(global, 'setInterval')
    updateWeatherStub = sandbox.stub(Internals, 'updateWeather').resolves()
    routerStub = {
      get: sandbox.stub(),
    }
    applicationFake = cast<Application>({})
    serverFake = cast<Server>({})
    socketFake = cast<WebSocketServer>({})
    getRouterStub = sandbox.stub(Imports, 'Router').returns(cast<Router>(routerStub))
    ;({ stub: responseStub, fake: responseFake } = createResponseFake())
  })
  afterEach(() => {
    sandbox.restore()
    delete process.env.OPENWEATHER_APPID
    delete process.env.OPENWEATHER_LOCATION
  })
  it('should create Router', async () => {
    await getRouter(applicationFake, serverFake, socketFake)
    expect(getRouterStub.callCount).toBe(1)
  })
  it('should register correct endpoint count', async () => {
    await getRouter(applicationFake, serverFake, socketFake)
    expect(routerStub.get.callCount).toBe(1)
  })
  it('should register root route', async () => {
    await getRouter(applicationFake, serverFake, socketFake)
    expect(routerStub.get.firstCall.args[0]).toBe('/')
  })
  it('should register interval', async () => {
    await getRouter(applicationFake, serverFake, socketFake)
    expect(setIntervalStub.callCount).toBe(1)
  })
  it('should register callback for interval', async () => {
    await getRouter(applicationFake, serverFake, socketFake)
    assert.isFunction(setIntervalStub.firstCall.args[0])
  })
  it('should call updateWeather when callback fires', async () => {
    await getRouter(applicationFake, serverFake, socketFake)
    const fn = cast<() => void>(setIntervalStub.firstCall.args[0])
    updateWeatherStub.resetHistory()
    fn()
    expect(updateWeatherStub.callCount).toBe(1)
  })
  it('should register interval of expected length', async () => {
    await getRouter(applicationFake, serverFake, socketFake)
    expect(setIntervalStub.firstCall.args[1]).toBe(600000)
  })
  it('should call updateWeather when creating router', async () => {
    await getRouter(applicationFake, serverFake, socketFake)
    expect(updateWeatherStub.callCount).toBe(1)
  })
  const successTests: Array<[string, () => void]> = [
    [
      'set status',
      () => {
        expect(responseStub.status.callCount).toBe(1)
      },
    ],
    [
      'set HTTP OK status',
      () => {
        expect(responseStub.status.firstCall.args[0]).toBe(200)
      },
    ],
    [
      'send json',
      () => {
        expect(responseStub.json.callCount).toBe(1)
      },
    ],
    [
      'send weather data',
      () => {
        expect(responseStub.json.firstCall.args[0]).toBe(Weather)
      },
    ],
  ]
  successTests.forEach(([title, validationFn]) => {
    it(`should ${title} on success`, async () => {
      await getRouter(applicationFake, serverFake, socketFake)
      const fn = cast<(_: unknown, res: Response) => Promise<void>>(routerStub.get.firstCall.args[1])
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
      expect(setIntervalStub.callCount).toBe(0)
    })

    it('should not call updateWeather when OPENWEATHER_APPID is missing', async () => {
      delete process.env.OPENWEATHER_APPID
      await getRouter(applicationFake, serverFake, socketFake)
      expect(updateWeatherStub.callCount).toBe(0)
    })

    it('should still register the root route when OPENWEATHER_APPID is missing', async () => {
      delete process.env.OPENWEATHER_APPID
      await getRouter(applicationFake, serverFake, socketFake)
      expect(routerStub.get.firstCall.args[0]).toBe('/')
    })

    it('should log once when OPENWEATHER_APPID is missing', async () => {
      delete process.env.OPENWEATHER_APPID
      await getRouter(applicationFake, serverFake, socketFake)
      expect(loggerStub.callCount).toBe(1)
    })

    it('should log without an Error instance when OPENWEATHER_APPID is missing', async () => {
      delete process.env.OPENWEATHER_APPID
      await getRouter(applicationFake, serverFake, socketFake)
      const hasErrorArg = loggerStub.firstCall.args.some((a: unknown) => a instanceof Error)
      expect(hasErrorArg).toBe(false)
    })

    it('should name the missing OPENWEATHER_APPID env var in the log', async () => {
      delete process.env.OPENWEATHER_APPID
      await getRouter(applicationFake, serverFake, socketFake)
      const joined = loggerStub.firstCall.args.map((a: unknown) => String(a)).join(' ')
      expect(joined).toContain('OPENWEATHER_APPID')
    })

    it('should not register interval when OPENWEATHER_LOCATION is missing', async () => {
      delete process.env.OPENWEATHER_LOCATION
      await getRouter(applicationFake, serverFake, socketFake)
      expect(setIntervalStub.callCount).toBe(0)
    })

    it('should not call updateWeather when OPENWEATHER_LOCATION is missing', async () => {
      delete process.env.OPENWEATHER_LOCATION
      await getRouter(applicationFake, serverFake, socketFake)
      expect(updateWeatherStub.callCount).toBe(0)
    })

    it('should name the missing OPENWEATHER_LOCATION env var in the log', async () => {
      delete process.env.OPENWEATHER_LOCATION
      await getRouter(applicationFake, serverFake, socketFake)
      const joined = loggerStub.firstCall.args.map((a: unknown) => String(a)).join(' ')
      expect(joined).toContain('OPENWEATHER_LOCATION')
    })

    it('should not register interval when OPENWEATHER_APPID is blank', async () => {
      process.env.OPENWEATHER_APPID = ''
      await getRouter(applicationFake, serverFake, socketFake)
      expect(setIntervalStub.callCount).toBe(0)
    })

    it('should not register interval when OPENWEATHER_LOCATION is blank', async () => {
      process.env.OPENWEATHER_LOCATION = ''
      await getRouter(applicationFake, serverFake, socketFake)
      expect(setIntervalStub.callCount).toBe(0)
    })
  })
})

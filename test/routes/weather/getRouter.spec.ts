'use sanity'

import { Internals, Weather, getRouter, Imports, type WeatherResults } from '#routes/weather.js'
import type { Application, Router, Response } from 'express'
import type { Server as WebSocketServer } from 'socket.io'
import type { Server } from 'node:http'
import { cast } from '#testutils/typeGuards.js'
import { createResponseFake } from '#testutils/express.js'
import type { MockInstance } from 'vitest'

describe('routes/weather getRouter()', () => {
  let setIntervalStub: MockInstance = vi.fn()
  let updateWeatherStub: MockInstance = vi.fn()
  let routerStub = {
    get: vi.fn(),
  }
  let getRouterStub = vi.fn().mockReturnValue(cast<Router>(routerStub))
  let applicationFake = cast<Application>({})
  let serverFake = cast<Server>({})
  let socketFake = cast<WebSocketServer>({})
  let { stub: responseStub, fake: responseFake } = createResponseFake()
  beforeEach(() => {
    process.env.OPENWEATHER_APPID = 'test-appid'
    process.env.OPENWEATHER_LOCATION = 'test-location'
    setIntervalStub = vi.spyOn(global, 'setInterval').mockReturnValue(cast<NodeJS.Timeout>({}))
    updateWeatherStub = vi.spyOn(Internals, 'updateWeather').mockResolvedValue(cast<WeatherResults>({}))
    routerStub = {
      get: vi.fn(),
    }
    applicationFake = cast<Application>({})
    serverFake = cast<Server>({})
    socketFake = cast<WebSocketServer>({})
    getRouterStub = vi.spyOn(Imports, 'Router').mockReturnValue(cast<Router>(routerStub))
    ;({ stub: responseStub, fake: responseFake } = createResponseFake())
  })
  afterEach(() => {
    delete process.env.OPENWEATHER_APPID
    delete process.env.OPENWEATHER_LOCATION
  })
  it('should create Router', async () => {
    await getRouter(applicationFake, serverFake, socketFake)
    expect(getRouterStub.mock.calls.length).toBe(1)
  })
  it('should register correct endpoint count', async () => {
    await getRouter(applicationFake, serverFake, socketFake)
    expect(routerStub.get.mock.calls.length).toBe(1)
  })
  it('should register root route', async () => {
    await getRouter(applicationFake, serverFake, socketFake)
    expect(routerStub.get.mock.calls[0]?.[0]).toBe('/')
  })
  it('should register interval', async () => {
    await getRouter(applicationFake, serverFake, socketFake)
    expect(setIntervalStub.mock.calls.length).toBe(1)
  })
  it('should register callback for interval', async () => {
    await getRouter(applicationFake, serverFake, socketFake)
    expect(setIntervalStub.mock.calls[0]?.[0]).toBeTypeOf('function')
  })
  it('should call updateWeather when callback fires', async () => {
    await getRouter(applicationFake, serverFake, socketFake)
    const fn = cast<() => void>(setIntervalStub.mock.calls[0]?.[0])
    updateWeatherStub.mockClear()
    fn()
    expect(updateWeatherStub.mock.calls.length).toBe(1)
  })
  it('should register interval of expected length', async () => {
    await getRouter(applicationFake, serverFake, socketFake)
    expect(setIntervalStub.mock.calls[0]?.[1]).toBe(600000)
  })
  it('should call updateWeather when creating router', async () => {
    await getRouter(applicationFake, serverFake, socketFake)
    expect(updateWeatherStub.mock.calls.length).toBe(1)
  })
  const successTests: Array<[string, () => void]> = [
    [
      'set status',
      () => {
        expect(responseStub.status.mock.calls.length).toBe(1)
      },
    ],
    [
      'set HTTP OK status',
      () => {
        expect(responseStub.status.mock.calls[0]?.[0]).toBe(200)
      },
    ],
    [
      'send json',
      () => {
        expect(responseStub.json.mock.calls.length).toBe(1)
      },
    ],
    [
      'send weather data',
      () => {
        expect(responseStub.json.mock.calls[0]?.[0]).toBe(Weather)
      },
    ],
  ]
  successTests.forEach(([title, validationFn]) => {
    it(`should ${title} on success`, async () => {
      await getRouter(applicationFake, serverFake, socketFake)
      const fn = cast<(_: unknown, res: Response) => Promise<void>>(routerStub.get.mock.calls[0]?.[1])
      await fn(null, responseFake)
      validationFn()
    })
  })

  describe('with missing weather config', () => {
    let loggerStub: MockInstance = vi.fn()
    beforeEach(() => {
      loggerStub = vi.spyOn(Imports, 'logger').mockImplementation((..._args: unknown[]) => undefined)
    })

    it('should not register interval when OPENWEATHER_APPID is missing', async () => {
      delete process.env.OPENWEATHER_APPID
      await getRouter(applicationFake, serverFake, socketFake)
      expect(setIntervalStub.mock.calls.length).toBe(0)
    })

    it('should not call updateWeather when OPENWEATHER_APPID is missing', async () => {
      delete process.env.OPENWEATHER_APPID
      await getRouter(applicationFake, serverFake, socketFake)
      expect(updateWeatherStub.mock.calls.length).toBe(0)
    })

    it('should still register the root route when OPENWEATHER_APPID is missing', async () => {
      delete process.env.OPENWEATHER_APPID
      await getRouter(applicationFake, serverFake, socketFake)
      expect(routerStub.get.mock.calls[0]?.[0]).toBe('/')
    })

    it('should log once when OPENWEATHER_APPID is missing', async () => {
      delete process.env.OPENWEATHER_APPID
      await getRouter(applicationFake, serverFake, socketFake)
      expect(loggerStub.mock.calls.length).toBe(1)
    })

    it('should log without an Error instance when OPENWEATHER_APPID is missing', async () => {
      delete process.env.OPENWEATHER_APPID
      await getRouter(applicationFake, serverFake, socketFake)
      const hasErrorArg = loggerStub.mock.calls[0]?.some((a: unknown) => a instanceof Error) ?? false
      expect(hasErrorArg).toBe(false)
    })

    it('should name the missing OPENWEATHER_APPID env var in the log', async () => {
      delete process.env.OPENWEATHER_APPID
      await getRouter(applicationFake, serverFake, socketFake)
      const joined = (loggerStub.mock.calls[0] ?? []).map((a: unknown) => String(a)).join(' ')
      expect(joined).toContain('OPENWEATHER_APPID')
    })

    it('should not register interval when OPENWEATHER_LOCATION is missing', async () => {
      delete process.env.OPENWEATHER_LOCATION
      await getRouter(applicationFake, serverFake, socketFake)
      expect(setIntervalStub.mock.calls.length).toBe(0)
    })

    it('should not call updateWeather when OPENWEATHER_LOCATION is missing', async () => {
      delete process.env.OPENWEATHER_LOCATION
      await getRouter(applicationFake, serverFake, socketFake)
      expect(updateWeatherStub.mock.calls.length).toBe(0)
    })

    it('should name the missing OPENWEATHER_LOCATION env var in the log', async () => {
      delete process.env.OPENWEATHER_LOCATION
      await getRouter(applicationFake, serverFake, socketFake)
      const joined = (loggerStub.mock.calls[0] ?? []).map((a: unknown) => String(a)).join(' ')
      expect(joined).toContain('OPENWEATHER_LOCATION')
    })

    it('should not register interval when OPENWEATHER_APPID is blank', async () => {
      process.env.OPENWEATHER_APPID = ''
      await getRouter(applicationFake, serverFake, socketFake)
      expect(setIntervalStub.mock.calls.length).toBe(0)
    })

    it('should not register interval when OPENWEATHER_LOCATION is blank', async () => {
      process.env.OPENWEATHER_LOCATION = ''
      await getRouter(applicationFake, serverFake, socketFake)
      expect(setIntervalStub.mock.calls.length).toBe(0)
    })
  })
})

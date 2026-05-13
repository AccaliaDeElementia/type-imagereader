'use sanity'

import type { Express } from 'express'
import type { Server as HttpServer } from 'node:http'
import type { Server as WebSocketServer } from 'socket.io'
import { cast } from '#testutils/typeGuards.js'
import { Routers, registerRouters } from '#server.js'
import type { MockInstance } from 'vitest'

describe('Server registerRouters', () => {
  let getRootRouter: MockInstance = vi.fn()
  let getApiRouter: MockInstance = vi.fn()
  let getImagesRouter: MockInstance = vi.fn()
  let getSlideshowRouter: MockInstance = vi.fn()
  let getWeatherRouter: MockInstance = vi.fn()
  let appStub = { use: vi.fn() }
  let appFake = cast<Express>(appStub)
  let serverFake = cast<HttpServer>({})
  let socketsFake = cast<WebSocketServer>({})
  beforeEach(() => {
    getRootRouter = vi.spyOn(Routers, 'Root').mockResolvedValue(cast(undefined))
    getApiRouter = vi.spyOn(Routers, 'Api').mockResolvedValue(cast(undefined))
    getImagesRouter = vi.spyOn(Routers, 'Images').mockResolvedValue(cast(undefined))
    getSlideshowRouter = vi.spyOn(Routers, 'Slideshow').mockResolvedValue(cast(undefined))
    getWeatherRouter = vi.spyOn(Routers, 'Weather').mockResolvedValue(cast(undefined))
    appStub = { use: vi.fn() }
    appFake = cast<Express>(appStub)
    serverFake = cast<HttpServer>({})
    socketsFake = cast<WebSocketServer>({})
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })

  const tests: Array<[string, string, () => MockInstance]> = [
    ['Root', '/', () => getRootRouter],
    ['Api', '/api', () => getApiRouter],
    ['Images', '/images', () => getImagesRouter],
    ['Slideshow', '/slideshow', () => getSlideshowRouter],
    ['Weather', '/weather', () => getWeatherRouter],
  ]

  it('should register expected number of routers', async () => {
    await registerRouters(appFake, serverFake, socketsFake)
    expect(appStub.use.mock.calls.length).toBe(tests.length)
  })

  tests.forEach(([title, url, getStub]) => {
    describe(`for ${title} router`, () => {
      let expected: object = {}
      beforeEach(async () => {
        expected = {}
        getStub().mockResolvedValue(expected)
        await registerRouters(appFake, serverFake, socketsFake)
      })
      it(`should register at url '${url}'`, () => {
        expect(appStub.use).toHaveBeenCalledWith(url, expect.anything())
      })
      it('should register with two parameters', () => {
        const args = appStub.use.mock.calls.find((call) => call[0] === url)
        expect(args).toHaveLength(2)
      })
      it('should register the created router', () => {
        const router = appStub.use.mock.calls.find((call) => call[0] === url)?.[1] as unknown
        expect(router).toBe(expected)
      })
      it('should create the router once', () => {
        expect(getStub().mock.calls.length).toBe(1)
      })
      it('should create with three arguments', () => {
        expect(getStub().mock.calls[0]).toHaveLength(3)
      })
      it('should create with express app', () => {
        expect(getStub().mock.calls[0]?.[0]).toBe(appFake)
      })
      it('should create with http server', () => {
        expect(getStub().mock.calls[0]?.[1]).toBe(serverFake)
      })
      it('should create with websocket server', () => {
        expect(getStub().mock.calls[0]?.[2]).toBe(socketsFake)
      })
    })
  })
})

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
  const mounts: Array<[string, string, () => MockInstance]> = [
    ['Root', '/', () => getRootRouter],
    ['Api', '/api', () => getApiRouter],
    ['Images', '/images', () => getImagesRouter],
    ['Slideshow', '/slideshow', () => getSlideshowRouter],
    ['Weather', '/weather', () => getWeatherRouter],
  ]

  it('should mount every router in declared order', async () => {
    await registerRouters(appFake, serverFake, socketsFake)
    expect(appStub.use.mock.calls.map((call: unknown[]) => call[0])).toEqual(mounts.map(([, url]) => url))
  })

  mounts.forEach(([title, url, getStub]: [string, string, () => MockInstance]): void => {
    describe(`for ${title} router`, () => {
      let expected = { router: title }
      beforeEach(async () => {
        expected = { router: title }
        getStub().mockResolvedValue(expected)
        await registerRouters(appFake, serverFake, socketsFake)
      })
      it('should build the router once from the app, http server and websockets', () => {
        expect(getStub().mock.calls).toEqual([[appFake, serverFake, socketsFake]])
      })
      it(`should mount the built router at '${url}' exactly once`, () => {
        expect(appStub.use.mock.calls.filter((call: unknown[]) => call[0] === url)).toEqual([[url, expected]])
      })
    })
  })
})

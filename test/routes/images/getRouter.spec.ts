'use sanity'

import type { Application, Router } from 'express'
import type { Server } from 'node:http'
import type { Server as WebSocketServer } from 'socket.io'

import { CacheStorage, readAndConvertImage, readAndRescaleImage, getRouter, Imports } from '#routes/images.js'
import type { ImageCache } from '#routes/images.js'
import { cast } from '#testutils/typeGuards.js'
import type { MockInstance } from 'vitest'

const ORIGINAL_CACHE_SIZE = 5
const DISTINCT_CACHE_COUNT = 3

interface ReplacedCache {
  name: string
  read: () => ImageCache
  backedBy: string
  cacheFunction: ImageCache['cacheFunction']
  maxItems: number | undefined
}

describe('routes/images export getRouter()', () => {
  const cachesAtLoad = { ...CacheStorage }
  let applicationFake = cast<Application>({})
  let serverFake = cast<Server>({})
  let websocketsFake = cast<WebSocketServer>({})
  let routerFake = {
    get: vi.fn().mockImplementation(function (this: object): unknown {
      return this
    }),
  }
  let getRouterStub: MockInstance = vi.fn()
  let loggerStub: MockInstance = vi.fn()
  beforeEach(() => {
    applicationFake = cast<Application>({})
    serverFake = cast<Server>({})
    websocketsFake = cast<WebSocketServer>({})
    routerFake = {
      get: vi.fn().mockImplementation(function (this: object): unknown {
        return this
      }),
    }
    getRouterStub = vi.spyOn(Imports, 'Router').mockReturnValue(cast<Router>(routerFake))
    loggerStub = vi.spyOn(Imports, 'logger').mockImplementation((..._args: unknown[]) => undefined)
  })
  afterAll(() => {
    Object.assign(CacheStorage, cachesAtLoad)
  })

  const buildRouter = async (): Promise<void> => {
    await getRouter(applicationFake, serverFake, websocketsFake)
  }

  it('should construct the router exactly once with no arguments', async () => {
    await buildRouter()
    expect(getRouterStub.mock.calls).toEqual([[]])
  })
  it('should not generate logging messages on construction', async () => {
    await buildRouter()
    expect(loggerStub.mock.calls.length).toBe(0)
  })

  const replacedCaches: ReplacedCache[] = [
    {
      name: 'kiosk',
      read: () => CacheStorage.kioskCache,
      backedBy: 'readAndRescaleImage',
      cacheFunction: readAndRescaleImage,
      maxItems: undefined,
    },
    {
      name: 'scaled',
      read: () => CacheStorage.scaledCache,
      backedBy: 'readAndRescaleImage',
      cacheFunction: readAndRescaleImage,
      maxItems: undefined,
    },
    {
      name: 'original',
      read: () => CacheStorage.originalCache,
      backedBy: 'readAndConvertImage',
      cacheFunction: readAndConvertImage,
      maxItems: ORIGINAL_CACHE_SIZE,
    },
  ]
  replacedCaches.forEach(({ name, read, backedBy, cacheFunction, maxItems }: ReplacedCache): void => {
    it(`should replace the ${name} cache with a fresh one backed by ${backedBy}`, async () => {
      const cacheAtLoad = read()
      await buildRouter()
      const cache = read()
      expect({ replaced: cache !== cacheAtLoad, cacheFunction: cache.cacheFunction, maxItems: cache.maxItems }).toEqual(
        {
          replaced: true,
          cacheFunction,
          maxItems,
        },
      )
    })
  })
  it('should give the kiosk, scaled and original caches separate instances', async () => {
    await buildRouter()
    const instances = new Set([CacheStorage.kioskCache, CacheStorage.scaledCache, CacheStorage.originalCache])
    expect(instances.size).toBe(DISTINCT_CACHE_COUNT)
  })

  const routes = [
    '/full/*path',
    '/scaled/:width/:height/*path-image.webp',
    '/original/*path-image.webp',
    '/preview/*path-image.webp',
    '/kiosk/*path-image.webp',
  ]
  it('should register every image route in declared order', async () => {
    await buildRouter()
    expect(routerFake.get.mock.calls.map((call: unknown[]) => call[0])).toEqual(routes)
  })
})

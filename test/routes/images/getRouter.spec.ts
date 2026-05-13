'use sanity'

import type { Application, Router } from 'express'
import type { Server } from 'node:http'
import type { Server as WebSocketServer } from 'socket.io'

import { CacheStorage, readAndRescaleImage, getRouter, Imports } from '#routes/images.js'
import { cast } from '#testutils/typeGuards.js'
import type { MockInstance } from 'vitest'

describe('routes/images export getRouter()', () => {
  const defaultKioskCache = CacheStorage.kioskCache
  const defaultScaledCache = CacheStorage.scaledCache
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
  afterEach(() => {
    vi.restoreAllMocks()
  })
  afterAll(() => {
    CacheStorage.kioskCache = defaultKioskCache
    CacheStorage.scaledCache = defaultScaledCache
  })
  it('should use router import to construct router', async () => {
    await getRouter(applicationFake, serverFake, websocketsFake)
    expect(getRouterStub.mock.calls.length).toBe(1)
  })
  it('should call router import with no arguments', async () => {
    await getRouter(applicationFake, serverFake, websocketsFake)
    expect(getRouterStub.mock.calls[0]).toEqual([])
  })
  it('should not generate logging messages on construction', async () => {
    await getRouter(applicationFake, serverFake, websocketsFake)
    expect(loggerStub.mock.calls.length).toBe(0)
  })
  it('should create new kiosk mode image cache', async () => {
    await getRouter(applicationFake, serverFake, websocketsFake)
    expect(CacheStorage.kioskCache).not.toBe(defaultKioskCache)
  })
  it('should use readAndRescaleImage() to fill kiosk mode image cache', async () => {
    await getRouter(applicationFake, serverFake, websocketsFake)
    expect(CacheStorage.kioskCache.cacheFunction).toBe(readAndRescaleImage)
  })
  it('should create new scaled mode image cache', async () => {
    await getRouter(applicationFake, serverFake, websocketsFake)
    expect(CacheStorage.scaledCache).not.toBe(defaultScaledCache)
  })
  it('should use readAndRescaleImage() to fill scaled mode image cache', async () => {
    await getRouter(applicationFake, serverFake, websocketsFake)
    expect(CacheStorage.scaledCache.cacheFunction).toBe(readAndRescaleImage)
  })
  it('should create separate kiosk and scaled mode image caches', async () => {
    await getRouter(applicationFake, serverFake, websocketsFake)
    expect(CacheStorage.kioskCache).not.toBe(CacheStorage.scaledCache)
  })
  const routes = [
    '/full/*path',
    '/scaled/:width/:height/*path-image.webp',
    '/preview/*path-image.webp',
    '/kiosk/*path-image.webp',
  ]
  it('should register only expected router count', async () => {
    await getRouter(applicationFake, serverFake, websocketsFake)
    expect(routerFake.get.mock.calls.length).toBe(routes.length)
  })
  routes.forEach((route) => {
    it(`should register expected router: ${route}`, async () => {
      await getRouter(applicationFake, serverFake, websocketsFake)
      expect(routerFake.get).toHaveBeenCalledWith(route, expect.anything())
    })
  })
})

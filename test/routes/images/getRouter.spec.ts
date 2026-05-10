'use sanity'

import type { Debugger } from 'debug'

import type { Application, Router } from 'express'
import type { Server } from 'node:http'
import type { Server as WebSocketServer } from 'socket.io'

import { CacheStorage, readAndRescaleImage, getRouter, Imports } from '#routes/images.js'
import Sinon from 'sinon'
import { cast } from '#testutils/typeGuards.js'

const sandbox = Sinon.createSandbox()

describe('routes/images export getRouter()', () => {
  const defaultKioskCache = CacheStorage.kioskCache
  const defaultScaledCache = CacheStorage.scaledCache
  let applicationFake = cast<Application>({})
  let serverFake = cast<Server>({})
  let websocketsFake = cast<WebSocketServer>({})
  let routerFake = {
    get: sandbox.stub().returnsThis(),
  }
  let getRouterStub = sandbox.stub()
  let loggerStub = sandbox.stub()
  beforeEach(() => {
    applicationFake = cast<Application>({})
    serverFake = cast<Server>({})
    websocketsFake = cast<WebSocketServer>({})
    routerFake = {
      get: sandbox.stub().returnsThis(),
    }
    getRouterStub = sandbox.stub(Imports, 'Router').returns(cast<Router>(routerFake))
    loggerStub = sandbox.stub()
    sandbox.stub(Imports, 'logger').value(cast<Debugger>(loggerStub))
  })
  afterEach(() => {
    sandbox.restore()
  })
  afterAll(() => {
    CacheStorage.kioskCache = defaultKioskCache
    CacheStorage.scaledCache = defaultScaledCache
  })
  it('should use router import to construct router', async () => {
    await getRouter(applicationFake, serverFake, websocketsFake)
    expect(getRouterStub.callCount).toBe(1)
  })
  it('should call router import with no arguments', async () => {
    await getRouter(applicationFake, serverFake, websocketsFake)
    expect(getRouterStub.firstCall.args).toEqual([])
  })
  it('should not generate logging messages on construction', async () => {
    await getRouter(applicationFake, serverFake, websocketsFake)
    expect(loggerStub.callCount).toBe(0)
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
    expect(routerFake.get.callCount).toBe(routes.length)
  })
  routes.forEach((route) => {
    it(`should register expected router: ${route}`, async () => {
      await getRouter(applicationFake, serverFake, websocketsFake)
      expect(routerFake.get.calledWith(route)).toBe(true)
    })
  })
})

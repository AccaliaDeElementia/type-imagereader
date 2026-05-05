'use sanity'

import { expect } from 'chai'
import type { Debugger } from 'debug'

import type { Application, Router } from 'express'
import type { Server } from 'node:http'
import type { Server as WebSocketServer } from 'socket.io'

import { CacheStorage, Functions, getRouter, Imports } from '#routes/images.js'
import Sinon from 'sinon'
import { Cast } from '#testutils/TypeGuards.js'

const sandbox = Sinon.createSandbox()

describe('routes/images export getRouter()', () => {
  const defaultKioskCache = CacheStorage.kioskCache
  const defaultScaledCache = CacheStorage.scaledCache
  let applicationFake = Cast<Application>({})
  let serverFake = Cast<Server>({})
  let websocketsFake = Cast<WebSocketServer>({})
  let routerFake = {
    get: sandbox.stub().returnsThis(),
  }
  let getRouterStub = sandbox.stub()
  let loggerStub = sandbox.stub()
  beforeEach(() => {
    applicationFake = Cast<Application>({})
    serverFake = Cast<Server>({})
    websocketsFake = Cast<WebSocketServer>({})
    routerFake = {
      get: sandbox.stub().returnsThis(),
    }
    getRouterStub = sandbox.stub(Imports, 'Router').returns(Cast<Router>(routerFake))
    loggerStub = sandbox.stub()
    sandbox.stub(Imports, 'logger').value(Cast<Debugger>(loggerStub))
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
    expect(getRouterStub.callCount).to.equal(1)
  })
  it('should call router import with no arguments', async () => {
    await getRouter(applicationFake, serverFake, websocketsFake)
    expect(getRouterStub.firstCall.args).to.deep.equal([])
  })
  it('should not generate logging messages on construction', async () => {
    await getRouter(applicationFake, serverFake, websocketsFake)
    expect(loggerStub.callCount).to.equal(0)
  })
  it('should create new kiosk mode image cache', async () => {
    await getRouter(applicationFake, serverFake, websocketsFake)
    expect(CacheStorage.kioskCache).to.not.equal(defaultKioskCache)
  })
  it('should use ReadAndRescaleImage() to fill kiosk mode image cache', async () => {
    await getRouter(applicationFake, serverFake, websocketsFake)
    expect(CacheStorage.kioskCache.cacheFunction).to.equal(Functions.ReadAndRescaleImage)
  })
  it('should create new scaled mode image cache', async () => {
    await getRouter(applicationFake, serverFake, websocketsFake)
    expect(CacheStorage.scaledCache).to.not.equal(defaultScaledCache)
  })
  it('should use ReadAndRescaleImage() to fill scaled mode image cache', async () => {
    await getRouter(applicationFake, serverFake, websocketsFake)
    expect(CacheStorage.scaledCache.cacheFunction).to.equal(Functions.ReadAndRescaleImage)
  })
  it('should create separate kiosk and scaled mode image caches', async () => {
    await getRouter(applicationFake, serverFake, websocketsFake)
    expect(CacheStorage.kioskCache).to.not.equal(CacheStorage.scaledCache)
  })
  const routes = [
    '/full/*path',
    '/scaled/:width/:height/*path-image.webp',
    '/preview/*path-image.webp',
    '/kiosk/*path-image.webp',
  ]
  it('should register only expected router count', async () => {
    await getRouter(applicationFake, serverFake, websocketsFake)
    expect(routerFake.get.callCount).to.equal(routes.length)
  })
  routes.forEach((route) => {
    it(`should register expected router: ${route}`, async () => {
      await getRouter(applicationFake, serverFake, websocketsFake)
      expect(routerFake.get.calledWith(route)).to.equal(true)
    })
  })
})

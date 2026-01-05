'use sanity'

import { expect } from 'chai'
import type { Debugger } from 'debug'

import type { Application, Router } from 'express'
import type { Server } from 'node:http'
import type { Server as WebSocketServer } from 'socket.io'

import { CacheStorage, Functions, getRouter, Imports } from '../../../routes/images'
import Sinon from 'sinon'
import { Cast } from '../../testutils/TypeGuards'

describe('routes/images export getRouter()', () => {
  const defaultKioskCache = CacheStorage.kioskCache
  const defaultScaledCache = CacheStorage.scaledCache
  let applicationFake = Cast<Application>({})
  let serverFake = Cast<Server>({})
  let websocketsFake = Cast<WebSocketServer>({})
  let routerFake = {
    get: Sinon.stub().returnsThis(),
  }
  let getRouterStub = Sinon.stub()
  let loggerStub = Sinon.stub()
  let debugStub = Sinon.stub()
  beforeEach(() => {
    applicationFake = Cast<Application>({})
    serverFake = Cast<Server>({})
    websocketsFake = Cast<WebSocketServer>({})
    routerFake = {
      get: Sinon.stub().returnsThis(),
    }
    getRouterStub = Sinon.stub(Imports, 'Router').returns(Cast<Router>(routerFake))
    loggerStub = Sinon.stub()
    debugStub = Sinon.stub(Imports, 'debug').returns(Cast<Debugger>(loggerStub))
  })
  afterEach(() => {
    debugStub.restore()
    getRouterStub.restore()
  })
  after(() => {
    CacheStorage.kioskCache = defaultKioskCache
    CacheStorage.scaledCache = defaultScaledCache
  })
  it('should use router import to construct router', async () => {
    await getRouter(applicationFake, serverFake, websocketsFake)
    expect(getRouterStub.callCount).to.equal(1)
    expect(getRouterStub.firstCall.args).to.deep.equal([])
  })
  it('should return new router instance', async () => {
    const router = await getRouter(applicationFake, serverFake, websocketsFake)
    expect(router).to.equal(routerFake)
  })
  it('should construct logger', async () => {
    await getRouter(applicationFake, serverFake, websocketsFake)
    expect(debugStub.callCount).to.equal(1)
  })
  it('should namespace constructed logger', async () => {
    await getRouter(applicationFake, serverFake, websocketsFake)
    expect(debugStub.firstCall.args).to.deep.equal(['type-imagereader:images'])
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
  it('should create new scaledk mode image cache', async () => {
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
  const routes = ['/full/*', '/scaled/:width/:height/*-image.webp', '/preview/*-image.webp', '/kiosk/*-image.webp']
  it('should register only expected router count', async () => {
    await getRouter(applicationFake, serverFake, websocketsFake)
    expect(routerFake.get.callCount).to.equal(routes.length)
  })
  routes.forEach((route) => {
    it('should register only expected router count', async () => {
      await getRouter(applicationFake, serverFake, websocketsFake)
      expect(routerFake.get.calledWith(route)).to.equal(true)
    })
  })
})

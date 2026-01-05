'use sanity'

import { expect } from 'chai'
import type { Express } from 'express'
import type { Server as HttpServer } from 'node:http'
import type { Server as WebSocketServer } from 'socket.io'
import Sinon from 'sinon'
import { Cast } from '../testutils/TypeGuards'
import { Routers, Functions } from '../../Server'

describe('Server function RegisterRouters', () => {
  let getRootRouter = Sinon.stub()
  let getApiRouter = Sinon.stub()
  let getImagesRouter = Sinon.stub()
  let getSlideshowRouter = Sinon.stub()
  let getWeatherRouter = Sinon.stub()
  let appStub = { use: Sinon.stub() }
  let appFake = Cast<Express>(appStub)
  let serverFake = Cast<HttpServer>({})
  let socketsFake = Cast<WebSocketServer>({})
  beforeEach(() => {
    getRootRouter = Sinon.stub(Routers, 'Root').resolves()
    getApiRouter = Sinon.stub(Routers, 'Api').resolves()
    getImagesRouter = Sinon.stub(Routers, 'Images').resolves()
    getSlideshowRouter = Sinon.stub(Routers, 'Slideshow').resolves()
    getWeatherRouter = Sinon.stub(Routers, 'Weather').resolves()
    appStub = { use: Sinon.stub() }
    appFake = Cast<Express>(appStub)
    serverFake = Cast<HttpServer>({})
    socketsFake = Cast<WebSocketServer>({})
  })
  afterEach(() => {
    getRootRouter.restore()
    getApiRouter.restore()
    getImagesRouter.restore()
    getSlideshowRouter.restore()
    getWeatherRouter.restore()
  })
  const tests: Array<[string, string, () => Sinon.SinonStub]> = [
    ['Root', '/', () => getRootRouter],
    ['Api', '/api', () => getApiRouter],
    ['Images', '/images', () => getImagesRouter],
    ['Slideshow', '/slideshow', () => getSlideshowRouter],
    ['Weather', '/weather', () => getWeatherRouter],
  ]
  it('should register expected number of routers', async () => {
    await Functions.RegisterRouters(appFake, serverFake, socketsFake)
    expect(appStub.use.callCount).to.equal(tests.length)
  })
  tests.forEach(([title, url, getStub]) => {
    it(`should register a router for '${url}'`, async () => {
      await Functions.RegisterRouters(appFake, serverFake, socketsFake)
      expect(appStub.use.calledWith(url)).to.equal(true)
    })
    it(`should register correct number of parameters for '${url}'`, async () => {
      await Functions.RegisterRouters(appFake, serverFake, socketsFake)
      const args = appStub.use.getCalls().find((call) => call.args[0] === url)?.args as unknown[] | undefined
      expect(args).to.have.lengthOf(2)
    })
    it(`should register a created ${title} router for '${url}'`, async () => {
      const expected = {}
      getStub().resolves(expected)
      await Functions.RegisterRouters(appFake, serverFake, socketsFake)
      const router = appStub.use.getCalls().find((call) => call.args[0] === url)?.args[1] as unknown
      expect(router).to.equal(expected)
    })
    it(`should create ${title} router`, async () => {
      await Functions.RegisterRouters(appFake, serverFake, socketsFake)
      expect(getStub().callCount).to.equal(1)
    })
    it(`should create ${title} router with proper argument count`, async () => {
      await Functions.RegisterRouters(appFake, serverFake, socketsFake)
      expect(getStub().firstCall.args).to.have.lengthOf(3)
    })
    it(`should create ${title} router with express app`, async () => {
      await Functions.RegisterRouters(appFake, serverFake, socketsFake)
      expect(getStub().firstCall.args[0]).to.equal(appFake)
    })
    it(`should create ${title} router with http server`, async () => {
      await Functions.RegisterRouters(appFake, serverFake, socketsFake)
      expect(getStub().firstCall.args[1]).to.equal(serverFake)
    })
    it(`should create ${title} router with websocket server`, async () => {
      await Functions.RegisterRouters(appFake, serverFake, socketsFake)
      expect(getStub().firstCall.args[2]).to.equal(socketsFake)
    })
  })
})

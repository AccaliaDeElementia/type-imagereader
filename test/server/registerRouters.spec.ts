'use sanity'

import type { Express } from 'express'
import type { Server as HttpServer } from 'node:http'
import type { Server as WebSocketServer } from 'socket.io'
import Sinon from 'sinon'
import { cast } from '#testutils/typeGuards.js'
import { Routers, registerRouters } from '#server.js'

const sandbox = Sinon.createSandbox()

describe('Server registerRouters', () => {
  let getRootRouter = sandbox.stub()
  let getApiRouter = sandbox.stub()
  let getImagesRouter = sandbox.stub()
  let getSlideshowRouter = sandbox.stub()
  let getWeatherRouter = sandbox.stub()
  let appStub = { use: sandbox.stub() }
  let appFake = cast<Express>(appStub)
  let serverFake = cast<HttpServer>({})
  let socketsFake = cast<WebSocketServer>({})
  beforeEach(() => {
    getRootRouter = sandbox.stub(Routers, 'Root').resolves()
    getApiRouter = sandbox.stub(Routers, 'Api').resolves()
    getImagesRouter = sandbox.stub(Routers, 'Images').resolves()
    getSlideshowRouter = sandbox.stub(Routers, 'Slideshow').resolves()
    getWeatherRouter = sandbox.stub(Routers, 'Weather').resolves()
    appStub = { use: sandbox.stub() }
    appFake = cast<Express>(appStub)
    serverFake = cast<HttpServer>({})
    socketsFake = cast<WebSocketServer>({})
  })
  afterEach(() => {
    sandbox.restore()
  })

  const tests: Array<[string, string, () => Sinon.SinonStub]> = [
    ['Root', '/', () => getRootRouter],
    ['Api', '/api', () => getApiRouter],
    ['Images', '/images', () => getImagesRouter],
    ['Slideshow', '/slideshow', () => getSlideshowRouter],
    ['Weather', '/weather', () => getWeatherRouter],
  ]

  it('should register expected number of routers', async () => {
    await registerRouters(appFake, serverFake, socketsFake)
    expect(appStub.use.callCount).toBe(tests.length)
  })

  tests.forEach(([title, url, getStub]) => {
    describe(`for ${title} router`, () => {
      let expected: object = {}
      beforeEach(async () => {
        expected = {}
        getStub().resolves(expected)
        await registerRouters(appFake, serverFake, socketsFake)
      })
      it(`should register at url '${url}'`, () => {
        expect(appStub.use.calledWith(url)).toBe(true)
      })
      it('should register with two parameters', () => {
        const args = appStub.use.getCalls().find((call) => call.args[0] === url)?.args as unknown[] | undefined
        expect(args).toHaveLength(2)
      })
      it('should register the created router', () => {
        const router = appStub.use.getCalls().find((call) => call.args[0] === url)?.args[1] as unknown
        expect(router).toBe(expected)
      })
      it('should create the router once', () => {
        expect(getStub().callCount).toBe(1)
      })
      it('should create with three arguments', () => {
        expect(getStub().firstCall.args).toHaveLength(3)
      })
      it('should create with express app', () => {
        expect(getStub().firstCall.args[0]).toBe(appFake)
      })
      it('should create with http server', () => {
        expect(getStub().firstCall.args[1]).toBe(serverFake)
      })
      it('should create with websocket server', () => {
        expect(getStub().firstCall.args[2]).toBe(socketsFake)
      })
    })
  })
})

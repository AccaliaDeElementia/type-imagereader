'use sanity'

import { assert, expect } from 'chai'
import Sinon from 'sinon'
import { Cast } from '../testutils/TypeGuards'
import start, { Functions } from '../../Server'
import type { Express } from 'express'
import type { Server as HttpServer } from 'node:http'
import type { Server as WebSocketServer } from 'socket.io'
import { Debouncer } from '../../utils/debounce'

describe('Server function RegisterRouters', () => {
  let appStub = { get: Sinon.stub() }
  let appFake = Cast<Express>(appStub)
  let serverFake = Cast<HttpServer>({})
  let socketsFake = Cast<WebSocketServer>({})
  let createAppStub = Sinon.stub()
  let configureBaseAppStub = Sinon.stub()
  let registerRoutersStub = Sinon.stub()
  let configureLoggingStub = Sinon.stub()
  let registerViewsStub = Sinon.stub()
  let debouncerStartStub = Sinon.stub()
  beforeEach(() => {
    appStub = { get: Sinon.stub() }
    appFake = Cast<Express>(appStub)
    serverFake = Cast<HttpServer>({})
    socketsFake = Cast<WebSocketServer>({})
    createAppStub = Sinon.stub(Functions, 'CreateApp').returns([appFake, serverFake, socketsFake])
    configureBaseAppStub = Sinon.stub(Functions, 'ConfigureBaseApp')
    registerRoutersStub = Sinon.stub(Functions, 'RegisterRouters').resolves()
    configureLoggingStub = Sinon.stub(Functions, 'ConfigureLoggingAndErrors')
    registerViewsStub = Sinon.stub(Functions, 'RegisterViewsAndMiddleware')
    debouncerStartStub = Sinon.stub(Debouncer, 'startTimers')
  })
  afterEach(() => {
    createAppStub.restore()
    configureBaseAppStub.restore()
    registerRoutersStub.restore()
    configureLoggingStub.restore()
    registerViewsStub.restore()
    debouncerStartStub.restore()
  })
  const baseTests: Array<[string, () => void]> = [
    ['create app', () => expect(createAppStub.callCount).to.equal(1)],
    ['create app with provided port', () => expect(createAppStub.firstCall.args).to.deep.equal([65535])],
    ['congifure base app', () => expect(configureBaseAppStub.callCount).to.equal(1)],
    ['configure base app with correct args', () => expect(configureBaseAppStub.firstCall.args).to.have.lengthOf(1)],
    ['configure base app with app', () => expect(configureBaseAppStub.firstCall.args[0]).to.equal(appFake)],
    ['register routers', () => expect(registerRoutersStub.callCount).to.equal(1)],
    ['register routers with correct args', () => expect(registerRoutersStub.firstCall.args).to.have.lengthOf(3)],
    ['register routers with app', () => expect(registerRoutersStub.firstCall.args[0]).to.equal(appFake)],
    ['register routers with http server', () => expect(registerRoutersStub.firstCall.args[1]).to.equal(serverFake)],
    ['register routers with websocckets', () => expect(registerRoutersStub.firstCall.args[2]).to.equal(socketsFake)],
    ['configure logging', () => expect(configureLoggingStub.callCount).to.equal(1)],
    ['configure logging with correct args', () => expect(configureLoggingStub.firstCall.args).to.have.lengthOf(1)],
    ['configure logging with app', () => expect(configureLoggingStub.firstCall.args[0]).to.equal(appFake)],
    ['register views', () => expect(registerViewsStub.callCount).to.equal(1)],
    ['register views with correct args', () => expect(registerViewsStub.firstCall.args).to.have.lengthOf(1)],
    ['register views with app', () => expect(registerViewsStub.firstCall.args[0]).to.equal(appFake)],
    ['start timers', () => expect(debouncerStartStub.callCount).to.equal(1)],
    ['start timers with no options', () => expect(debouncerStartStub.firstCall.args).to.deep.equal([])],
  ]
  baseTests.forEach(([title, validationFn]) => {
    it(`should ${title}`, async () => {
      await start(65535)
      validationFn()
    })
  })
  it('should return app', async () => {
    const { app } = await start(1024)
    expect(app).to.equal(appFake)
  })
  it('should return server', async () => {
    const { server } = await start(2048)
    expect(server).to.equal(serverFake)
  })
  describe('X-Clacks-Overhead', () => {
    let requestStub = {}
    let resposnseStub = { set: Sinon.stub() }
    let nextStub = Sinon.stub()
    let filterFn = (_a: unknown, _b: unknown, _c: Sinon.SinonStub): void => {
      assert.isTrue(false)
    }
    beforeEach(async () => {
      await start(4096)
      requestStub = {}
      resposnseStub = { set: Sinon.stub() }
      nextStub = Sinon.stub()
      filterFn = Cast<(req: unknown, res: unknown, next: Sinon.SinonStub) => void>(appStub.get.firstCall.args[1])
    })
    const clacksTests: Array<[string, () => void]> = [
      ['register get filter', () => expect(appStub.get.callCount).to.equal(1)],
      ['register full get filter', () => expect(appStub.get.firstCall.args).to.have.lengthOf(2)],
      ['register get filter for all paths', () => expect(appStub.get.firstCall.args[0]).to.equal('/*')],
      ['register get filter function', () => expect(filterFn).to.be.a('function')],
      ['set response header on filter', () => expect(resposnseStub.set.callCount).to.equal(1)],
      ['set full response header', () => expect(resposnseStub.set.firstCall.args).to.have.lengthOf(2)],
      ['set header name', () => expect(resposnseStub.set.firstCall.args[0]).to.equal('X-Clacks-Overhead')],
      ['set header value', () => expect(resposnseStub.set.firstCall.args[1]).to.equal('GNU Terry Pratchett')],
      ['pass call to next fn', () => expect(nextStub.callCount).to.equal(1)],
      ['pass call to next fn after heafer', () => expect(nextStub.calledAfter(resposnseStub.set)).to.equal(true)],
    ]
    clacksTests.forEach(([title, validationFn]) => {
      it(`should ${title}`, () => {
        filterFn(requestStub, resposnseStub, nextStub)
        validationFn()
      })
    })
  })
})

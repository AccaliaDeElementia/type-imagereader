'use sanity'

import { expect } from 'chai'
import type { Debugger } from 'debug'

import type { Request, RequestHandler, Response, Application, Router } from 'express'
import type { Server } from 'node:http'
import type { Server as WebSocketServer } from 'socket.io'

import { CacheStorage, Functions, getRouter, ImageData, Imports } from '#routes/images'
import Sinon from 'sinon'
import { Cast } from '#testutils/TypeGuards'
import { createResponseFake } from '#testutils/Express'

const sandbox = Sinon.createSandbox()

describe('routes/images route /kiosk/*-image.webp', () => {
  const defaultKioskCache = CacheStorage.kioskCache
  const defaultScaledCache = CacheStorage.scaledCache
  let applicationFake = Cast<Application>({})
  let serverFake = Cast<Server>({})
  let websocketsFake = Cast<WebSocketServer>({})
  let requestStub = {
    params: { path: undefined as string | string[] | undefined },
    body: '',
    originalUrl: '',
  }
  let requestFake = Cast<Request>(requestStub)
  let { stub: responseStub, fake: responseFake } = createResponseFake()
  let routerFake = {
    get: Sinon.stub().returnsThis(),
  }
  let loggerStub = Sinon.stub()
  let router = Cast<(req: Request, res: Response) => Promise<void>>(Sinon.stub())
  let fetchImageStub = Sinon.stub()
  let sendImageStub = Sinon.stub()
  beforeEach(async () => {
    applicationFake = Cast<Application>({})
    serverFake = Cast<Server>({})
    websocketsFake = Cast<WebSocketServer>({})
    routerFake = {
      get: Sinon.stub().returnsThis(),
    }
    sandbox.stub(Imports, 'Router').returns(Cast<Router>(routerFake))
    loggerStub = Sinon.stub()
    sandbox.stub(Imports, 'debug').returns(Cast<Debugger>(loggerStub))
    sandbox.stub(Imports, 'handleErrors').callsFake((_logger, action) => Cast<RequestHandler>(action))
    await getRouter(applicationFake, serverFake, websocketsFake)
    const [fn] = routerFake.get
      .getCalls()
      .filter((call) => call.args[0] === '/kiosk/*path-image.webp')
      .map((call) => call.args[1] as unknown)
    router = Cast<(req: Request, res: Response) => Promise<void>>(fn)
    fetchImageStub = sandbox.stub(CacheStorage.kioskCache, 'fetch').resolves()
    sendImageStub = sandbox.stub(Functions, 'SendImage').resolves()
    requestStub = {
      params: { path: undefined },
      body: '',
      originalUrl: '',
    }
    requestFake = Cast<Request>(requestStub)
    ;({ stub: responseStub, fake: responseFake } = createResponseFake())
  })
  afterEach(() => {
    sandbox.restore()
  })
  after(() => {
    CacheStorage.kioskCache = defaultKioskCache
    CacheStorage.scaledCache = defaultScaledCache
  })
  const successTests: Array<[string, (data: ImageData) => void]> = [
    ['not set response status', () => expect(responseStub.status.callCount).to.equal(0)],
    ['not send json data response', () => expect(responseStub.json.callCount).to.equal(0)],
    ['not log messages', () => expect(loggerStub.callCount).to.equal(0)],
    ['fetch image from cache', () => expect(fetchImageStub.callCount).to.equal(1)],
    ['fetch image filename from cache', () => expect(fetchImageStub.firstCall.args[0]).to.equal('/kiosk/image.png')],
    ['rescale image to preview width', () => expect(fetchImageStub.firstCall.args[1]).to.equal(1280)],
    ['rescale image to preview height', () => expect(fetchImageStub.firstCall.args[2]).to.equal(800)],
    ['send image with SendImage()', () => expect(sendImageStub.callCount).to.equal(1)],
    ['send image data with SendImage()', (img) => expect(sendImageStub.firstCall.args[0]).to.equal(img)],
    ['send to response with SendImage()', () => expect(sendImageStub.firstCall.args[1]).to.equal(responseFake)],
  ]
  successTests.forEach(([title, validationFn]) => {
    it(`should ${title} for success by string`, async () => {
      const img = new ImageData()
      fetchImageStub.resolves(img)
      requestStub.params.path = 'kiosk/image.png'
      await router(requestFake, responseFake)
      validationFn(img)
    })
    it(`should ${title} for success by string array`, async () => {
      const img = new ImageData()
      fetchImageStub.resolves(img)
      requestStub.params.path = ['kiosk', 'image.png']
      await router(requestFake, responseFake)
      validationFn(img)
    })
  })
})

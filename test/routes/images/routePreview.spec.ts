'use sanity'

import { expect } from 'chai'
import type { Debugger } from 'debug'

import type { Request, RequestHandler, Response, Application, Router } from 'express'
import type { Server } from 'node:http'
import type { Server as WebSocketServer } from 'socket.io'

import { CacheStorage, Functions, getRouter, ImageData, Imports } from '#routes/images.js'
import Sinon from 'sinon'
import { Cast } from '#testutils/TypeGuards.js'
import { createResponseFake } from '#testutils/Express.js'

const sandbox = Sinon.createSandbox()

describe('routes/images route /preview/*-image.webp', () => {
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
    get: sandbox.stub().returnsThis(),
  }
  let loggerStub = sandbox.stub()
  let router = Cast<(req: Request, res: Response) => Promise<void>>(sandbox.stub())
  let readImageStub = sandbox.stub()
  let rescaleImageStub = sandbox.stub()
  let sendImageStub = sandbox.stub()
  beforeEach(async () => {
    applicationFake = Cast<Application>({})
    serverFake = Cast<Server>({})
    websocketsFake = Cast<WebSocketServer>({})
    routerFake = {
      get: sandbox.stub().returnsThis(),
    }
    sandbox.stub(Imports, 'Router').returns(Cast<Router>(routerFake))
    loggerStub = sandbox.stub()
    sandbox.stub(Imports, 'logger').value(Cast<Debugger>(loggerStub))
    sandbox.stub(Imports, 'handleErrors').callsFake((_logger, action) => Cast<RequestHandler>(action))
    await getRouter(applicationFake, serverFake, websocketsFake)
    const [fn] = routerFake.get
      .getCalls()
      .filter((call) => call.args[0] === '/preview/*path-image.webp')
      .map((call) => call.args[1] as unknown)
    router = Cast<(req: Request, res: Response) => Promise<void>>(fn)
    readImageStub = sandbox.stub(Functions, 'ReadImage').resolves()
    rescaleImageStub = sandbox.stub(Functions, 'RescaleImage').resolves()
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
  afterAll(() => {
    CacheStorage.kioskCache = defaultKioskCache
    CacheStorage.scaledCache = defaultScaledCache
  })
  const successTests: Array<[string, (data: ImageData) => void]> = [
    ['not set response status', () => expect(responseStub.status.callCount).to.equal(0)],
    ['not send json data response', () => expect(responseStub.json.callCount).to.equal(0)],
    ['log invocation once', () => expect(loggerStub.callCount).to.equal(1)],
    ['log invocation with GET-format', () => expect(loggerStub.firstCall.args[0]).to.equal('GET /images/preview %s')],
    ['log invocation with filename', () => expect(loggerStub.firstCall.args[1]).to.equal('/foo/bar.png')],
    ['read image', () => expect(readImageStub.callCount).to.equal(1)],
    ['read image withprovided filename', () => expect(readImageStub.firstCall.args).to.deep.equal(['/foo/bar.png'])],
    ['rescale image', () => expect(rescaleImageStub.callCount).to.equal(1)],
    ['rescale read ImageData', (img) => expect(rescaleImageStub.firstCall.args[0]).to.equal(img)],
    ['rescale image to preview width', () => expect(rescaleImageStub.firstCall.args[1]).to.equal(240)],
    ['rescale image to preview height', () => expect(rescaleImageStub.firstCall.args[2]).to.equal(320)],
    ['rescale image without animation', () => expect(rescaleImageStub.firstCall.args[3]).to.equal(false)],
    ['send image with SendImage()', () => expect(sendImageStub.callCount).to.equal(1)],
    ['send image data with SendImage()', (img) => expect(sendImageStub.firstCall.args[0]).to.equal(img)],
    ['send to response with SendImage()', () => expect(sendImageStub.firstCall.args[1]).to.equal(responseFake)],
  ]
  successTests.forEach(([title, validationFn]) => {
    it(`should ${title} for success by string`, async () => {
      const img = new ImageData()
      readImageStub.resolves(img)
      requestStub.params.path = 'foo/bar.png'
      await router(requestFake, responseFake)
      validationFn(img)
    })
    it(`should ${title} for success by string array`, async () => {
      const img = new ImageData()
      readImageStub.resolves(img)
      requestStub.params.path = ['foo', 'bar.png']
      await router(requestFake, responseFake)
      validationFn(img)
    })
  })
})

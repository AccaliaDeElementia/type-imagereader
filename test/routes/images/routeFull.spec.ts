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

describe('routes/images route /full/*', () => {
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
      .filter((call) => call.args[0] === '/full/*path')
      .map((call) => call.args[1] as unknown)
    router = Cast<(req: Request, res: Response) => Promise<void>>(fn)
    readImageStub = sandbox.stub(Functions, 'ReadImage').resolves()
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
  const testPaths = ['', 'foo/bar.png']
  const successTests: Array<[string, (path: string, image: ImageData) => void]> = [
    ['not generate error status call', () => expect(responseStub.status.callCount).to.equal(0)],
    ['not generate error json call', () => expect(responseStub.json.callCount).to.equal(0)],
    ['log invocation once', () => expect(loggerStub.callCount).to.equal(1)],
    ['log invocation with GET-format', () => expect(loggerStub.firstCall.args[0]).to.equal('GET /images/full %s')],
    ['log invocation with filename', (path) => expect(loggerStub.firstCall.args[1]).to.equal(`/${path}`)],
    ['read image using ReadImage()', () => expect(readImageStub.callCount).to.equal(1)],
    ['read image with filename', (path) => expect(readImageStub.firstCall.args).to.deep.equal([`/${path}`])],
    ['send retrieved image with SendImage()', () => expect(sendImageStub.callCount).to.equal(1)],
    ['send retrieved imageData', (_, data) => expect(sendImageStub.firstCall.args).to.deep.equal([data, responseFake])],
  ]
  const successTestRunner = (
    path: string,
    title: string,
    validation: (path: string, data: ImageData) => void,
  ): void => {
    it(`should ${title} for path '${path}' on success`, async () => {
      requestStub.params.path = path
      const img = new ImageData()
      readImageStub.resolves(img)
      await router(requestFake, responseFake)
      validation(path, img)
    })
  }
  for (const path of testPaths) {
    for (const [title, validation] of successTests) {
      successTestRunner(path, title, validation)
    }
  }
})

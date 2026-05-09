'use sanity'

import { expect } from 'chai'
import type { Debugger } from 'debug'

import type { Request, RequestHandler, Response, Application, Router } from 'express'
import type { Server } from 'node:http'
import type { Server as WebSocketServer } from 'socket.io'

import { CacheStorage, Internals, getRouter, ImageData, Imports } from '#routes/images.js'
import Sinon from 'sinon'
import { cast } from '#testutils/TypeGuards.js'
import { createResponseFake } from '#testutils/Express.js'

const sandbox = Sinon.createSandbox()

describe('routes/images route /full/*', () => {
  const defaultKioskCache = CacheStorage.kioskCache
  const defaultScaledCache = CacheStorage.scaledCache
  let applicationFake = cast<Application>({})
  let serverFake = cast<Server>({})
  let websocketsFake = cast<WebSocketServer>({})
  let requestStub = {
    params: { path: undefined as string | string[] | undefined },
    body: '',
    originalUrl: '',
  }
  let requestFake = cast<Request>(requestStub)
  let { stub: responseStub, fake: responseFake } = createResponseFake()
  let routerFake = {
    get: sandbox.stub().returnsThis(),
  }
  let loggerStub = sandbox.stub()
  let router = cast<(req: Request, res: Response) => Promise<void>>(sandbox.stub())
  let readImageStub = sandbox.stub()
  let sendImageStub = sandbox.stub()
  beforeEach(async () => {
    applicationFake = cast<Application>({})
    serverFake = cast<Server>({})
    websocketsFake = cast<WebSocketServer>({})
    routerFake = {
      get: sandbox.stub().returnsThis(),
    }
    sandbox.stub(Imports, 'Router').returns(cast<Router>(routerFake))
    loggerStub = sandbox.stub()
    sandbox.stub(Imports, 'logger').value(cast<Debugger>(loggerStub))
    sandbox.stub(Imports, 'handleErrors').callsFake((_logger, action) => cast<RequestHandler>(action))
    await getRouter(applicationFake, serverFake, websocketsFake)
    const [fn] = routerFake.get
      .getCalls()
      .filter((call) => call.args[0] === '/full/*path')
      .map((call) => call.args[1] as unknown)
    router = cast<(req: Request, res: Response) => Promise<void>>(fn)
    readImageStub = sandbox.stub(Internals, 'readImage').resolves()
    sendImageStub = sandbox.stub(Internals, 'sendImage').resolves()
    requestStub = {
      params: { path: undefined },
      body: '',
      originalUrl: '',
    }
    requestFake = cast<Request>(requestStub)
    ;({ stub: responseStub, fake: responseFake } = createResponseFake())
  })
  afterEach(() => {
    sandbox.restore()
  })
  afterAll(() => {
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
    ['read image using readImage()', () => expect(readImageStub.callCount).to.equal(1)],
    ['read image with filename', (path) => expect(readImageStub.firstCall.args).to.deep.equal([`/${path}`])],
    ['send retrieved image with sendImage()', () => expect(sendImageStub.callCount).to.equal(1)],
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

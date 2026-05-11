'use sanity'

import type { Debugger } from 'debug'

import type { Request, RequestHandler, Response, Application, Router } from 'express'
import type { Server } from 'node:http'
import type { Server as WebSocketServer } from 'socket.io'

import { CacheStorage, Internals, getRouter, ImageData, Imports } from '#routes/images.js'
import Sinon from 'sinon'
import { cast } from '#testutils/typeGuards.js'
import { createResponseFake } from '#testutils/express.js'

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
  testPaths.forEach((path) => {
    describe(`for path '${path}'`, () => {
      let img: ImageData = new ImageData()
      beforeEach(async () => {
        requestStub.params.path = path
        img = new ImageData()
        readImageStub.resolves(img)
        await router(requestFake, responseFake)
      })
      it('should not generate error status call', () => {
        expect(responseStub.status.callCount).toBe(0)
      })
      it('should not generate error json call', () => {
        expect(responseStub.json.callCount).toBe(0)
      })
      it('should log invocation once', () => {
        expect(loggerStub.callCount).toBe(1)
      })
      it('should log invocation with GET-format', () => {
        expect(loggerStub.firstCall.args[0]).toBe('GET /images/full %s')
      })
      it('should log invocation with filename', () => {
        expect(loggerStub.firstCall.args[1]).toBe(`/${path}`)
      })
      it('should read image using readImage()', () => {
        expect(readImageStub.callCount).toBe(1)
      })
      it('should read image with filename', () => {
        expect(readImageStub.firstCall.args).toEqual([`/${path}`])
      })
      it('should send retrieved image with sendImage()', () => {
        expect(sendImageStub.callCount).toBe(1)
      })
      it('should send retrieved imageData', () => {
        expect(sendImageStub.firstCall.args).toEqual([img, responseFake])
      })
    })
  })
})

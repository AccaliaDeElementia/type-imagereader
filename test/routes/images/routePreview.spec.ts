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

describe('routes/images route /preview/*-image.webp', () => {
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
  let rescaleImageStub = sandbox.stub()
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
      .filter((call) => call.args[0] === '/preview/*path-image.webp')
      .map((call) => call.args[1] as unknown)
    router = cast<(req: Request, res: Response) => Promise<void>>(fn)
    readImageStub = sandbox.stub(Internals, 'readImage').resolves()
    rescaleImageStub = sandbox.stub(Internals, 'rescaleImage').resolves()
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

  const pathVariants: Array<[string, string | string[]]> = [
    ['by string', 'foo/bar.png'],
    ['by string array', ['foo', 'bar.png']],
  ]
  pathVariants.forEach(([label, pathValue]) => {
    describe(`when path is provided ${label}`, () => {
      let img: ImageData = new ImageData()
      beforeEach(async () => {
        img = new ImageData()
        readImageStub.resolves(img)
        requestStub.params.path = pathValue
        await router(requestFake, responseFake)
      })
      it('should not set response status', () => {
        expect(responseStub.status.callCount).toBe(0)
      })
      it('should not send json data response', () => {
        expect(responseStub.json.callCount).toBe(0)
      })
      it('should log invocation once', () => {
        expect(loggerStub.callCount).toBe(1)
      })
      it('should log invocation with GET-format', () => {
        expect(loggerStub.firstCall.args[0]).toBe('GET /images/preview %s')
      })
      it('should log invocation with filename', () => {
        expect(loggerStub.firstCall.args[1]).toBe('/foo/bar.png')
      })
      it('should read image', () => {
        expect(readImageStub.callCount).toBe(1)
      })
      it('should read image with provided filename', () => {
        expect(readImageStub.firstCall.args).toEqual(['/foo/bar.png'])
      })
      it('should rescale image', () => {
        expect(rescaleImageStub.callCount).toBe(1)
      })
      it('should rescale read ImageData', () => {
        expect(rescaleImageStub.firstCall.args[0]).toBe(img)
      })
      it('should rescale image to preview width', () => {
        expect(rescaleImageStub.firstCall.args[1]).toBe(240)
      })
      it('should rescale image to preview height', () => {
        expect(rescaleImageStub.firstCall.args[2]).toBe(320)
      })
      it('should rescale image without animation', () => {
        expect(rescaleImageStub.firstCall.args[3]).toBe(false)
      })
      it('should send image with sendImage()', () => {
        expect(sendImageStub.callCount).toBe(1)
      })
      it('should send image data with sendImage()', () => {
        expect(sendImageStub.firstCall.args[0]).toBe(img)
      })
      it('should send to response with sendImage()', () => {
        expect(sendImageStub.firstCall.args[1]).toBe(responseFake)
      })
    })
  })
})

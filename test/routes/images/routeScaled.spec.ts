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

interface ReqParams {
  path: string | string[] | undefined
  width?: unknown
  height?: unknown
}

interface Req {
  params: ReqParams
  body: string
  originalUrl: string
}

describe('routes/images route /scaled/:width/:height/*-image.webp', () => {
  const defaultKioskCache = CacheStorage.kioskCache
  const defaultScaledCache = CacheStorage.scaledCache
  let applicationFake = cast<Application>({})
  let serverFake = cast<Server>({})
  let websocketsFake = cast<WebSocketServer>({})
  let requestStub: Req = {
    params: {
      path: undefined,
      width: 0,
      height: 0,
    },
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
  let fetchImageStub = sandbox.stub()
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
      .filter((call) => call.args[0] === '/scaled/:width/:height/*path-image.webp')
      .map((call) => call.args[1] as unknown)
    router = cast<(req: Request, res: Response) => Promise<void>>(fn)
    fetchImageStub = sandbox.stub(CacheStorage.scaledCache, 'fetch').resolves()
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

  describe('on successful response', () => {
    let img: ImageData = new ImageData()
    beforeEach(async () => {
      img = new ImageData()
      fetchImageStub.resolves(img)
      requestStub.params = { path: 'full/image/test.png', width: '123', height: '456' }
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
      expect(loggerStub.firstCall.args[0]).toBe('GET /images/scaled %dx%d %s')
    })
    it('should log invocation with width arg', () => {
      expect(loggerStub.firstCall.args[1]).toBe(123)
    })
    it('should log invocation with height arg', () => {
      expect(loggerStub.firstCall.args[2]).toBe(456)
    })
    it('should log invocation with filename arg', () => {
      expect(loggerStub.firstCall.args[3]).toBe('/full/image/test.png')
    })
    it('should call fetch on the cache', () => {
      expect(fetchImageStub.callCount).toBe(1)
    })
    it('should fetch with expected path', () => {
      expect(fetchImageStub.firstCall.args[0]).toBe('/full/image/test.png')
    })
    it('should fetch with expected width', () => {
      expect(fetchImageStub.firstCall.args[1]).toBe(123)
    })
    it('should fetch with expected height', () => {
      expect(fetchImageStub.firstCall.args[2]).toBe(456)
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

  const eWidthMissing = 'width parameter must be provided'
  const eWidthBad = 'width parameter must be positive integer'
  const eHeightMissing = 'height parameter must be provided'
  const eHeightBad = 'height parameter must be positive integer'
  const validationErrors: Array<[string, ReqParams, string]> = [
    ['missing width', { path: '', height: '10' }, eWidthMissing],
    ['null width', { path: '', width: null, height: '10' }, eWidthBad],
    ['undefined width', { path: '', width: undefined, height: '10' }, eWidthMissing],
    ['blank width', { path: '', width: '', height: '10' }, eWidthBad],
    ['non number width', { path: '', width: 'foo', height: '10' }, eWidthBad],
    ['leading zeros width', { path: '', width: '0100', height: '10' }, eWidthBad],
    ['decimal width', { path: '', width: '3.14159', height: '10' }, eWidthBad],
    ['negative width', { path: '', width: '-100', height: '10' }, eWidthBad],
    ['explicit positive width', { path: '', width: '+100', height: '10' }, eWidthBad],
    ['zero width', { path: '', width: '0', height: '10' }, eWidthBad],
    ['missing height', { path: '', width: '10' }, eHeightMissing],
    ['null height', { path: '', height: null, width: '10' }, eHeightBad],
    ['undefined height', { path: '', height: undefined, width: '10' }, eHeightMissing],
    ['blank height', { path: '', height: '', width: '10' }, eHeightBad],
    ['non number height', { path: '', height: 'foo', width: '10' }, eHeightBad],
    ['leading zeros height', { path: '', height: '0100', width: '10' }, eHeightBad],
    ['decimal height', { path: '', height: '3.14159', width: '10' }, eHeightBad],
    ['zero height', { path: '', height: '0', width: '10' }, eHeightBad],
    ['negative height', { path: '', height: '-100', width: '10' }, eHeightBad],
    ['explicit positive height', { path: '', height: '+100', width: '10' }, eHeightBad],
  ]
  const validationTests: Array<[string, (msg: string) => void]> = [
    [
      'not fetch image',
      () => {
        expect(fetchImageStub.callCount).toBe(0)
      },
    ],
    [
      'not send image',
      () => {
        expect(sendImageStub.callCount).toBe(0)
      },
    ],
    [
      'not log message',
      () => {
        expect(loggerStub.callCount).toBe(0)
      },
    ],
    [
      'send response status',
      () => {
        expect(responseStub.status.callCount).toBe(1)
      },
    ],
    [
      'send BAD_REQUEST status code',
      () => {
        expect(responseStub.status.firstCall.args).toEqual([400])
      },
    ],
    [
      'send json response data',
      () => {
        expect(responseStub.json.callCount).toBe(1)
      },
    ],
    [
      'send error message in json response',
      (msg) => {
        expect(responseStub.json.firstCall.args).toEqual([
          {
            error: {
              code: 'E_BAD_REQUEST',
              message: msg,
            },
          },
        ])
      },
    ],
  ]
  validationErrors.forEach(([conditionTitle, params, message]) => {
    describe(`when ${conditionTitle}`, () => {
      beforeEach(async () => {
        requestStub.params = params
        requestStub.params.path = 'foo/bar/baz.txt'
        requestStub.originalUrl = '/full/image.png'
        requestStub.body = 'REQUEST BODY'
        await router(requestFake, responseFake)
      })
      validationTests.forEach(([title, validationFn]) => {
        it(`should ${title}`, () => {
          validationFn(message)
        })
      })
    })
  })
})

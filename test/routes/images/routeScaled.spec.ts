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
  let applicationFake = Cast<Application>({})
  let serverFake = Cast<Server>({})
  let websocketsFake = Cast<WebSocketServer>({})
  let requestStub: Req = {
    params: {
      path: undefined,
      width: 0,
      height: 0,
    },
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
  let fetchImageStub = sandbox.stub()
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
      .filter((call) => call.args[0] === '/scaled/:width/:height/*path-image.webp')
      .map((call) => call.args[1] as unknown)
    router = Cast<(req: Request, res: Response) => Promise<void>>(fn)
    fetchImageStub = sandbox.stub(CacheStorage.scaledCache, 'fetch').resolves()
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
    [
      'log invocation with GET-format',
      () => expect(loggerStub.firstCall.args[0]).to.equal('GET /images/scaled %dx%d %s'),
    ],
    ['log invocation with width arg', () => expect(loggerStub.firstCall.args[1]).to.equal(123)],
    ['log invocation with height arg', () => expect(loggerStub.firstCall.args[2]).to.equal(456)],
    ['log invocation with filename arg', () => expect(loggerStub.firstCall.args[3]).to.equal('/full/image/test.png')],
    ['fetch image from cache', () => expect(fetchImageStub.callCount).to.equal(1)],
    ['fetch image from cache', () => expect(fetchImageStub.firstCall.args[0]).to.equal('/full/image/test.png')],
    ['fetch image from cache', () => expect(fetchImageStub.firstCall.args[1]).to.equal(123)],
    ['fetch image from cache', () => expect(fetchImageStub.firstCall.args[2]).to.equal(456)],
    ['send image with SendImage()', () => expect(sendImageStub.callCount).to.equal(1)],
    ['send image data with SendImage()', (data) => expect(sendImageStub.firstCall.args[0]).to.equal(data)],
    ['send to response with SendImage()', () => expect(sendImageStub.firstCall.args[1]).to.equal(responseFake)],
  ]
  successTests.forEach(([title, validationFn]) => {
    it(`should ${title} on success`, async () => {
      const img = new ImageData()
      fetchImageStub.resolves(img)
      requestStub.params = { path: 'full/image/test.png', width: '123', height: '456' }
      await router(requestFake, responseFake)
      validationFn(img)
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
    ['not fetch image', () => expect(fetchImageStub.callCount).to.equal(0)],
    ['not send image', () => expect(sendImageStub.callCount).to.equal(0)],
    ['not log message', () => expect(loggerStub.callCount).to.equal(0)],
    ['send response status', () => expect(responseStub.status.callCount).to.equal(1)],
    ['send BAD_REQUEST status code', () => expect(responseStub.status.firstCall.args).to.deep.equal([400])],
    ['send json response data', () => expect(responseStub.json.callCount).to.equal(1)],
    [
      'send json response data',
      (msg) =>
        expect(responseStub.json.firstCall.args).to.deep.equal([
          {
            error: {
              code: 'E_BAD_REQUEST',
              message: msg,
            },
          },
        ]),
    ],
  ]
  const executeValidationTest = (
    title: string,
    params: ReqParams,
    message: string,
    validationFn: (msg: string) => void,
  ): void => {
    it(title, async () => {
      requestStub.params = params
      requestStub.params.path = 'foo/bar/baz.txt'
      requestStub.originalUrl = '/full/image.png'
      requestStub.body = 'REQUEST BODY'
      await router(requestFake, responseFake)
      validationFn(message)
    })
  }
  for (const [conditionTitle, params, message] of validationErrors) {
    for (const [validationTitle, validationFn] of validationTests) {
      executeValidationTest(`should ${validationTitle} for ${conditionTitle}`, params, message, validationFn)
    }
  }
})

'use sanity'

import { expect } from 'chai'
import type { Debugger } from 'debug'

import type { Request, Response, Application, Router } from 'express'
import type { Server } from 'node:http'
import type { Server as WebSocketServer } from 'socket.io'

import { CacheStorage, Functions, getRouter, ImageData, Imports } from '../../../routes/images'
import Sinon from 'sinon'
import { Cast } from '../../testutils/TypeGuards'

interface ReqParams {
  '0': string
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
      '0': '',
      width: 0,
      height: 0,
    },
    body: '',
    originalUrl: '',
  }
  let requestFake = Cast<Request>(requestStub)
  let responseStub = {
    status: Sinon.stub().returnsThis(),
    json: Sinon.stub().returnsThis(),
  }
  let responseFake = Cast<Response>(responseStub)
  let routerFake = {
    get: Sinon.stub().returnsThis(),
  }
  let getRouterStub = Sinon.stub()
  let loggerStub = Sinon.stub()
  let debugStub = Sinon.stub()
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
    getRouterStub = Sinon.stub(Imports, 'Router').returns(Cast<Router>(routerFake))
    loggerStub = Sinon.stub()
    debugStub = Sinon.stub(Imports, 'debug').returns(Cast<Debugger>(loggerStub))
    await getRouter(applicationFake, serverFake, websocketsFake)
    const fn = routerFake.get
      .getCalls()
      .filter((call) => call.args[0] === '/scaled/:width/:height/*-image.webp')
      .map((call) => call.args[1] as unknown)[0]
    router = Cast<(req: Request, res: Response) => Promise<void>>(fn)
    fetchImageStub = Sinon.stub(CacheStorage.scaledCache, 'fetch').resolves()
    sendImageStub = Sinon.stub(Functions, 'SendImage').resolves()
    requestStub = {
      params: [''],
      body: '',
      originalUrl: '',
    }
    requestFake = Cast<Request>(requestStub)
    responseStub = {
      status: Sinon.stub().returnsThis(),
      json: Sinon.stub().returnsThis(),
    }
    responseFake = Cast<Response>(responseStub)
  })
  afterEach(() => {
    sendImageStub.restore()
    fetchImageStub.restore()
    debugStub.restore()
    getRouterStub.restore()
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
      requestStub.params = { '0': 'full/image/test.png', width: '123', height: '456' }
      await router(requestFake, responseFake)
      validationFn(img)
    })
  })
  const eWidthMissing = 'width parameter must be provided'
  const eWidthBad = 'width parameter must be positive integer'
  const eHeightMissing = 'height parameter must be provided'
  const eHeightBad = 'height parameter must be positive integer'
  const validationErrors: Array<[string, ReqParams, string]> = [
    ['missing width', { '0': '', height: '10' }, eWidthMissing],
    ['null width', { '0': '', width: null, height: '10' }, eWidthMissing],
    ['undefined width', { '0': '', width: undefined, height: '10' }, eWidthMissing],
    ['blank width', { '0': '', width: '', height: '10' }, eWidthBad],
    ['non number width', { '0': '', width: 'foo', height: '10' }, eWidthBad],
    ['leading zeros width', { '0': '', width: '0100', height: '10' }, eWidthBad],
    ['decimal width', { '0': '', width: '3.14159', height: '10' }, eWidthBad],
    ['negative width', { '0': '', width: '-100', height: '10' }, eWidthBad],
    ['zero width', { '0': '', width: '0', height: '10' }, eWidthBad],
    ['missing height', { '0': '', width: '10' }, eHeightMissing],
    ['null height', { '0': '', height: null, width: '10' }, eHeightMissing],
    ['undefined height', { '0': '', height: undefined, width: '10' }, eHeightMissing],
    ['blank height', { '0': '', height: '', width: '10' }, eHeightBad],
    ['non number height', { '0': '', height: 'foo', width: '10' }, eHeightBad],
    ['leading zeros height', { '0': '', height: '0100', width: '10' }, eHeightBad],
    ['decimal height', { '0': '', height: '3.14159', width: '10' }, eHeightBad],
    ['zero height', { '0': '', height: '0', width: '10' }, eHeightBad],
    ['negative height', { '0': '', height: '-100', width: '10' }, eHeightBad],
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
      requestStub.params[0] = 'foo/bar/baz.txt'
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

  const errorTriggers: Array<[string, (err: Error) => void]> = [
    ['cache Fetch() throws', (err) => fetchImageStub.throws(err)],
    ['cache Fetch() rejects', (err) => fetchImageStub.rejects(err)],
    ['SendImage() throws', (err) => sendImageStub.throws(err)],
    ['SendImage() throws', (err) => sendImageStub.throws(err)],
  ]
  const errorTests: Array<[string, (err: Error) => void]> = [
    ['call response status() to set status', () => expect(responseStub.status.callCount).to.equal(1)],
    ['set error response status code', () => expect(responseStub.status.firstCall.args).to.deep.equal([500])],
    ['call response json() to render error', () => expect(responseStub.json.callCount).to.equal(1)],
    [
      'set response error payload',
      () =>
        expect(responseStub.json.firstCall.args).to.deep.equal([
          {
            error: {
              code: 'E_INTERNAL_ERROR',
              message: 'Internal Server Error',
            },
          },
        ]),
    ],
    ['log multiple messages', () => expect(loggerStub.callCount).to.equal(2)],
    ['log error message first', () => expect(loggerStub.firstCall.args).to.have.lengthOf(2)],
    [
      'log simple error message',
      () => expect(loggerStub.firstCall.args).to.deep.equal(['Error rendering: /full/image.png', 'REQUEST BODY']),
    ],
    ['log exception second', () => expect(loggerStub.secondCall.args).to.have.lengthOf(1)],
    ['log exception object exactly', (err) => expect(loggerStub.secondCall.args[0]).to.equal(err)],
  ]
  const errorTestRunner = (
    triggerName: string,
    triggerFn: (e: Error) => void,
    errorTitle: string,
    validation: (e: Error) => void,
  ): void => {
    it(`should ${errorTitle} when ${triggerName}`, async () => {
      requestStub.params = { '0': 'foo/bar/baz.txt', height: '10', width: '10' }
      requestStub.originalUrl = '/full/image.png'
      requestStub.body = 'REQUEST BODY'
      const err = new Error('FOO')
      triggerFn(err)
      await router(requestFake, responseFake)
      validation(err)
    })
  }
  for (const [triggerName, triggerFn] of errorTriggers) {
    for (const [errorTitle, validation] of errorTests) {
      errorTestRunner(triggerName, triggerFn, errorTitle, validation)
    }
  }
})

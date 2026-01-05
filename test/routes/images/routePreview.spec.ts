'use sanity'

import { expect } from 'chai'
import type { Debugger } from 'debug'

import type { Request, Response, Application, Router } from 'express'
import type { Server } from 'node:http'
import type { Server as WebSocketServer } from 'socket.io'

import { CacheStorage, Functions, getRouter, ImageData, Imports } from '../../../routes/images'
import Sinon from 'sinon'
import { Cast } from '../../testutils/TypeGuards'

describe('routes/images route /preview/*-image.webp', () => {
  const defaultKioskCache = CacheStorage.kioskCache
  const defaultScaledCache = CacheStorage.scaledCache
  let applicationFake = Cast<Application>({})
  let serverFake = Cast<Server>({})
  let websocketsFake = Cast<WebSocketServer>({})
  let requestStub = {
    params: [''],
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
  let readImageStub = Sinon.stub()
  let rescaleImageStub = Sinon.stub()
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
      .filter((call) => call.args[0] === '/preview/*-image.webp')
      .map((call) => call.args[1] as unknown)[0]
    router = Cast<(req: Request, res: Response) => Promise<void>>(fn)
    readImageStub = Sinon.stub(Functions, 'ReadImage').resolves()
    rescaleImageStub = Sinon.stub(Functions, 'RescaleImage').resolves()
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
    rescaleImageStub.restore()
    readImageStub.restore()
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
    it(`should ${title} for success`, async () => {
      const img = new ImageData()
      readImageStub.resolves(img)
      requestStub.params[0] = 'foo/bar.png'
      await router(requestFake, responseFake)
      validationFn(img)
    })
  })
  const errorTriggers: Array<[string, (err: Error) => void]> = [
    ['ReadImage() throws', (err) => readImageStub.throws(err)],
    ['ReadImage() throws', (err) => readImageStub.throws(err)],
    ['RescaleImage() throws', (err) => rescaleImageStub.throws(err)],
    ['RescaleImage() throws', (err) => rescaleImageStub.throws(err)],
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
      () => expect(loggerStub.firstCall.args).to.deep.equal(['Error rendering: /preview/image.png', 'REQUEST BODY']),
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
      requestStub.params = ['foo/bar/baz.txt']
      requestStub.originalUrl = '/preview/image.png'
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

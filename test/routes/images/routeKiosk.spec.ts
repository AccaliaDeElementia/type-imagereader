'use sanity'

import { expect } from 'chai'
import type { Debugger } from 'debug'

import type { Request, Response, Application, Router } from 'express'
import type { Server } from 'node:http'
import type { Server as WebSocketServer } from 'socket.io'

import { CacheStorage, Functions, getRouter, ImageData, Imports } from '../../../routes/images'
import Sinon from 'sinon'
import { Cast } from '../../testutils/TypeGuards'

describe('routes/images route /kiosk/*-image.webp', () => {
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
      .filter((call) => call.args[0] === '/kiosk/*-image.webp')
      .map((call) => call.args[1] as unknown)[0]
    router = Cast<(req: Request, res: Response) => Promise<void>>(fn)
    fetchImageStub = Sinon.stub(CacheStorage.kioskCache, 'fetch').resolves()
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
    ['fetch image filename from cache', () => expect(fetchImageStub.firstCall.args[0]).to.equal('/kiosk/image.png')],
    ['rescale image to preview width', () => expect(fetchImageStub.firstCall.args[1]).to.equal(1280)],
    ['rescale image to preview height', () => expect(fetchImageStub.firstCall.args[2]).to.equal(800)],
    ['send image with SendImage()', () => expect(sendImageStub.callCount).to.equal(1)],
    ['send image data with SendImage()', (img) => expect(sendImageStub.firstCall.args[0]).to.equal(img)],
    ['send to response with SendImage()', () => expect(sendImageStub.firstCall.args[1]).to.equal(responseFake)],
  ]
  successTests.forEach(([title, validationFn]) => {
    it(`should ${title} for success`, async () => {
      const img = new ImageData()
      fetchImageStub.resolves(img)
      requestStub.params[0] = 'kiosk/image.png'
      await router(requestFake, responseFake)
      validationFn(img)
    })
  })
  const errorTriggers: Array<[string, (err: Error) => void]> = [
    ['cache fetch() throws', (err) => fetchImageStub.throws(err)],
    ['ache fetch() throws', (err) => fetchImageStub.throws(err)],
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
      () => expect(loggerStub.firstCall.args).to.deep.equal(['Error rendering: /kiosk/image.png', 'REQUEST BODY']),
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
      requestStub.originalUrl = '/kiosk/image.png'
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

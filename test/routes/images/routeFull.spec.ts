'use sanity'

import { expect } from 'chai'
import type { Debugger } from 'debug'

import type { Request, Response, Application, Router } from 'express'
import type { Server } from 'node:http'
import type { Server as WebSocketServer } from 'socket.io'

import { CacheStorage, Functions, getRouter, ImageData, Imports } from '../../../routes/images'
import Sinon from 'sinon'
import { Cast } from '../../testutils/TypeGuards'

describe('routes/images route /full/*', () => {
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
      .filter((call) => call.args[0] === '/full/*')
      .map((call) => call.args[1] as unknown)[0]
    router = Cast<(req: Request, res: Response) => Promise<void>>(fn)
    readImageStub = Sinon.stub(Functions, 'ReadImage').resolves()
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
    readImageStub.restore()
    debugStub.restore()
    getRouterStub.restore()
  })
  after(() => {
    CacheStorage.kioskCache = defaultKioskCache
    CacheStorage.scaledCache = defaultScaledCache
  })
  const testPaths = ['', 'foo/bar.png']
  const successTests: Array<[string, (path: string, image: ImageData) => void]> = [
    ['not generate error status call', () => expect(responseStub.status.callCount).to.equal(0)],
    ['not generate error json call', () => expect(responseStub.json.callCount).to.equal(0)],
    ['not generate error logging', () => expect(loggerStub.callCount).to.equal(0)],
    ['read image using ReadImage()', () => expect(readImageStub.callCount).to.equal(1)],
    ['read image with filename', (path) => expect(readImageStub.firstCall.args).to.deep.equal([`/${path}`])],
    ['send retrieved image with SendImage()', () => expect(sendImageStub.callCount).to.equal(1)],
    ['send retrieved imageData', (_, data) => expect(sendImageStub.firstCall.args).to.deep.equal([data, responseFake])],
  ]
  const errorTriggers: Array<[string, (err: Error) => void]> = [
    ['ReadImage() throws', (err) => readImageStub.throws(err)],
    ['ReadImage() rejects', (err) => readImageStub.rejects(err)],
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
  const successTestRunner = (
    path: string,
    title: string,
    validation: (path: string, data: ImageData) => void,
  ): void => {
    it(`should ${title} for path '${path}' on success`, async () => {
      requestStub.params[0] = path
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
  const errorTestRunner = (
    triggerName: string,
    triggerFn: (e: Error) => void,
    errorTitle: string,
    validation: (e: Error) => void,
  ): void => {
    it(`should ${errorTitle} when ${triggerName}`, async () => {
      requestStub.params[0] = 'foo/bar/baz.txt'
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

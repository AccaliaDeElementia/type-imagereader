'use sanity'

import { expect } from 'chai'
import Sinon from 'sinon'
import type { Application, Response as ExpressResponse, Router } from 'express'
import type { Server } from 'node:http'
import type { Server as WebSocketServer } from 'socket.io'
import { getRouter, Imports } from '#routes/api'
import persistance from '#utils/persistance'
import { StatusCodes } from 'http-status-codes'
import { Cast } from '#testutils/TypeGuards'
import type { Debugger } from 'debug'
import { createResponseFake } from '#testutils/Express'

const sandbox = Sinon.createSandbox()

type RequestHandler = (req: Request, res: ExpressResponse) => Promise<void>

describe('routes/api route GET /', () => {
  let requestStub = {
    body: { Body: -1 },
    originalUrl: '/',
  }
  let requestFake = Cast<Request>(requestStub)
  let { stub: responseStub, fake: responseFake } = createResponseFake()
  let routeHandler = Cast<RequestHandler>(Sinon.stub().throws('WRONG CALL'))
  let loggerStub = Sinon.stub()
  Sinon.stub()
  beforeEach(async () => {
    requestStub = {
      body: { Body: -1 },
      originalUrl: '/',
    }
    requestFake = Cast<Request>(requestStub)
    ;({ stub: responseStub, fake: responseFake } = createResponseFake())
    const getFn = Sinon.stub()
    const InitializeStub = sandbox.stub(persistance, 'initialize').resolves()
    const MakeRouterStub = sandbox.stub(Imports, 'Router').returns(
      Cast<Router>({
        get: getFn,
        post: Sinon.stub(),
      }),
    )
    loggerStub = Sinon.stub()
    sandbox.stub(Imports, 'debug').returns(Cast<Debugger>(loggerStub))
    await getRouter(Cast<Application>(null), Cast<Server>(null), Cast<WebSocketServer>(null))
    routeHandler = Cast(
      getFn.getCalls().find((call) => call.args[0] === '/')?.args[1],
      (fn): fn is RequestHandler => fn !== null,
    )
    InitializeStub.restore()
    MakeRouterStub.restore()
  })
  afterEach(() => {
    sandbox.restore()
  })
  it('should call status once', async () => {
    await routeHandler(requestFake, responseFake)
    expect(responseStub.status.callCount).to.equal(1)
  })
  it('should return status OK', async () => {
    await routeHandler(requestFake, responseFake)
    expect(responseStub.status.firstCall.args).to.deep.equal([StatusCodes.OK])
  })
  it('should call json once', async () => {
    await routeHandler(requestFake, responseFake)
    expect(responseStub.json.callCount).to.equal(1)
  })
  it('should return JSON data', async () => {
    await routeHandler(requestFake, responseFake)
    expect(responseStub.json.firstCall.args).to.deep.equal([{ title: 'API' }])
  })
  it('should call response status on error', async () => {
    const err = new Error('Evil Error!')
    responseStub.status.onFirstCall().throws(err)
    await routeHandler(requestFake, responseFake)
    expect(responseStub.status.callCount).to.be.greaterThanOrEqual(2)
  })
  it('should set INTERNAL_SERVER_ERROR status on error', async () => {
    const err = new Error('Evil Error!')
    responseStub.status.onFirstCall().throws(err)
    await routeHandler(requestFake, responseFake)
    expect(responseStub.status.lastCall.args).to.deep.equal([StatusCodes.INTERNAL_SERVER_ERROR])
  })
  it('should set E_INTERNAL_ERROR json payload on error', async () => {
    const err = new Error('Evil Error!')
    responseStub.status.onFirstCall().throws(err)
    await routeHandler(requestFake, responseFake)
    expect(responseStub.json.lastCall.args).to.deep.equal([
      { error: { code: 'E_INTERNAL_ERROR', message: 'Internal Server Error' } },
    ])
  })
  it('should call logger on error', async () => {
    responseStub.status.onFirstCall().throws(new Error('Evil Error!'))
    requestStub.originalUrl = '/'
    await routeHandler(requestFake, responseFake)
    expect(loggerStub.callCount).to.be.greaterThanOrEqual(1)
  })
  it('should log two arguments on first log call on error', async () => {
    responseStub.status.onFirstCall().throws(new Error('Evil Error!'))
    requestStub.originalUrl = '/'
    await routeHandler(requestFake, responseFake)
    expect(loggerStub.firstCall.args).to.have.lengthOf(2)
  })
  it('should log rendered url as first log argument on error', async () => {
    responseStub.status.onFirstCall().throws(new Error('Evil Error!'))
    requestStub.originalUrl = '/'
    await routeHandler(requestFake, responseFake)
    expect(loggerStub.firstCall.args[0]).to.equal('Error rendering: /')
  })
  it('should log request body as second log argument on error', async () => {
    const bodyData = { Body: Math.random() }
    responseStub.status.onFirstCall().throws(new Error('Evil Error!'))
    requestStub.body = bodyData
    requestStub.originalUrl = '/'
    await routeHandler(requestFake, responseFake)
    expect(loggerStub.firstCall.args[1]).to.equal(bodyData)
  })
  it('should call logger at least once on error', async () => {
    responseStub.status.onFirstCall().throws(new Error('Evil Error!'))
    await routeHandler(requestFake, responseFake)
    expect(loggerStub.callCount).to.be.greaterThanOrEqual(1)
  })
  it('should log one argument on last log call on error', async () => {
    responseStub.status.onFirstCall().throws(new Error('Evil Error!'))
    await routeHandler(requestFake, responseFake)
    expect(loggerStub.lastCall.args).to.have.lengthOf(1)
  })
  it('should log error object as last log argument on error', async () => {
    const err = new Error('Evil Error!')
    responseStub.status.onFirstCall().throws(err)
    await routeHandler(requestFake, responseFake)
    expect(loggerStub.lastCall.args[0]).to.equal(err)
  })
})

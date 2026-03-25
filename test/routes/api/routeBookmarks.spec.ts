'use sanity'

import { expect } from 'chai'
import Sinon from 'sinon'
import type { Application, Response as ExpressResponse, Router } from 'express'
import type { Server } from 'node:http'
import type { Server as WebSocketServer } from 'socket.io'
import { getRouter, Imports } from '#routes/api'
import { Functions } from '#routes/apiFunctions'
import persistance from '#utils/persistance'
import { StatusCodes } from 'http-status-codes'
import { Cast, StubToKnex } from '#testutils/TypeGuards'
import type { Debugger } from 'debug'
import { createResponseFake } from '#testutils/Express'

const sandbox = Sinon.createSandbox()

type RequestHandler = (req: Request, res: ExpressResponse) => Promise<void>

describe('routes/api route GET /bookmarks', () => {
  let getBookmarkStub = Sinon.stub()
  let requestStub = {
    body: {},
    originalUrl: '/',
  }
  let requestFake = Cast<Request>(requestStub)
  let { stub: responseStub, fake: responseFake } = createResponseFake()
  let routeHandler = Cast<RequestHandler>(Sinon.stub().throws('WRONG CALL'))
  let loggerStub = Sinon.stub()
  Sinon.stub()
  let knexFake = { Knex: Math.random() }
  beforeEach(async () => {
    requestStub = {
      body: {},
      originalUrl: '/',
    }
    requestFake = Cast<Request>(requestStub)
    ;({ stub: responseStub, fake: responseFake } = createResponseFake())
    const getFn = Sinon.stub()
    knexFake = { Knex: Math.random() }
    const InitializeStub = sandbox.stub(persistance, 'initialize').resolves(StubToKnex(knexFake))
    const MakeRouterStub = sandbox.stub(Imports, 'Router').returns(
      Cast<Router>({
        get: getFn,
        post: Sinon.stub(),
      }),
    )
    getBookmarkStub = sandbox.stub(Functions, 'GetBookmarks').resolves()
    loggerStub = Sinon.stub()
    sandbox.stub(Imports, 'debug').returns(Cast<Debugger>(loggerStub))
    await getRouter(Cast<Application>(null), Cast<Server>(null), Cast<WebSocketServer>(null))
    const fn = getFn.getCalls().find((call) => call.args[0] === '/bookmarks')?.args[1] as unknown
    routeHandler = Cast(fn, (fn): fn is RequestHandler => typeof fn === 'function')
    InitializeStub.restore()
    MakeRouterStub.restore()
  })

  afterEach(() => {
    sandbox.restore()
  })
  it('should call json once when returning bookmarks', async () => {
    getBookmarkStub.resolves({ Bookmarks: Math.random() })
    await routeHandler(requestFake, responseFake)
    expect(responseStub.json.callCount).to.equal(1)
  })
  it('should call json with 1 argument', async () => {
    getBookmarkStub.resolves({ Bookmarks: Math.random() })
    await routeHandler(requestFake, responseFake)
    expect(responseStub.json.firstCall.args).to.have.lengthOf(1)
  })
  it('should pass bookmarks to json response', async () => {
    const bookmarks = { Bookmarks: Math.random() }
    getBookmarkStub.resolves(bookmarks)
    await routeHandler(requestFake, responseFake)
    expect(responseStub.json.firstCall.args[0]).to.equal(bookmarks)
  })
  it('should call GetBookmarks once', async () => {
    await routeHandler(requestFake, responseFake)
    expect(getBookmarkStub.callCount).to.equal(1)
  })
  it('should call GetBookmarks with 1 argument', async () => {
    await routeHandler(requestFake, responseFake)
    expect(getBookmarkStub.firstCall.args).to.have.lengthOf(1)
  })
  it('should pass knex to GetBookmarks', async () => {
    await routeHandler(requestFake, responseFake)
    expect(getBookmarkStub.firstCall.args[0]).to.equal(knexFake)
  })
  it('should call response status on error', async () => {
    getBookmarkStub.rejects(new Error('Evil Error!'))
    await routeHandler(requestFake, responseFake)
    expect(responseStub.status.callCount).to.be.greaterThanOrEqual(1)
  })
  it('should set INTERNAL_SERVER_ERROR status on error', async () => {
    getBookmarkStub.rejects(new Error('Evil Error!'))
    await routeHandler(requestFake, responseFake)
    expect(responseStub.status.lastCall.args).to.deep.equal([StatusCodes.INTERNAL_SERVER_ERROR])
  })
  it('should set E_INTERNAL_ERROR json payload on error', async () => {
    getBookmarkStub.rejects(new Error('Evil Error!'))
    await routeHandler(requestFake, responseFake)
    expect(responseStub.json.lastCall.args).to.deep.equal([
      {
        error: {
          code: 'E_INTERNAL_ERROR',
          message: 'Internal Server Error',
        },
      },
    ])
  })
  it('should call logger on error', async () => {
    getBookmarkStub.rejects(new Error('Evil Error!'))
    requestStub.originalUrl = '/'
    await routeHandler(requestFake, responseFake)
    expect(loggerStub.callCount).to.be.greaterThanOrEqual(1)
  })
  it('should log two arguments on first log call on error', async () => {
    getBookmarkStub.rejects(new Error('Evil Error!'))
    requestStub.originalUrl = '/'
    await routeHandler(requestFake, responseFake)
    expect(loggerStub.firstCall.args).to.have.lengthOf(2)
  })
  it('should log rendered url as first log argument on error', async () => {
    getBookmarkStub.rejects(new Error('Evil Error!'))
    requestStub.originalUrl = '/'
    await routeHandler(requestFake, responseFake)
    expect(loggerStub.firstCall.args[0]).to.equal('Error rendering: /')
  })
  it('should log request body as second log argument on error', async () => {
    getBookmarkStub.rejects(new Error('Evil Error!'))
    requestStub.originalUrl = '/'
    await routeHandler(requestFake, responseFake)
    expect(loggerStub.firstCall.args[1]).to.equal(requestStub.body)
  })
  it('should call logger at least once on error', async () => {
    getBookmarkStub.rejects(new Error('Evil Error!'))
    await routeHandler(requestFake, responseFake)
    expect(loggerStub.callCount).to.be.greaterThanOrEqual(1)
  })
  it('should log one argument on last log call on error', async () => {
    getBookmarkStub.rejects(new Error('Evil Error!'))
    await routeHandler(requestFake, responseFake)
    expect(loggerStub.lastCall.args).to.have.lengthOf(1)
  })
  it('should log error object as last log argument on error', async () => {
    const err = new Error('Evil Error!')
    getBookmarkStub.rejects(err)
    await routeHandler(requestFake, responseFake)
    expect(loggerStub.lastCall.args[0]).to.equal(err)
  })
})

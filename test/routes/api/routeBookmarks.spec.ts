'use sanity'

import { expect } from 'chai'
import Sinon from 'sinon'
import type { Application, RequestHandler as ExpressRequestHandler, Response as ExpressResponse, Router } from 'express'
import type { Server } from 'node:http'
import type { Server as WebSocketServer } from 'socket.io'
import { getRouter, Imports } from '#routes/api'
import { Functions } from '#routes/apiFunctions'
import persistance from '#utils/persistance'
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
  let handleErrorsStub = Sinon.stub()
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
    handleErrorsStub = sandbox
      .stub(Imports, 'handleErrors')
      .callsFake((_logger, action) => Cast<ExpressRequestHandler>(action))
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
  it('should register route handler using handleErrors', () => {
    expect(handleErrorsStub.callCount).to.be.greaterThanOrEqual(1)
  })
  it('should pass logger to every handleErrors call', () => {
    for (const call of handleErrorsStub.getCalls()) {
      expect(call.args[0]).to.equal(loggerStub)
    }
  })
  it('should pass action function to every handleErrors call', () => {
    for (const call of handleErrorsStub.getCalls()) {
      expect(call.args[1]).to.be.a('function')
    }
  })
})

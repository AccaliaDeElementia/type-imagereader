'use sanity'

import { expect } from 'chai'
import Sinon from 'sinon'
import type { Application, RequestHandler as ExpressRequestHandler, Response as ExpressResponse, Router } from 'express'
import type { Server } from 'node:http'
import type { Server as WebSocketServer } from 'socket.io'
import { getRouter, Imports } from '#routes/api.js'
import { Functions } from '#routes/apiFunctions.js'
import persistance from '#utils/persistance.js'
import { Cast, StubToKnex } from '#testutils/TypeGuards.js'
import type { Debugger } from 'debug'
import { createResponseFake } from '#testutils/Express.js'

const sandbox = Sinon.createSandbox()

type RequestHandler = (req: Request, res: ExpressResponse) => Promise<void>

describe('routes/api route GET /bookmarks', () => {
  let getBookmarkStub = sandbox.stub()
  let requestStub = {
    body: {},
    originalUrl: '/',
  }
  let requestFake = Cast<Request>(requestStub)
  let { stub: responseStub, fake: responseFake } = createResponseFake()
  let routeHandler = Cast<RequestHandler>(sandbox.stub().throws('WRONG CALL'))
  let loggerStub = sandbox.stub()
  let knexFake = { Knex: Math.random() }
  beforeEach(async () => {
    requestStub = {
      body: {},
      originalUrl: '/',
    }
    requestFake = Cast<Request>(requestStub)
    ;({ stub: responseStub, fake: responseFake } = createResponseFake())
    const getFn = sandbox.stub()
    knexFake = { Knex: Math.random() }
    const InitializeStub = sandbox.stub(persistance, 'initialize').resolves(StubToKnex(knexFake))
    const MakeRouterStub = sandbox.stub(Imports, 'Router').returns(
      Cast<Router>({
        get: getFn,
        post: sandbox.stub(),
      }),
    )
    getBookmarkStub = sandbox.stub(Functions, 'GetBookmarks').resolves()
    loggerStub = sandbox.stub()
    sandbox.stub(Imports, 'debug').returns(Cast<Debugger>(loggerStub))
    sandbox.stub(Imports, 'handleErrors').callsFake((_logger, action) => Cast<ExpressRequestHandler>(action))
    await getRouter(Cast<Application>(null), Cast<Server>(null), Cast<WebSocketServer>(null))
    const fn = getFn.getCalls().find((call) => call.args[0] === '/bookmarks')?.args[1] as unknown
    routeHandler = Cast(fn, (fn): fn is RequestHandler => typeof fn === 'function')
    InitializeStub.restore()
    MakeRouterStub.restore()
  })

  afterEach(() => {
    sandbox.restore()
  })
  it('should pass bookmarks to json response', async () => {
    const bookmarks = { Bookmarks: Math.random() }
    getBookmarkStub.resolves(bookmarks)
    await routeHandler(requestFake, responseFake)
    expect(responseStub.json.firstCall.args[0]).to.equal(bookmarks)
  })
  it('should pass knex to GetBookmarks', async () => {
    await routeHandler(requestFake, responseFake)
    expect(getBookmarkStub.firstCall.args[0]).to.equal(knexFake)
  })
  it('should log on entry to bookmarks handler', async () => {
    await routeHandler(requestFake, responseFake)
    const matched = loggerStub.getCalls().some((c) => String(c.args[0]).includes('GET /bookmarks'))
    expect(matched).to.equal(true)
  })
})

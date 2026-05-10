'use sanity'

import Sinon from 'sinon'
import type { Application, RequestHandler as ExpressRequestHandler, Response as ExpressResponse, Router } from 'express'
import type { Server } from 'node:http'
import type { Server as WebSocketServer } from 'socket.io'
import { getRouter, Imports } from '#routes/api.js'
import { StatusCodes } from 'http-status-codes'
import { cast, stubToKnex } from '#testutils/typeGuards.js'
import { stubDebug } from '#testutils/debug.js'
import { createResponseFake } from '#testutils/express.js'

const sandbox = Sinon.createSandbox()

type RequestHandler = (req: Request, res: ExpressResponse) => Promise<void>

describe('routes/api route POST /bookmarks/add', () => {
  let requestStub = {
    body: {
      path: '/image.png',
    },
    originalUrl: '/',
  }
  let requestFake = cast<Request>(requestStub)
  let { stub: responseStub, fake: responseFake } = createResponseFake()
  let routeHandler = cast<RequestHandler>(sandbox.stub().throws('WRONG CALL'))
  let isPathTraversalStub = sandbox.stub()
  let addBookmarkStub = sandbox.stub()
  let loggerStub = sandbox.stub()
  let knexFake = { Knex: Math.random() }
  beforeEach(async () => {
    requestStub = {
      body: {
        path: '/image.png',
      },
      originalUrl: '/',
    }
    requestFake = cast<Request>(requestStub)
    ;({ stub: responseStub, fake: responseFake } = createResponseFake())
    knexFake = { Knex: Math.random() }
    const postFn = sandbox.stub()
    const InitializeStub = sandbox.stub(Imports, 'initialize').resolves(stubToKnex(knexFake))
    const MakeRouterStub = sandbox.stub(Imports, 'Router').returns(
      cast<Router>({
        post: postFn,
        get: sandbox.stub(),
      }),
    )
    addBookmarkStub = sandbox.stub(Imports, 'addBookmark').resolves()
    ;({ loggerStub } = stubDebug(sandbox, Imports))
    sandbox.stub(Imports, 'handleErrors').callsFake((_logger, action) => cast<ExpressRequestHandler>(action))
    isPathTraversalStub = sandbox.stub(Imports, 'isPathTraversal').returns(false)
    await getRouter(cast<Application>(null), cast<Server>(null), cast<WebSocketServer>(null))
    routeHandler = cast(
      postFn.getCalls().find((call) => call.args[0] === '/bookmarks/add')?.args[1],
      (fn): fn is RequestHandler => fn !== null,
    )
    InitializeStub.restore()
    MakeRouterStub.restore()
  })
  afterEach(() => {
    sandbox.restore()
  })
  it('should return status OK', async () => {
    await routeHandler(requestFake, responseFake)
    expect(responseStub.status.firstCall.args).toEqual([StatusCodes.OK])
  })
  it('should return empty response body on success', async () => {
    await routeHandler(requestFake, responseFake)
    expect(responseStub.end.firstCall.args).toHaveLength(0)
  })
  it('should call addBookmark with knex instance', async () => {
    requestStub.body.path = 'foo/a%20bar/baz.gif'
    await routeHandler(requestFake, responseFake)
    expect(addBookmarkStub.firstCall.args[0]).toBe(knexFake)
  })
  it('should call addBookmark with decoded path', async () => {
    requestStub.body.path = 'foo/a%20bar/baz.gif'
    await routeHandler(requestFake, responseFake)
    expect(addBookmarkStub.firstCall.args[1]).toBe('/foo/a bar/baz.gif')
  })
  it('should not call addBookmark when isPathTraversal returns true', async () => {
    isPathTraversalStub.returns(true)
    await routeHandler(requestFake, responseFake)
    expect(addBookmarkStub.callCount).toBe(0)
  })
  it('should return status FORBIDDEN when isPathTraversal returns true', async () => {
    isPathTraversalStub.returns(true)
    await routeHandler(requestFake, responseFake)
    expect(responseStub.status.firstCall.args).toEqual([StatusCodes.FORBIDDEN])
  })
  it('should return E_NO_TRAVERSE json error when isPathTraversal returns true', async () => {
    isPathTraversalStub.returns(true)
    await routeHandler(requestFake, responseFake)
    expect(responseStub.json.firstCall.args[0]).toHaveProperty('error.code', 'E_NO_TRAVERSE')
  })
  it('should log on entry to bookmarks/add handler', async () => {
    await routeHandler(requestFake, responseFake)
    const matched = loggerStub.getCalls().some((c) => String(c.args[0]).includes('POST /bookmarks/add'))
    expect(matched).toBe(true)
  })
})

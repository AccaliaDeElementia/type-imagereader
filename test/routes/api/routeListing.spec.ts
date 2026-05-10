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

describe('routes/api route GET /listing', () => {
  let requestStub = {
    params: { path: undefined as string | string[] | undefined },
    body: { Body: -1 },
    originalUrl: '/',
  }
  let requestFake = cast<Request>(requestStub)
  let { stub: responseStub, fake: responseFake } = createResponseFake()
  let routeHandler = cast<RequestHandler>(sandbox.stub().throws('WRONG CALL'))
  let isPathTraversalStub = sandbox.stub()
  let getListingStub = sandbox.stub()
  let loggerStub = sandbox.stub()
  let knexFake = { Knex: Math.random() }
  beforeEach(async () => {
    requestStub = {
      params: { path: undefined },
      body: { Body: -1 },
      originalUrl: '/',
    }
    requestFake = cast<Request>(requestStub)
    ;({ stub: responseStub, fake: responseFake } = createResponseFake())
    knexFake = { Knex: Math.random() }
    const getFn = sandbox.stub()
    const InitializeStub = sandbox.stub(Imports, 'initialize').resolves(stubToKnex(knexFake))
    const MakeRouterStub = sandbox.stub(Imports, 'Router').returns(
      cast<Router>({
        get: getFn,
        post: sandbox.stub(),
      }),
    )
    getListingStub = sandbox.stub(Imports, 'getListing').resolves()
    ;({ loggerStub } = stubDebug(sandbox, Imports))
    sandbox.stub(Imports, 'handleErrors').callsFake((_logger, action) => cast<ExpressRequestHandler>(action))
    isPathTraversalStub = sandbox.stub(Imports, 'isPathTraversal').returns(false)
    await getRouter(cast<Application>(null), cast<Server>(null), cast<WebSocketServer>(null))
    routeHandler = cast(
      getFn.getCalls().find((call) => call.args[0] === '/listing')?.args[1],
      (fn): fn is RequestHandler => fn !== null,
    )
    InitializeStub.restore()
    MakeRouterStub.restore()
  })
  afterEach(() => {
    sandbox.restore()
  })
  it('should return status OK', async () => {
    getListingStub.resolves({})
    await routeHandler(requestFake, responseFake)
    expect(responseStub.status.firstCall.args).toEqual([StatusCodes.OK])
  })
  it('should json send listing response', async () => {
    const listing = { listing: Math.random() }
    getListingStub.resolves(listing)
    await routeHandler(requestFake, responseFake)
    expect(responseStub.json.firstCall.args[0]).toBe(listing)
  })
  it('should pass Knex to getListing', async () => {
    requestStub.params.path = []
    await routeHandler(requestFake, responseFake)
    expect(getListingStub.firstCall.args[0]).toBe(knexFake)
  })
  it('should retrieve implicit root listing', async () => {
    requestStub.params.path = []
    await routeHandler(requestFake, responseFake)
    expect(getListingStub.firstCall.args[1]).toBe('/')
  })
  it('should retrieve explicit root listing', async () => {
    requestStub.params.path = ['']
    await routeHandler(requestFake, responseFake)
    expect(getListingStub.firstCall.args[1]).toBe('/')
  })
  it('should retrieve web path listing for string', async () => {
    requestStub.params.path = 'foo/a bar/baz'
    await routeHandler(requestFake, responseFake)
    expect(getListingStub.firstCall.args[1]).toBe('/foo/a bar/baz/')
  })
  it('should retrieve web path listing for string array', async () => {
    requestStub.params.path = ['foo', 'a bar', 'baz']
    await routeHandler(requestFake, responseFake)
    expect(getListingStub.firstCall.args[1]).toBe('/foo/a bar/baz/')
  })
  it('should not call getListing when isPathTraversal returns true', async () => {
    isPathTraversalStub.returns(true)
    await routeHandler(requestFake, responseFake)
    expect(getListingStub.callCount).toBe(0)
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
  it('should return status NOT_FOUND for missing folder', async () => {
    getListingStub.resolves(null)
    await routeHandler(requestFake, responseFake)
    expect(responseStub.status.firstCall.args).toEqual([StatusCodes.NOT_FOUND])
  })
  it('should json error for missing folder', async () => {
    const err = {
      error: {
        code: 'E_NOT_FOUND',
        message: 'Directory Not Found!',
        path: '/',
      },
    }
    getListingStub.resolves(null)
    await routeHandler(requestFake, responseFake)
    expect(responseStub.json.firstCall.args[0]).toEqual(err)
  })
  it('should log on entry to listing handler', async () => {
    getListingStub.resolves({})
    await routeHandler(requestFake, responseFake)
    const matched = loggerStub.getCalls().some((c) => String(c.args[0]).includes('GET /listing'))
    expect(matched).toBe(true)
  })
  it('should log a path traversal attempt', async () => {
    isPathTraversalStub.returns(true)
    await routeHandler(requestFake, responseFake)
    const matched = loggerStub.getCalls().some((c) => String(c.args[0]).includes('path traversal blocked'))
    expect(matched).toBe(true)
  })
  it('should log when listing is not found', async () => {
    getListingStub.resolves(null)
    await routeHandler(requestFake, responseFake)
    const matched = loggerStub.getCalls().some((c) => String(c.args[0]).includes('listing not found'))
    expect(matched).toBe(true)
  })
})

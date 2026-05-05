'use sanity'

import { expect } from 'chai'
import Sinon from 'sinon'
import type { Application, RequestHandler as ExpressRequestHandler, Response as ExpressResponse, Router } from 'express'
import type { Server } from 'node:http'
import type { Server as WebSocketServer } from 'socket.io'
import { Functions } from '#routes/apiFunctions.js'
import { getRouter, Imports } from '#routes/api.js'
import persistance from '#utils/persistance.js'
import { StatusCodes } from 'http-status-codes'
import { Cast, StubToKnex } from '#testutils/TypeGuards.js'
import type { Debugger } from 'debug'
import { createResponseFake } from '#testutils/Express.js'

const sandbox = Sinon.createSandbox()

type RequestHandler = (req: Request, res: ExpressResponse) => Promise<void>

describe('routes/api route GET /listing', () => {
  let requestStub = {
    params: { path: undefined as string | string[] | undefined },
    body: { Body: -1 },
    originalUrl: '/',
  }
  let requestFake = Cast<Request>(requestStub)
  let { stub: responseStub, fake: responseFake } = createResponseFake()
  let routeHandler = Cast<RequestHandler>(sandbox.stub().throws('WRONG CALL'))
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
    requestFake = Cast<Request>(requestStub)
    ;({ stub: responseStub, fake: responseFake } = createResponseFake())
    knexFake = { Knex: Math.random() }
    const getFn = sandbox.stub()
    const InitializeStub = sandbox.stub(persistance, 'initialize').resolves(StubToKnex(knexFake))
    const MakeRouterStub = sandbox.stub(Imports, 'Router').returns(
      Cast<Router>({
        get: getFn,
        post: sandbox.stub(),
      }),
    )
    getListingStub = sandbox.stub(Functions, 'GetListing').resolves()
    loggerStub = sandbox.stub()
    sandbox.stub(Imports, 'debug').returns(Cast<Debugger>(loggerStub))
    sandbox.stub(Imports, 'handleErrors').callsFake((_logger, action) => Cast<ExpressRequestHandler>(action))
    isPathTraversalStub = sandbox.stub(Imports, 'isPathTraversal').returns(false)
    await getRouter(Cast<Application>(null), Cast<Server>(null), Cast<WebSocketServer>(null))
    routeHandler = Cast(
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
    expect(responseStub.status.firstCall.args).to.deep.equal([StatusCodes.OK])
  })
  it('should json send listing response', async () => {
    const listing = { listing: Math.random() }
    getListingStub.resolves(listing)
    await routeHandler(requestFake, responseFake)
    expect(responseStub.json.firstCall.args[0]).to.equal(listing)
  })
  it('should pass Knex to GetListing', async () => {
    requestStub.params.path = []
    await routeHandler(requestFake, responseFake)
    expect(getListingStub.firstCall.args[0]).to.equal(knexFake)
  })
  it('should retrieve implicit root listing', async () => {
    requestStub.params.path = []
    await routeHandler(requestFake, responseFake)
    expect(getListingStub.firstCall.args[1]).to.equal('/')
  })
  it('should retrieve explicit root listing', async () => {
    requestStub.params.path = ['']
    await routeHandler(requestFake, responseFake)
    expect(getListingStub.firstCall.args[1]).to.equal('/')
  })
  it('should retrieve web path listing for string', async () => {
    requestStub.params.path = 'foo/a bar/baz'
    await routeHandler(requestFake, responseFake)
    expect(getListingStub.firstCall.args[1]).to.equal('/foo/a bar/baz/')
  })
  it('should retrieve web path listing for string array', async () => {
    requestStub.params.path = ['foo', 'a bar', 'baz']
    await routeHandler(requestFake, responseFake)
    expect(getListingStub.firstCall.args[1]).to.equal('/foo/a bar/baz/')
  })
  it('should not call GetListing when isPathTraversal returns true', async () => {
    isPathTraversalStub.returns(true)
    await routeHandler(requestFake, responseFake)
    expect(getListingStub.callCount).to.equal(0)
  })
  it('should return status FORBIDDEN when isPathTraversal returns true', async () => {
    isPathTraversalStub.returns(true)
    await routeHandler(requestFake, responseFake)
    expect(responseStub.status.firstCall.args).to.deep.equal([StatusCodes.FORBIDDEN])
  })
  it('should return E_NO_TRAVERSE json error when isPathTraversal returns true', async () => {
    isPathTraversalStub.returns(true)
    await routeHandler(requestFake, responseFake)
    expect(responseStub.json.firstCall.args[0]).to.have.nested.property('error.code', 'E_NO_TRAVERSE')
  })
  it('should return status NOT_FOUND for missing folder', async () => {
    getListingStub.resolves(null)
    await routeHandler(requestFake, responseFake)
    expect(responseStub.status.firstCall.args).to.deep.equal([StatusCodes.NOT_FOUND])
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
    expect(responseStub.json.firstCall.args[0]).to.deep.equal(err)
  })
  it('should log on entry to listing handler', async () => {
    getListingStub.resolves({})
    await routeHandler(requestFake, responseFake)
    const matched = loggerStub.getCalls().some((c) => String(c.args[0]).includes('GET /listing'))
    expect(matched).to.equal(true)
  })
  it('should log a path traversal attempt', async () => {
    isPathTraversalStub.returns(true)
    await routeHandler(requestFake, responseFake)
    const matched = loggerStub.getCalls().some((c) => String(c.args[0]).includes('path traversal blocked'))
    expect(matched).to.equal(true)
  })
  it('should log when listing is not found', async () => {
    getListingStub.resolves(null)
    await routeHandler(requestFake, responseFake)
    const matched = loggerStub.getCalls().some((c) => String(c.args[0]).includes('listing not found'))
    expect(matched).to.equal(true)
  })
})

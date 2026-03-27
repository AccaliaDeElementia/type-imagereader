'use sanity'

import { expect } from 'chai'
import Sinon from 'sinon'
import type { Application, RequestHandler as ExpressRequestHandler, Response as ExpressResponse, Router } from 'express'
import type { Server } from 'node:http'
import type { Server as WebSocketServer } from 'socket.io'
import { Functions } from '#routes/apiFunctions'
import { getRouter, Imports } from '#routes/api'
import persistance from '#utils/persistance'
import { StatusCodes } from 'http-status-codes'
import { Cast, StubToKnex } from '#testutils/TypeGuards'
import type { Debugger } from 'debug'
import { createResponseFake } from '#testutils/Express'

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
  let routeHandler = Cast<RequestHandler>(Sinon.stub().throws('WRONG CALL'))
  let loggerStub = Sinon.stub()
  let handleErrorsStub = Sinon.stub()
  let isPathTraversalStub = Sinon.stub()
  let getListingStub = Sinon.stub()
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
    const getFn = Sinon.stub()
    const InitializeStub = sandbox.stub(persistance, 'initialize').resolves(StubToKnex(knexFake))
    const MakeRouterStub = sandbox.stub(Imports, 'Router').returns(
      Cast<Router>({
        get: getFn,
        post: Sinon.stub(),
      }),
    )
    getListingStub = sandbox.stub(Functions, 'GetListing').resolves()
    loggerStub = Sinon.stub()
    sandbox.stub(Imports, 'debug').returns(Cast<Debugger>(loggerStub))
    handleErrorsStub = sandbox
      .stub(Imports, 'handleErrors')
      .callsFake((_logger, action) => Cast<ExpressRequestHandler>(action))
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
  it('should call status once when returning OK', async () => {
    getListingStub.resolves({})
    await routeHandler(requestFake, responseFake)
    expect(responseStub.status.callCount).to.equal(1)
  })
  it('should return status OK', async () => {
    getListingStub.resolves({})
    await routeHandler(requestFake, responseFake)
    expect(responseStub.status.firstCall.args).to.deep.equal([StatusCodes.OK])
  })
  it('should call json once when sending listing response', async () => {
    const listing = { listing: Math.random() }
    getListingStub.resolves(listing)
    await routeHandler(requestFake, responseFake)
    expect(responseStub.json.callCount).to.equal(1)
  })
  it('should json send one argument in listing response', async () => {
    const listing = { listing: Math.random() }
    getListingStub.resolves(listing)
    await routeHandler(requestFake, responseFake)
    expect(responseStub.json.firstCall.args).to.have.lengthOf(1)
  })
  it('should json send listing response', async () => {
    const listing = { listing: Math.random() }
    getListingStub.resolves(listing)
    await routeHandler(requestFake, responseFake)
    expect(responseStub.json.firstCall.args[0]).to.equal(listing)
  })
  it('should call GetListing once with Knex from initialize', async () => {
    requestStub.params.path = []
    await routeHandler(requestFake, responseFake)
    expect(getListingStub.callCount).to.equal(1)
  })
  it('should pass Knex to GetListing', async () => {
    requestStub.params.path = []
    await routeHandler(requestFake, responseFake)
    expect(getListingStub.firstCall.args[0]).to.equal(knexFake)
  })
  it('should call GetListing once for implicit root listing', async () => {
    requestStub.params.path = []
    await routeHandler(requestFake, responseFake)
    expect(getListingStub.callCount).to.equal(1)
  })
  it('should retrieve implicit root listing', async () => {
    requestStub.params.path = []
    await routeHandler(requestFake, responseFake)
    expect(getListingStub.firstCall.args[1]).to.equal('/')
  })
  it('should call GetListing once for explicit root listing', async () => {
    requestStub.params.path = ['']
    await routeHandler(requestFake, responseFake)
    expect(getListingStub.callCount).to.equal(1)
  })
  it('should retrieve explicit root listing', async () => {
    requestStub.params.path = ['']
    await routeHandler(requestFake, responseFake)
    expect(getListingStub.firstCall.args[1]).to.equal('/')
  })
  it('should call GetListing once for string path listing', async () => {
    requestStub.params.path = 'foo/a bar/baz'
    await routeHandler(requestFake, responseFake)
    expect(getListingStub.callCount).to.equal(1)
  })
  it('should retrieve web path listing for string', async () => {
    requestStub.params.path = 'foo/a bar/baz'
    await routeHandler(requestFake, responseFake)
    expect(getListingStub.firstCall.args[1]).to.equal('/foo/a bar/baz/')
  })
  it('should call GetListing once for string array path listing', async () => {
    requestStub.params.path = ['foo', 'a bar', 'baz']
    await routeHandler(requestFake, responseFake)
    expect(getListingStub.callCount).to.equal(1)
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
  it('should call status once for missing folder', async () => {
    getListingStub.resolves(null)
    await routeHandler(requestFake, responseFake)
    expect(responseStub.status.callCount).to.equal(1)
  })
  it('should return status NOT_FOUND for missing folder', async () => {
    getListingStub.resolves(null)
    await routeHandler(requestFake, responseFake)
    expect(responseStub.status.firstCall.args).to.deep.equal([StatusCodes.NOT_FOUND])
  })
  it('should call json once for missing folder', async () => {
    getListingStub.resolves(null)
    await routeHandler(requestFake, responseFake)
    expect(responseStub.json.callCount).to.equal(1)
  })
  it('should json one argument for missing folder', async () => {
    getListingStub.resolves(null)
    await routeHandler(requestFake, responseFake)
    expect(responseStub.json.firstCall.args).to.have.lengthOf(1)
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

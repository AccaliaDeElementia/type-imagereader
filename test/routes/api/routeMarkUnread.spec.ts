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

describe('routes/api route POST /mark/unread', () => {
  let requestStub = {
    body: {
      path: '/image.png',
    },
    originalUrl: '/',
  }
  let requestFake = Cast<Request>(requestStub)
  let { stub: responseStub, fake: responseFake } = createResponseFake()
  let routeHandler = Cast<RequestHandler>(Sinon.stub().throws('WRONG CALL'))
  let loggerStub = Sinon.stub()
  let handleErrorsStub = Sinon.stub()
  let isPathTraversalStub = Sinon.stub()
  let markFolderSeenStub = Sinon.stub()
  let knexFake = { Knex: Math.random() }
  beforeEach(async () => {
    requestStub = {
      body: {
        path: '/image.png',
      },
      originalUrl: '/',
    }
    requestFake = Cast<Request>(requestStub)
    ;({ stub: responseStub, fake: responseFake } = createResponseFake())
    knexFake = { Knex: Math.random() }
    const postFn = Sinon.stub()
    const InitializeStub = sandbox.stub(persistance, 'initialize').resolves(StubToKnex(knexFake))
    const MakeRouterStub = sandbox.stub(Imports, 'Router').returns(
      Cast<Router>({
        post: postFn,
        get: Sinon.stub(),
      }),
    )
    markFolderSeenStub = sandbox.stub(Functions, 'MarkFolderSeen').resolves()
    loggerStub = Sinon.stub()
    sandbox.stub(Imports, 'debug').returns(Cast<Debugger>(loggerStub))
    handleErrorsStub = sandbox
      .stub(Imports, 'handleErrors')
      .callsFake((_logger, action) => Cast<ExpressRequestHandler>(action))
    isPathTraversalStub = sandbox.stub(Imports, 'isPathTraversal').returns(false)
    await getRouter(Cast<Application>(null), Cast<Server>(null), Cast<WebSocketServer>(null))
    routeHandler = Cast(
      postFn.getCalls().find((call) => call.args[0] === '/mark/unread')?.args[1],
      (fn): fn is RequestHandler => fn !== null,
    )
    InitializeStub.restore()
    MakeRouterStub.restore()
  })
  afterEach(() => {
    sandbox.restore()
  })
  it('should call response status once on success', async () => {
    await routeHandler(requestFake, responseFake)
    expect(responseStub.status.callCount).to.equal(1)
  })
  it('should return status OK', async () => {
    await routeHandler(requestFake, responseFake)
    expect(responseStub.status.firstCall.args).to.deep.equal([StatusCodes.OK])
  })
  it('should call response end once on success', async () => {
    await routeHandler(requestFake, responseFake)
    expect(responseStub.end.callCount).to.equal(1)
  })
  it('should return empty response body on success', async () => {
    await routeHandler(requestFake, responseFake)
    expect(responseStub.end.firstCall.args).to.have.lengthOf(0)
  })
  it('should call MarkFolderSeen once', async () => {
    requestStub.body.path = 'foo/a%20bar/baz'
    await routeHandler(requestFake, responseFake)
    expect(markFolderSeenStub.callCount).to.equal(1)
  })
  it('should call MarkFolderSeen with three arguments', async () => {
    requestStub.body.path = 'foo/a%20bar/baz'
    await routeHandler(requestFake, responseFake)
    expect(markFolderSeenStub.firstCall.args).to.have.lengthOf(3)
  })
  it('should call MarkFolderSeen with knex instance', async () => {
    requestStub.body.path = 'foo/a%20bar/baz'
    await routeHandler(requestFake, responseFake)
    expect(markFolderSeenStub.firstCall.args[0]).to.equal(knexFake)
  })
  it('should call MarkFolderSeen with decoded path', async () => {
    requestStub.body.path = 'foo/a%20bar/baz'
    await routeHandler(requestFake, responseFake)
    expect(markFolderSeenStub.firstCall.args[1]).to.equal('/foo/a bar/baz/')
  })
  it('should call MarkFolderSeen with markAsSeen false', async () => {
    requestStub.body.path = 'foo/a%20bar/baz'
    await routeHandler(requestFake, responseFake)
    expect(markFolderSeenStub.firstCall.args[2]).to.equal(false)
  })
  it('should not call MarkFolderSeen when isPathTraversal returns true', async () => {
    isPathTraversalStub.returns(true)
    await routeHandler(requestFake, responseFake)
    expect(markFolderSeenStub.callCount).to.equal(0)
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

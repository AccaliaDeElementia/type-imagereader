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

describe('routes/api route POST /mark/unread', () => {
  let requestStub = {
    body: {
      path: '/image.png',
    },
    originalUrl: '/',
  }
  let requestFake = Cast<Request>(requestStub)
  let { stub: responseStub, fake: responseFake } = createResponseFake()
  let routeHandler = Cast<RequestHandler>(sandbox.stub().throws('WRONG CALL'))
  let isPathTraversalStub = sandbox.stub()
  let markFolderSeenStub = sandbox.stub()
  let loggerStub = sandbox.stub()
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
    const postFn = sandbox.stub()
    const InitializeStub = sandbox.stub(persistance, 'initialize').resolves(StubToKnex(knexFake))
    const MakeRouterStub = sandbox.stub(Imports, 'Router').returns(
      Cast<Router>({
        post: postFn,
        get: sandbox.stub(),
      }),
    )
    markFolderSeenStub = sandbox.stub(Functions, 'MarkFolderSeen').resolves()
    loggerStub = sandbox.stub()
    sandbox.stub(Imports, 'debug').returns(Cast<Debugger>(loggerStub))
    sandbox.stub(Imports, 'handleErrors').callsFake((_logger, action) => Cast<ExpressRequestHandler>(action))
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
  it('should return status OK', async () => {
    await routeHandler(requestFake, responseFake)
    expect(responseStub.status.firstCall.args).to.deep.equal([StatusCodes.OK])
  })
  it('should return empty response body on success', async () => {
    await routeHandler(requestFake, responseFake)
    expect(responseStub.end.firstCall.args).to.have.lengthOf(0)
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
  it('should log on entry to mark/unread handler', async () => {
    await routeHandler(requestFake, responseFake)
    const matched = loggerStub.getCalls().some((c) => String(c.args[0]).includes('POST /mark/unread'))
    expect(matched).to.equal(true)
  })
})

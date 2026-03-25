'use sanity'

import { expect } from 'chai'
import Sinon from 'sinon'
import type { Application, Response as ExpressResponse, Router } from 'express'
import type { Server } from 'node:http'
import type { Server as WebSocketServer } from 'socket.io'
import { Functions } from '../../../routes/apiFunctions'
import { getRouter, Imports } from '../../../routes/api'
import persistance from '../../../utils/persistance'
import { StatusCodes } from 'http-status-codes'
import { Cast, StubToKnex } from '../../../testutils/TypeGuards'
import type { Debugger } from 'debug'
import { createResponseFake } from '../../../testutils/Express'

const sandbox = Sinon.createSandbox()

type RequestHandler = (req: Request, res: ExpressResponse) => Promise<void>

describe('routes/api route POST /mark/read', () => {
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
  Sinon.stub()
  let markFolderReadStub = Sinon.stub()
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
    markFolderReadStub = sandbox.stub(Functions, 'MarkFolderRead').resolves()
    loggerStub = Sinon.stub()
    sandbox.stub(Imports, 'debug').returns(Cast<Debugger>(loggerStub))
    await getRouter(Cast<Application>(null), Cast<Server>(null), Cast<WebSocketServer>(null))
    routeHandler = Cast(
      postFn.getCalls().find((call) => call.args[0] === '/mark/read')?.args[1],
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
    expect(responseStub.status.callCount).to.equal(1)
    expect(responseStub.status.firstCall.args).to.deep.equal([StatusCodes.OK])
    expect(responseStub.end.callCount).to.equal(1)
    expect(responseStub.end.firstCall.args).to.have.lengthOf(0)
  })
  it('should call MarkFolderRead', async () => {
    requestStub.body.path = 'foo/a%20bar/baz'
    await routeHandler(requestFake, responseFake)
    expect(markFolderReadStub.callCount).to.equal(1)
    expect(markFolderReadStub.firstCall.args).to.have.lengthOf(2)
    expect(markFolderReadStub.firstCall.args[0]).to.equal(knexFake)
    expect(markFolderReadStub.firstCall.args[1]).to.equal('/foo/a bar/baz/')
  })
  it('should not retrieve listing directory traversal attempt', async () => {
    requestStub.body.path = '/foo/../bar/'
    await routeHandler(requestFake, responseFake)
    expect(markFolderReadStub.callCount).to.equal(0)
  })
  it('should return status FORBIDDEN for directory traversal attempt', async () => {
    requestStub.body.path = '/foo/../bar/'
    await routeHandler(requestFake, responseFake)
    expect(responseStub.status.callCount).to.equal(1)
    expect(responseStub.status.firstCall.args).to.deep.equal([StatusCodes.FORBIDDEN])
  })
  it('should json error for directory traversal attempt', async () => {
    requestStub.body.path = '/foo/../bar/'
    const err = {
      error: {
        code: 'E_NO_TRAVERSE',
        message: 'Directory Traversal is not Allowed!',
        path: '/foo/../bar/',
      },
    }
    await routeHandler(requestFake, responseFake)
    expect(responseStub.json.callCount).to.equal(1)
    expect(responseStub.json.firstCall.args).to.have.lengthOf(1)
    expect(responseStub.json.firstCall.args[0]).to.deep.equal(err)
  })
  it('should call response status on error', async () => {
    markFolderReadStub.rejects(new Error('Evil Error!'))
    await routeHandler(requestFake, responseFake)
    expect(responseStub.status.callCount).to.be.greaterThanOrEqual(1)
  })
  it('should set INTERNAL_SERVER_ERROR status on error', async () => {
    markFolderReadStub.rejects(new Error('Evil Error!'))
    await routeHandler(requestFake, responseFake)
    expect(responseStub.status.lastCall.args).to.deep.equal([StatusCodes.INTERNAL_SERVER_ERROR])
  })
  it('should set E_INTERNAL_ERROR json payload on error', async () => {
    markFolderReadStub.rejects(new Error('Evil Error!'))
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
    markFolderReadStub.rejects(new Error('Evil Error!'))
    requestStub.originalUrl = '/'
    await routeHandler(requestFake, responseFake)
    expect(loggerStub.callCount).to.be.greaterThanOrEqual(1)
  })
  it('should log two arguments on first log call on error', async () => {
    markFolderReadStub.rejects(new Error('Evil Error!'))
    requestStub.originalUrl = '/'
    await routeHandler(requestFake, responseFake)
    expect(loggerStub.firstCall.args).to.have.lengthOf(2)
  })
  it('should log rendered url as first log argument on error', async () => {
    markFolderReadStub.rejects(new Error('Evil Error!'))
    requestStub.originalUrl = '/'
    await routeHandler(requestFake, responseFake)
    expect(loggerStub.firstCall.args[0]).to.equal('Error rendering: /')
  })
  it('should log request body as second log argument on error', async () => {
    markFolderReadStub.rejects(new Error('Evil Error!'))
    requestStub.originalUrl = '/'
    await routeHandler(requestFake, responseFake)
    expect(loggerStub.firstCall.args[1]).to.equal(requestStub.body)
  })
  it('should call logger at least once on error', async () => {
    markFolderReadStub.rejects(new Error('Evil Error!'))
    await routeHandler(requestFake, responseFake)
    expect(loggerStub.callCount).to.be.greaterThanOrEqual(1)
  })
  it('should log one argument on last log call on error', async () => {
    markFolderReadStub.rejects(new Error('Evil Error!'))
    await routeHandler(requestFake, responseFake)
    expect(loggerStub.lastCall.args).to.have.lengthOf(1)
  })
  it('should log error object as last log argument on error', async () => {
    const err = new Error('Evil Error!')
    markFolderReadStub.rejects(err)
    await routeHandler(requestFake, responseFake)
    expect(loggerStub.lastCall.args[0]).to.equal(err)
  })
})

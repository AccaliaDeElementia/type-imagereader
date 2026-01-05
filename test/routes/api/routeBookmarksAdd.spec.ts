'use sanity'

import { expect } from 'chai'
import Sinon from 'sinon'
import type { Application, Router } from 'express'
import type { Server } from 'node:http'
import type { Server as WebSocketServer } from 'socket.io'
import { Functions } from '../../../routes/apiFunctions'
import { getRouter, Imports } from '../../../routes/api'
import persistance from '../../../utils/persistance'
import { StatusCodes } from 'http-status-codes'
import { Cast, StubToKnex } from '../../testutils/TypeGuards'
import type { Debugger } from 'debug'

type RequestHandler = (req: Request, res: Response) => Promise<void>

describe('routes/api route POST /bookmarks/add', () => {
  let requestStub = {
    body: {
      path: '/image.png',
    },
    originalUrl: '/',
  }
  let requestFake = Cast<Request>(requestStub)
  let responseStub = {
    status: Sinon.stub().returnsThis(),
    json: Sinon.stub().returnsThis(),
    send: Sinon.stub().returnsThis(),
    end: Sinon.stub().returnsThis(),
  }
  let responseFake = Cast<Response>(responseStub)
  let routeHandler = Cast<RequestHandler>(Sinon.stub().throws('WRONG CALL'))
  let loggerStub = Sinon.stub()
  let debuggerStub = Sinon.stub()
  let addBookmarkStub = Sinon.stub()
  let knexFake = { Knex: Math.random() }
  beforeEach(async () => {
    requestStub = {
      body: {
        path: '/image.png',
      },
      originalUrl: '/',
    }
    requestFake = Cast<Request>(requestStub)
    responseStub = {
      status: Sinon.stub().returnsThis(),
      json: Sinon.stub().returnsThis(),
      send: Sinon.stub().returnsThis(),
      end: Sinon.stub().returnsThis(),
    }
    responseFake = Cast<Response>(responseStub)
    knexFake = { Knex: Math.random() }
    const postFn = Sinon.stub()
    const InitializeStub = Sinon.stub(persistance, 'initialize').resolves(StubToKnex(knexFake))
    const MakeRouterStub = Sinon.stub(Imports, 'Router').returns(
      Cast<Router>({
        post: postFn,
        get: Sinon.stub(),
      }),
    )
    addBookmarkStub = Sinon.stub(Functions, 'AddBookmark').resolves()
    loggerStub = Sinon.stub()
    debuggerStub = Sinon.stub(Imports, 'debug').returns(Cast<Debugger>(loggerStub))
    await getRouter(Cast<Application>(null), Cast<Server>(null), Cast<WebSocketServer>(null))
    routeHandler = Cast(
      postFn.getCalls().find((call) => call.args[0] === '/bookmarks/add')?.args[1],
      (fn): fn is RequestHandler => fn != null,
    )
    InitializeStub.restore()
    MakeRouterStub.restore()
  })
  afterEach(() => {
    addBookmarkStub.restore()
    debuggerStub.restore()
  })
  it('should return status OK', async () => {
    await routeHandler(requestFake, responseFake)
    expect(responseStub.status.callCount).to.equal(1)
    expect(responseStub.status.firstCall.args).to.deep.equal([StatusCodes.OK])
    expect(responseStub.end.callCount).to.equal(1)
    expect(responseStub.end.firstCall.args).to.have.lengthOf(0)
  })
  it('should call AddBookmark', async () => {
    requestStub.body.path = 'foo/a%20bar/baz.gif'
    await routeHandler(requestFake, responseFake)
    expect(addBookmarkStub.callCount).to.equal(1)
    expect(addBookmarkStub.firstCall.args).to.have.lengthOf(2)
    expect(addBookmarkStub.firstCall.args[0]).to.equal(knexFake)
    expect(addBookmarkStub.firstCall.args[1]).to.equal('/foo/a bar/baz.gif')
  })
  it('should not retrieve listing directory traversal attempt', async () => {
    requestStub.body.path = '/foo/../bar.gif'
    await routeHandler(requestFake, responseFake)
    expect(addBookmarkStub.callCount).to.equal(0)
  })
  it('should return status FORBIDDEN for directory traversal attempt', async () => {
    requestStub.body.path = '/foo/../bar.gif'
    await routeHandler(requestFake, responseFake)
    expect(responseStub.status.callCount).to.equal(1)
    expect(responseStub.status.firstCall.args).to.deep.equal([StatusCodes.FORBIDDEN])
  })
  it('should json error for directory traversal attempt', async () => {
    requestStub.body.path = '/foo/../bar.gif'
    const err = {
      error: {
        code: 'E_NO_TRAVERSE',
        message: 'Directory Traversal is not Allowed!',
        path: '/foo/../bar.gif',
      },
    }
    await routeHandler(requestFake, responseFake)
    expect(responseStub.json.callCount).to.equal(1)
    expect(responseStub.json.firstCall.args).to.have.lengthOf(1)
    expect(responseStub.json.firstCall.args[0]).to.deep.equal(err)
  })
  it('should respond with error message on error', async () => {
    const err = new Error('Evil Error!')
    addBookmarkStub.rejects(err)
    await routeHandler(requestFake, responseFake)
    expect(responseStub.status.callCount).to.be.greaterThanOrEqual(1)
    expect(responseStub.status.lastCall.args).to.deep.equal([StatusCodes.INTERNAL_SERVER_ERROR])
    expect(responseStub.json.lastCall.args).to.deep.equal([
      {
        error: {
          code: 'E_INTERNAL_ERROR',
          message: 'Internal Server Error',
        },
      },
    ])
  })
  it('should log message on error', async () => {
    const err = new Error('Evil Error!')
    addBookmarkStub.rejects(err)
    requestStub.originalUrl = '/'
    await routeHandler(requestFake, responseFake)
    expect(loggerStub.callCount).to.be.greaterThanOrEqual(1)
    expect(loggerStub.firstCall.args).to.have.lengthOf(2)
    expect(loggerStub.firstCall.args[0]).to.equal('Error rendering: /')
    expect(loggerStub.firstCall.args[1]).to.equal(requestStub.body)
  })
  it('should log error on error', async () => {
    const err = new Error('Evil Error!')
    addBookmarkStub.rejects(err)
    await routeHandler(requestFake, responseFake)
    expect(loggerStub.callCount).to.be.greaterThanOrEqual(1)
    expect(loggerStub.lastCall.args).to.have.lengthOf(1)
    expect(loggerStub.lastCall.args[0]).to.equal(err)
  })
})

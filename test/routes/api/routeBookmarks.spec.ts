'use sanity'

import { expect } from 'chai'
import Sinon from 'sinon'
import type { Application, Router } from 'express'
import type { Server } from 'node:http'
import type { Server as WebSocketServer } from 'socket.io'
import { getRouter, Imports } from '../../../routes/api'
import { Functions } from '../../../routes/apiFunctions'
import persistance from '../../../utils/persistance'
import { StatusCodes } from 'http-status-codes'
import { Cast, StubToKnex } from '../../testutils/TypeGuards'
import type { Debugger } from 'debug'

type RequestHandler = (req: Request, res: Response) => Promise<void>

describe('routes/api route GET /bookmarks', () => {
  let getBookmarkStub = Sinon.stub()
  let requestStub = {
    body: {},
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
  let knexFake = { Knex: Math.random() }
  beforeEach(async () => {
    requestStub = {
      body: {},
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
    const getFn = Sinon.stub()
    knexFake = { Knex: Math.random() }
    const InitializeStub = Sinon.stub(persistance, 'initialize').resolves(StubToKnex(knexFake))
    const MakeRouterStub = Sinon.stub(Imports, 'Router').returns(
      Cast<Router>({
        get: getFn,
        post: Sinon.stub(),
      }),
    )
    getBookmarkStub = Sinon.stub(Functions, 'GetBookmarks').resolves()
    loggerStub = Sinon.stub()
    debuggerStub = Sinon.stub(Imports, 'debug').returns(Cast<Debugger>(loggerStub))
    await getRouter(Cast<Application>(null), Cast<Server>(null), Cast<WebSocketServer>(null))
    const fn = getFn.getCalls().find((call) => call.args[0] === '/bookmarks')?.args[1] as unknown
    routeHandler = Cast(fn, (fn): fn is RequestHandler => typeof fn === 'function')
    InitializeStub.restore()
    MakeRouterStub.restore()
  })

  afterEach(() => {
    debuggerStub.restore()
    getBookmarkStub.restore()
  })
  it('should return bookmarks', async () => {
    const bookmarks = { Bookmarks: Math.random() }
    getBookmarkStub.resolves(bookmarks)
    await routeHandler(requestFake, responseFake)
    expect(responseStub.json.callCount).to.equal(1)
    expect(responseStub.json.firstCall.args).to.have.lengthOf(1)
    expect(responseStub.json.firstCall.args[0]).to.equal(bookmarks)
  })
  it('should call GetBookmarks', async () => {
    await routeHandler(requestFake, responseFake)
    expect(getBookmarkStub.callCount).to.equal(1)
    expect(getBookmarkStub.firstCall.args).to.have.lengthOf(1)
    expect(getBookmarkStub.firstCall.args[0]).to.equal(knexFake)
  })
  it('should respond with error message on error', async () => {
    const err = new Error('Evil Error!')
    getBookmarkStub.rejects(err)
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
    getBookmarkStub.rejects(err)
    requestStub.originalUrl = '/'
    await routeHandler(requestFake, responseFake)
    expect(loggerStub.callCount).to.be.greaterThanOrEqual(1)
    expect(loggerStub.firstCall.args).to.have.lengthOf(2)
    expect(loggerStub.firstCall.args[0]).to.equal('Error rendering: /')
    expect(loggerStub.firstCall.args[1]).to.equal(requestStub.body)
  })
  it('should log error on error', async () => {
    const err = new Error('Evil Error!')
    getBookmarkStub.rejects(err)
    await routeHandler(requestFake, responseFake)
    expect(loggerStub.callCount).to.be.greaterThanOrEqual(1)
    expect(loggerStub.lastCall.args).to.have.lengthOf(1)
    expect(loggerStub.lastCall.args[0]).to.equal(err)
  })
})

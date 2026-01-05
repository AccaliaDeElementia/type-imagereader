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

describe('routes/api route GET /listing', () => {
  let requestStub = {
    params: [] as string[],
    body: { Body: -1 },
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
  let getListingStub = Sinon.stub()
  let knexFake = { Knex: Math.random() }
  beforeEach(async () => {
    requestStub = {
      params: [] as string[],
      body: { Body: -1 },
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
    const getFn = Sinon.stub()
    const InitializeStub = Sinon.stub(persistance, 'initialize').resolves(StubToKnex(knexFake))
    const MakeRouterStub = Sinon.stub(Imports, 'Router').returns(
      Cast<Router>({
        get: getFn,
        post: Sinon.stub(),
      }),
    )
    getListingStub = Sinon.stub(Functions, 'GetListing').resolves()
    loggerStub = Sinon.stub()
    debuggerStub = Sinon.stub(Imports, 'debug').returns(Cast<Debugger>(loggerStub))
    await getRouter(Cast<Application>(null), Cast<Server>(null), Cast<WebSocketServer>(null))
    routeHandler = Cast(
      getFn.getCalls().find((call) => call.args[0] === '/listing')?.args[1],
      (fn): fn is RequestHandler => fn != null,
    )
    InitializeStub.restore()
    MakeRouterStub.restore()
  })
  afterEach(() => {
    getListingStub.restore()
    debuggerStub.restore()
  })
  it('should return status OK', async () => {
    getListingStub.resolves({})
    await routeHandler(requestFake, responseFake)
    expect(responseStub.status.callCount).to.equal(1)
    expect(responseStub.status.firstCall.args).to.deep.equal([StatusCodes.OK])
  })
  it('should json send listing response', async () => {
    const listing = { listing: Math.random() }
    getListingStub.resolves(listing)
    await routeHandler(requestFake, responseFake)
    expect(responseStub.json.callCount).to.equal(1)
    expect(responseStub.json.firstCall.args).to.have.lengthOf(1)
    expect(responseStub.json.firstCall.args[0]).to.equal(listing)
  })
  it('should call GetListingStub with Knex from initialize', async () => {
    requestStub.params = []
    await routeHandler(requestFake, responseFake)
    expect(getListingStub.callCount).to.equal(1)
    expect(getListingStub.firstCall.args[0]).to.equal(knexFake)
  })
  it('should call GetListingStub to retrieve implicit root listing', async () => {
    requestStub.params = []
    await routeHandler(requestFake, responseFake)
    expect(getListingStub.callCount).to.equal(1)
    expect(getListingStub.firstCall.args[1]).to.equal('/')
  })
  it('should call GetListingStub to retrieve empty path listing', async () => {
    requestStub.params = ['']
    await routeHandler(requestFake, responseFake)
    expect(getListingStub.callCount).to.equal(1)
    expect(getListingStub.firstCall.args[1]).to.equal('/')
  })
  it('should call GetListingStub to retrieve explicit root listing', async () => {
    requestStub.params = ['/']
    await routeHandler(requestFake, responseFake)
    expect(getListingStub.callCount).to.equal(1)
    expect(getListingStub.firstCall.args[1]).to.equal('/')
  })
  it('should call GetListingStub to retrieve web path listing', async () => {
    requestStub.params = ['foo/a bar/baz']
    await routeHandler(requestFake, responseFake)
    expect(getListingStub.callCount).to.equal(1)
    expect(getListingStub.firstCall.args[1]).to.equal('/foo/a bar/baz/')
  })
  it('should not retrieve listing directory traversal attempt', async () => {
    requestStub.params = ['/foo/../bar/']
    await routeHandler(requestFake, responseFake)
    expect(getListingStub.callCount).to.equal(0)
  })
  it('should return status FORBIDDEN for directory traversal attempt', async () => {
    requestStub.params = ['/foo/../bar/']
    await routeHandler(requestFake, responseFake)
    expect(responseStub.status.callCount).to.equal(1)
    expect(responseStub.status.firstCall.args).to.deep.equal([StatusCodes.FORBIDDEN])
  })
  it('should json error for directory traversal attempt', async () => {
    requestStub.params = ['/foo/../bar/']
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
  it('should return status NOT_FOUND for missing folder', async () => {
    getListingStub.resolves(null)
    await routeHandler(requestFake, responseFake)
    expect(responseStub.status.callCount).to.equal(1)
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
    expect(responseStub.json.callCount).to.equal(1)
    expect(responseStub.json.firstCall.args).to.have.lengthOf(1)
    expect(responseStub.json.firstCall.args[0]).to.deep.equal(err)
  })
  it('should respond with error message on error', async () => {
    const err = new Error('Evil Error!')
    getListingStub.rejects(err)
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
    getListingStub.rejects(err)
    const bodyData = { Body: Math.random() }
    requestStub.body = bodyData
    requestStub.originalUrl = '/'
    await routeHandler(requestFake, responseFake)
    expect(loggerStub.callCount).to.be.greaterThanOrEqual(1)
    expect(loggerStub.firstCall.args).to.have.lengthOf(2)
    expect(loggerStub.firstCall.args[0]).to.equal('Error rendering: /')
    expect(loggerStub.firstCall.args[1]).to.equal(bodyData)
  })
  it('should log error on error', async () => {
    const err = new Error('Evil Error!')
    getListingStub.rejects(err)
    await routeHandler(requestFake, responseFake)
    expect(loggerStub.callCount).to.be.greaterThanOrEqual(1)
    expect(loggerStub.lastCall.args).to.have.lengthOf(1)
    expect(loggerStub.lastCall.args[0]).to.equal(err)
  })
})

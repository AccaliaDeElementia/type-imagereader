'use sanity'

import { expect } from 'chai'
import Sinon from 'sinon'
import type { Application, RequestHandler as ExpressRequestHandler, Response as ExpressResponse, Router } from 'express'
import type { Server } from 'node:http'
import type { Server as WebSocketServer } from 'socket.io'
import { getRouter, Imports } from '#routes/api.js'
import persistance from '#utils/persistance.js'
import { StatusCodes } from 'http-status-codes'
import { Cast } from '#testutils/TypeGuards.js'
import type { Debugger } from 'debug'
import { createResponseFake } from '#testutils/Express.js'

const sandbox = Sinon.createSandbox()

type RequestHandler = (req: Request, res: ExpressResponse) => Promise<void>

describe('routes/api route GET /healthcheck', () => {
  let requestStub = {
    body: { Body: -1 },
    originalUrl: '/',
  }
  let requestFake = Cast<Request>(requestStub)
  let { stub: responseStub, fake: responseFake } = createResponseFake()
  let routeHandler = Cast<RequestHandler>(sandbox.stub().throws('WRONG CALL'))
  beforeEach(async () => {
    requestStub = {
      body: { Body: -1 },
      originalUrl: '/',
    }
    requestFake = Cast<Request>(requestStub)
    ;({ stub: responseStub, fake: responseFake } = createResponseFake())
    const getFn = sandbox.stub()
    const InitializeStub = sandbox.stub(persistance, 'initialize').resolves()
    const MakeRouterStub = sandbox.stub(Imports, 'Router').returns(
      Cast<Router>({
        get: getFn,
        post: sandbox.stub(),
      }),
    )
    sandbox.stub(Imports, 'debug').returns(Cast<Debugger>(sandbox.stub()))
    sandbox.stub(Imports, 'handleErrors').callsFake((_logger, action) => Cast<ExpressRequestHandler>(action))
    await getRouter(Cast<Application>(null), Cast<Server>(null), Cast<WebSocketServer>(null))
    routeHandler = Cast(
      getFn.getCalls().find((call) => call.args[0] === '/healthcheck')?.args[1],
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
  it('should return `OK`', async () => {
    await routeHandler(requestFake, responseFake)
    expect(responseStub.send.firstCall.args).to.deep.equal(['OK'])
  })
})

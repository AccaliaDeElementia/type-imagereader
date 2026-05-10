'use sanity'

import Sinon from 'sinon'
import type { Application, RequestHandler as ExpressRequestHandler, Response as ExpressResponse, Router } from 'express'
import type { Server } from 'node:http'
import type { Server as WebSocketServer } from 'socket.io'
import { getRouter, Imports } from '#routes/api.js'
import { StatusCodes } from 'http-status-codes'
import { cast } from '#testutils/typeGuards.js'
import { stubDebug } from '#testutils/debug.js'
import { createResponseFake } from '#testutils/express.js'

const sandbox = Sinon.createSandbox()

type RequestHandler = (req: Request, res: ExpressResponse) => Promise<void>

describe('routes/api route GET /', () => {
  let requestStub = {
    body: { Body: -1 },
    originalUrl: '/',
  }
  let requestFake = cast<Request>(requestStub)
  let { stub: responseStub, fake: responseFake } = createResponseFake()
  let routeHandler = cast<RequestHandler>(sandbox.stub().throws('WRONG CALL'))
  beforeEach(async () => {
    requestStub = {
      body: { Body: -1 },
      originalUrl: '/',
    }
    requestFake = cast<Request>(requestStub)
    ;({ stub: responseStub, fake: responseFake } = createResponseFake())
    const getFn = sandbox.stub()
    const InitializeStub = sandbox.stub(Imports, 'initialize').resolves()
    const MakeRouterStub = sandbox.stub(Imports, 'Router').returns(
      cast<Router>({
        get: getFn,
        post: sandbox.stub(),
      }),
    )
    stubDebug(sandbox, Imports)
    sandbox.stub(Imports, 'handleErrors').callsFake((_logger, action) => cast<ExpressRequestHandler>(action))
    await getRouter(cast<Application>(null), cast<Server>(null), cast<WebSocketServer>(null))
    routeHandler = cast(
      getFn.getCalls().find((call) => call.args[0] === '/')?.args[1],
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
    expect(responseStub.status.firstCall.args).toEqual([StatusCodes.OK])
  })
  it('should return JSON data', async () => {
    await routeHandler(requestFake, responseFake)
    expect(responseStub.json.firstCall.args).toEqual([{ title: 'API' }])
  })
})

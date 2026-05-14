'use sanity'

import type { Application, RequestHandler as ExpressRequestHandler, Response as ExpressResponse, Router } from 'express'
import type { Server } from 'node:http'
import type { Server as WebSocketServer } from 'socket.io'
import { getRouter, Imports } from '#routes/api.js'
import { StatusCodes } from 'http-status-codes'
import { cast, stubToKnex } from '#testutils/typeGuards.js'
import { stubDebug } from '#testutils/debug.js'
import { createResponseFake } from '#testutils/express.js'

type RequestHandler = (req: Request, res: ExpressResponse) => Promise<void>

describe('routes/api route GET /', () => {
  let requestStub = {
    body: { Body: -1 },
    originalUrl: '/',
  }
  let requestFake = cast<Request>(requestStub)
  let { stub: responseStub, fake: responseFake } = createResponseFake()
  let routeHandler = cast<RequestHandler>(
    vi.fn().mockImplementation(() => {
      throw cast<Error>('WRONG CALL')
    }),
  )
  beforeEach(async () => {
    requestStub = {
      body: { Body: -1 },
      originalUrl: '/',
    }
    requestFake = cast<Request>(requestStub)
    ;({ stub: responseStub, fake: responseFake } = createResponseFake())
    const getFn = vi.fn()
    const InitializeStub = vi.spyOn(Imports, 'initialize').mockResolvedValue(stubToKnex({}))
    const MakeRouterStub = vi.spyOn(Imports, 'Router').mockReturnValue(
      cast<Router>({
        get: getFn,
        post: vi.fn(),
      }),
    )
    stubDebug(Imports)
    vi.spyOn(Imports, 'handleErrors').mockImplementation((_logger, action) => cast<ExpressRequestHandler>(action))
    await getRouter(cast<Application>(null), cast<Server>(null), cast<WebSocketServer>(null))
    routeHandler = cast(
      getFn.mock.calls.find((call) => call[0] === '/')?.[1],
      (fn): fn is RequestHandler => fn !== null,
    )
    InitializeStub.mockRestore()
    MakeRouterStub.mockRestore()
  })
  afterEach(() => {
    vi.restoreAllMocks()
  })
  it('should return status OK', async () => {
    await routeHandler(requestFake, responseFake)
    expect(responseStub.status.mock.calls[0]).toEqual([StatusCodes.OK])
  })
  it('should return JSON data', async () => {
    await routeHandler(requestFake, responseFake)
    expect(responseStub.json.mock.calls[0]).toEqual([{ title: 'API' }])
  })
})

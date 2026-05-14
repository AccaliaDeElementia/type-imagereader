'use sanity'

import type { Application, RequestHandler as ExpressRequestHandler, Response as ExpressResponse, Router } from 'express'
import type { Server } from 'node:http'
import type { Server as WebSocketServer } from 'socket.io'
import { getRouter, Imports } from '#routes/api.js'
import { cast, stubToKnex } from '#testutils/typeGuards.js'
import { stubDebug } from '#testutils/debug.js'
import { createResponseFake } from '#testutils/express.js'
import type { MockInstance } from 'vitest'

type RequestHandler = (req: Request, res: ExpressResponse) => Promise<void>

describe('routes/api route GET /bookmarks', () => {
  let getBookmarkStub: MockInstance = vi.fn()
  let requestStub = {
    body: {},
    originalUrl: '/',
  }
  let requestFake = cast<Request>(requestStub)
  let { stub: responseStub, fake: responseFake } = createResponseFake()
  let routeHandler = cast<RequestHandler>(
    vi.fn().mockImplementation(() => {
      throw cast<Error>('WRONG CALL')
    }),
  )
  let loggerStub: MockInstance = vi.fn()
  let knexFake = { Knex: Math.random() }
  beforeEach(async () => {
    requestStub = {
      body: {},
      originalUrl: '/',
    }
    requestFake = cast<Request>(requestStub)
    ;({ stub: responseStub, fake: responseFake } = createResponseFake())
    const getFn = vi.fn()
    knexFake = { Knex: Math.random() }
    const InitializeStub = vi.spyOn(Imports, 'initialize').mockResolvedValue(stubToKnex(knexFake))
    const MakeRouterStub = vi.spyOn(Imports, 'Router').mockReturnValue(
      cast<Router>({
        get: getFn,
        post: vi.fn(),
      }),
    )
    getBookmarkStub = vi.spyOn(Imports, 'getBookmarks').mockResolvedValue([])
    ;({ loggerStub } = stubDebug(Imports))
    vi.spyOn(Imports, 'handleErrors').mockImplementation((_logger, action) => cast<ExpressRequestHandler>(action))
    await getRouter(cast<Application>(null), cast<Server>(null), cast<WebSocketServer>(null))
    const fn = getFn.mock.calls.find((call) => call[0] === '/bookmarks')?.[1] as unknown
    routeHandler = cast(fn, (fn): fn is RequestHandler => typeof fn === 'function')
    InitializeStub.mockRestore()
    MakeRouterStub.mockRestore()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })
  it('should pass bookmarks to json response', async () => {
    const bookmarks = { Bookmarks: Math.random() }
    getBookmarkStub.mockResolvedValue(bookmarks)
    await routeHandler(requestFake, responseFake)
    expect(responseStub.json.mock.calls[0]?.[0]).toBe(bookmarks)
  })
  it('should pass knex to getBookmarks', async () => {
    await routeHandler(requestFake, responseFake)
    expect(getBookmarkStub.mock.calls[0]?.[0]).toBe(knexFake)
  })
  it('should log on entry to bookmarks handler', async () => {
    await routeHandler(requestFake, responseFake)
    const matched = loggerStub.mock.calls.some((c) => String(c[0]).includes('GET /bookmarks'))
    expect(matched).toBe(true)
  })
})

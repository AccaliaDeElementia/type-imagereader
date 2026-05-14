'use sanity'

import type { Application, RequestHandler as ExpressRequestHandler, Response as ExpressResponse, Router } from 'express'
import type { Server } from 'node:http'
import type { Server as WebSocketServer } from 'socket.io'
import { getRouter, Imports } from '#routes/api.js'
import { StatusCodes } from 'http-status-codes'
import { cast, stubToKnex } from '#testutils/typeGuards.js'
import { stubDebug } from '#testutils/debug.js'
import { createResponseFake } from '#testutils/express.js'
import type { MockInstance } from 'vitest'

type RequestHandler = (req: Request, res: ExpressResponse) => Promise<void>

describe('routes/api route GET /listing', () => {
  let requestStub = {
    params: { path: undefined as string | string[] | undefined },
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
  let isPathTraversalStub: MockInstance = vi.fn()
  let getListingStub: MockInstance = vi.fn()
  let loggerStub: MockInstance = vi.fn()
  let knexFake = { Knex: Math.random() }
  beforeEach(async () => {
    requestStub = {
      params: { path: undefined },
      body: { Body: -1 },
      originalUrl: '/',
    }
    requestFake = cast<Request>(requestStub)
    ;({ stub: responseStub, fake: responseFake } = createResponseFake())
    knexFake = { Knex: Math.random() }
    const getFn = vi.fn()
    const InitializeStub = vi.spyOn(Imports, 'initialize').mockResolvedValue(stubToKnex(knexFake))
    const MakeRouterStub = vi.spyOn(Imports, 'Router').mockReturnValue(
      cast<Router>({
        get: getFn,
        post: vi.fn(),
      }),
    )
    getListingStub = vi.spyOn(Imports, 'getListing').mockResolvedValue(null)
    ;({ loggerStub } = stubDebug(Imports))
    vi.spyOn(Imports, 'handleErrors').mockImplementation((_logger, action) => cast<ExpressRequestHandler>(action))
    isPathTraversalStub = vi.spyOn(Imports, 'isPathTraversal').mockReturnValue(false)
    await getRouter(cast<Application>(null), cast<Server>(null), cast<WebSocketServer>(null))
    routeHandler = cast(
      getFn.mock.calls.find((call) => call[0] === '/listing')?.[1],
      (fn): fn is RequestHandler => fn !== null,
    )
    InitializeStub.mockRestore()
    MakeRouterStub.mockRestore()
  })
  it('should return status OK', async () => {
    getListingStub.mockResolvedValue({})
    await routeHandler(requestFake, responseFake)
    expect(responseStub.status.mock.calls[0]).toEqual([StatusCodes.OK])
  })
  it('should json send listing response', async () => {
    const listing = { listing: Math.random() }
    getListingStub.mockResolvedValue(listing)
    await routeHandler(requestFake, responseFake)
    expect(responseStub.json.mock.calls[0]?.[0]).toBe(listing)
  })
  it('should pass Knex to getListing', async () => {
    requestStub.params.path = []
    await routeHandler(requestFake, responseFake)
    expect(getListingStub.mock.calls[0]?.[0]).toBe(knexFake)
  })
  it('should retrieve implicit root listing', async () => {
    requestStub.params.path = []
    await routeHandler(requestFake, responseFake)
    expect(getListingStub.mock.calls[0]?.[1]).toBe('/')
  })
  it('should retrieve explicit root listing', async () => {
    requestStub.params.path = ['']
    await routeHandler(requestFake, responseFake)
    expect(getListingStub.mock.calls[0]?.[1]).toBe('/')
  })
  it('should retrieve web path listing for string', async () => {
    requestStub.params.path = 'foo/a bar/baz'
    await routeHandler(requestFake, responseFake)
    expect(getListingStub.mock.calls[0]?.[1]).toBe('/foo/a bar/baz/')
  })
  it('should retrieve web path listing for string array', async () => {
    requestStub.params.path = ['foo', 'a bar', 'baz']
    await routeHandler(requestFake, responseFake)
    expect(getListingStub.mock.calls[0]?.[1]).toBe('/foo/a bar/baz/')
  })
  it('should not call getListing when isPathTraversal returns true', async () => {
    isPathTraversalStub.mockReturnValue(true)
    await routeHandler(requestFake, responseFake)
    expect(getListingStub.mock.calls.length).toBe(0)
  })
  it('should return status FORBIDDEN when isPathTraversal returns true', async () => {
    isPathTraversalStub.mockReturnValue(true)
    await routeHandler(requestFake, responseFake)
    expect(responseStub.status.mock.calls[0]).toEqual([StatusCodes.FORBIDDEN])
  })
  it('should return E_NO_TRAVERSE json error when isPathTraversal returns true', async () => {
    isPathTraversalStub.mockReturnValue(true)
    await routeHandler(requestFake, responseFake)
    expect(responseStub.json.mock.calls[0]?.[0]).toHaveProperty('error.code', 'E_NO_TRAVERSE')
  })
  it('should return status NOT_FOUND for missing folder', async () => {
    getListingStub.mockResolvedValue(null)
    await routeHandler(requestFake, responseFake)
    expect(responseStub.status.mock.calls[0]).toEqual([StatusCodes.NOT_FOUND])
  })
  it('should json error for missing folder', async () => {
    const err = {
      error: {
        code: 'E_NOT_FOUND',
        message: 'Directory Not Found!',
        path: '/',
      },
    }
    getListingStub.mockResolvedValue(null)
    await routeHandler(requestFake, responseFake)
    expect(responseStub.json.mock.calls[0]?.[0]).toEqual(err)
  })
  it('should log on entry to listing handler', async () => {
    getListingStub.mockResolvedValue({})
    await routeHandler(requestFake, responseFake)
    const matched = loggerStub.mock.calls.some((c) => String(c[0]).includes('GET /listing'))
    expect(matched).toBe(true)
  })
  it('should log a path traversal attempt', async () => {
    isPathTraversalStub.mockReturnValue(true)
    await routeHandler(requestFake, responseFake)
    const matched = loggerStub.mock.calls.some((c) => String(c[0]).includes('path traversal blocked'))
    expect(matched).toBe(true)
  })
  it('should log when listing is not found', async () => {
    getListingStub.mockResolvedValue(null)
    await routeHandler(requestFake, responseFake)
    const matched = loggerStub.mock.calls.some((c) => String(c[0]).includes('listing not found'))
    expect(matched).toBe(true)
  })
})

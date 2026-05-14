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

describe('routes/api route POST /mark/read', () => {
  let requestStub = {
    body: {
      path: '/image.png',
    },
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
  let markFolderSeenStub: MockInstance = vi.fn()
  let loggerStub: MockInstance = vi.fn()
  let knexFake = { Knex: Math.random() }
  beforeEach(async () => {
    requestStub = {
      body: {
        path: '/image.png',
      },
      originalUrl: '/',
    }
    requestFake = cast<Request>(requestStub)
    ;({ stub: responseStub, fake: responseFake } = createResponseFake())
    knexFake = { Knex: Math.random() }
    const postFn = vi.fn()
    const InitializeStub = vi.spyOn(Imports, 'initialize').mockResolvedValue(stubToKnex(knexFake))
    const MakeRouterStub = vi.spyOn(Imports, 'Router').mockReturnValue(
      cast<Router>({
        post: postFn,
        get: vi.fn(),
      }),
    )
    markFolderSeenStub = vi.spyOn(Imports, 'markFolderSeen').mockResolvedValue(undefined)
    ;({ loggerStub } = stubDebug(Imports))
    vi.spyOn(Imports, 'handleErrors').mockImplementation((_logger, action) => cast<ExpressRequestHandler>(action))
    isPathTraversalStub = vi.spyOn(Imports, 'isPathTraversal').mockReturnValue(false)
    await getRouter(cast<Application>(null), cast<Server>(null), cast<WebSocketServer>(null))
    routeHandler = cast(
      postFn.mock.calls.find((call) => call[0] === '/mark/read')?.[1],
      (fn): fn is RequestHandler => fn !== null,
    )
    InitializeStub.mockRestore()
    MakeRouterStub.mockRestore()
  })
  it('should return status OK', async () => {
    await routeHandler(requestFake, responseFake)
    expect(responseStub.status.mock.calls[0]).toEqual([StatusCodes.OK])
  })
  it('should return empty response body on success', async () => {
    await routeHandler(requestFake, responseFake)
    expect(responseStub.end.mock.calls[0]).toHaveLength(0)
  })
  it('should call markFolderSeen with knex instance', async () => {
    requestStub.body.path = 'foo/a%20bar/baz'
    await routeHandler(requestFake, responseFake)
    expect(markFolderSeenStub.mock.calls[0]?.[0]).toBe(knexFake)
  })
  it('should call markFolderSeen with decoded path', async () => {
    requestStub.body.path = 'foo/a%20bar/baz'
    await routeHandler(requestFake, responseFake)
    expect(markFolderSeenStub.mock.calls[0]?.[1]).toBe('/foo/a bar/baz/')
  })
  it('should call markFolderSeen with markAsSeen true', async () => {
    requestStub.body.path = 'foo/a%20bar/baz'
    await routeHandler(requestFake, responseFake)
    expect(markFolderSeenStub.mock.calls[0]?.[2]).toBe(true)
  })
  it('should not call markFolderSeen when isPathTraversal returns true', async () => {
    isPathTraversalStub.mockReturnValue(true)
    await routeHandler(requestFake, responseFake)
    expect(markFolderSeenStub.mock.calls.length).toBe(0)
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
  it('should log on entry to mark/read handler', async () => {
    await routeHandler(requestFake, responseFake)
    const matched = loggerStub.mock.calls.some((c) => String(c[0]).includes('POST /mark/read'))
    expect(matched).toBe(true)
  })
})

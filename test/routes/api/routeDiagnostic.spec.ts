'use sanity'

import type { Application, RequestHandler as ExpressRequestHandler, Response as ExpressResponse, Router } from 'express'
import type { Debugger } from 'debug'
import type { Server } from 'node:http'
import type { Server as WebSocketServer } from 'socket.io'
import { getRouter, Imports } from '#routes/api.js'
import { StatusCodes } from 'http-status-codes'
import { cast, stubToKnex } from '#testutils/typeGuards.js'
import { createResponseFake } from '#testutils/express.js'
import type { MockInstance } from 'vitest'

type RequestHandler = (req: Request, res: ExpressResponse) => Promise<void>

describe('routes/api route POST /diagnostic', () => {
  let requestStub: { body: unknown; originalUrl: string } = { body: { topic: 'X', data: {} }, originalUrl: '/' }
  let requestFake = cast<Request>(requestStub)
  let { stub: responseStub, fake: responseFake } = createResponseFake()
  let routeHandler = cast<RequestHandler>(
    vi.fn().mockImplementation(() => {
      throw cast<Error>('WRONG CALL')
    }),
  )
  let diagnosticLoggerStub: MockInstance = vi.fn()
  let debugStub: MockInstance = vi.fn()
  beforeEach(async () => {
    requestStub = { body: { topic: 'X', data: {} }, originalUrl: '/' }
    requestFake = cast<Request>(requestStub)
    ;({ stub: responseStub, fake: responseFake } = createResponseFake())
    const postFn = vi.fn()
    const InitializeStub = vi.spyOn(Imports, 'initialize').mockResolvedValue(stubToKnex({}))
    const MakeRouterStub = vi.spyOn(Imports, 'Router').mockReturnValue(
      cast<Router>({
        post: postFn,
        get: vi.fn(),
      }),
    )
    diagnosticLoggerStub = vi.fn()
    debugStub = vi.spyOn(Imports, 'debug').mockImplementation((namespace: string) => {
      if (namespace === 'type-imagereader:diagnostic') return cast<Debugger>(diagnosticLoggerStub)
      return cast<Debugger>(vi.fn())
    })
    vi.spyOn(Imports, 'handleErrors').mockImplementation((_logger, action) => cast<ExpressRequestHandler>(action))
    await getRouter(cast<Application>(null), cast<Server>(null), cast<WebSocketServer>(null))
    routeHandler = cast(
      postFn.mock.calls.find((call) => call[0] === '/diagnostic')?.[1],
      (fn): fn is RequestHandler => fn !== null,
    )
    InitializeStub.mockRestore()
    MakeRouterStub.mockRestore()
  })
  it('should return status NO_CONTENT', async () => {
    await routeHandler(requestFake, responseFake)
    expect(responseStub.status.mock.calls[0]).toEqual([StatusCodes.NO_CONTENT])
  })
  it('should return empty response body', async () => {
    await routeHandler(requestFake, responseFake)
    expect(responseStub.end.mock.calls[0]).toHaveLength(0)
  })
  it('should construct a logger with the type-imagereader:diagnostic namespace', async () => {
    await routeHandler(requestFake, responseFake)
    expect(debugStub.mock.calls.some((c) => c[0] === 'type-imagereader:diagnostic')).toBe(true)
  })
  it('should forward request body to the diagnostic logger', async () => {
    const body = { topic: `A-${Math.random()}`, data: { value: Math.random() } }
    requestStub.body = body
    await routeHandler(requestFake, responseFake)
    expect(diagnosticLoggerStub.mock.calls.some((c) => c.includes(body))).toBe(true)
  })
})

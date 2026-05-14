'use sanity'

import type { Application, RequestHandler as ExpressRequestHandler, Response as ExpressResponse, Router } from 'express'
import type { Server } from 'node:http'
import type { Server as WebSocketServer } from 'socket.io'
import { ModCount } from '#routes/apiFunctions.js'
import { getRouter, Imports } from '#routes/api.js'
import { StatusCodes } from 'http-status-codes'
import { cast, stubToKnex } from '#testutils/typeGuards.js'
import { stubDebug } from '#testutils/debug.js'
import { createResponseFake } from '#testutils/express.js'
import type { MockInstance } from 'vitest'

type RequestHandler = (req: Request, res: ExpressResponse) => Promise<void>

describe('routes/api route POST /navigate/latest', () => {
  let requestStub = {
    body: {
      modCount: 0,
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
  let setLatestPictureStub: MockInstance = vi.fn()
  let validateAndIncrementStub: MockInstance = vi.fn()
  let getModcountStub: MockInstance = vi.fn()
  let loggerStub: MockInstance = vi.fn()
  let knexFake = { Knex: Math.random() }
  beforeEach(async () => {
    requestStub = {
      body: {
        modCount: 0,
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
    setLatestPictureStub = vi.spyOn(Imports, 'setLatestPicture').mockResolvedValue(null)
    validateAndIncrementStub = vi.spyOn(ModCount, 'validateAndIncrement').mockReturnValue(1)
    getModcountStub = vi.spyOn(ModCount, 'get').mockReturnValue(69)
    ;({ loggerStub } = stubDebug(Imports))
    vi.spyOn(Imports, 'handleErrors').mockImplementation((_logger, action) => cast<ExpressRequestHandler>(action))
    isPathTraversalStub = vi.spyOn(Imports, 'isPathTraversal').mockReturnValue(false)
    await getRouter(cast<Application>(null), cast<Server>(null), cast<WebSocketServer>(null))
    routeHandler = cast(
      postFn.mock.calls.find((call) => call[0] === '/navigate/latest')?.[1],
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
  it('should set status BAD_REQUEST when modcount is invalid', async () => {
    validateAndIncrementStub.mockReturnValue(null)
    await routeHandler(requestFake, responseFake)
    expect(responseStub.status.mock.calls[0]).toEqual([StatusCodes.BAD_REQUEST])
  })
  it('should accept missing modcount and handle as invalid modcount', async () => {
    validateAndIncrementStub.mockReturnValue(null)
    await routeHandler(requestFake, responseFake)
    expect(responseStub.send.mock.calls[0]).toEqual(['-1'])
  })
  it('should return new modcount when validate passes', async () => {
    validateAndIncrementStub.mockReturnValue(5050)
    const req = cast<Request>({ body: { path: '/image.png' }, originalUrl: '/' })
    await routeHandler(req, responseFake)
    expect(responseStub.send.mock.calls[0]).toEqual(['5050'])
  })
  it('should return Status OK when validate is bypassed', async () => {
    requestStub.body.modCount = -1
    await routeHandler(requestFake, responseFake)
    expect(responseStub.status.mock.calls[0]).toEqual([StatusCodes.OK])
  })
  it('should return invalid modcount when validate is bypassed', async () => {
    requestStub.body.modCount = -1
    await routeHandler(requestFake, responseFake)
    expect(responseStub.send.mock.calls[0]).toEqual(['-1'])
  })
  it('should call setLatestPicture when validate is bypassed', async () => {
    validateAndIncrementStub.mockReturnValue(null)
    requestStub.body.modCount = -1
    requestStub.body.path = 'foo/bar/a%20image.png'
    await routeHandler(requestFake, responseFake)
    expect(setLatestPictureStub.mock.calls[0]).toEqual([knexFake, '/foo/bar/a image.png'])
  })
  it('should not call validateAndIncrement when validate is bypassed', async () => {
    requestStub.body.modCount = -1
    await routeHandler(requestFake, responseFake)
    expect(validateAndIncrementStub.mock.calls.length).toBe(0)
  })
  it('should not call get when validate is bypassed', async () => {
    requestStub.body.modCount = -1
    await routeHandler(requestFake, responseFake)
    expect(getModcountStub.mock.calls.length).toBe(0)
  })
  it('should call setLatestPicture when validate passes', async () => {
    validateAndIncrementStub.mockReturnValue(5050)
    requestStub.body.path = 'foo/bar/a%20image.png'
    await routeHandler(requestFake, responseFake)
    expect(setLatestPictureStub.mock.calls[0]).toEqual([knexFake, '/foo/bar/a image.png'])
  })
  it('should set status BAD_REQUEST when validate fails', async () => {
    validateAndIncrementStub.mockReturnValue(null)
    getModcountStub.mockReturnValue(69_420)
    await routeHandler(requestFake, responseFake)
    expect(responseStub.status.mock.calls[0]).toEqual([StatusCodes.BAD_REQUEST])
  })
  it('should return invalid when validate fails', async () => {
    validateAndIncrementStub.mockReturnValue(null)
    getModcountStub.mockReturnValue(69_420)
    await routeHandler(requestFake, responseFake)
    expect(responseStub.send.mock.calls[0]).toEqual(['-1'])
  })
  it('should not call setLatestPicture when validate fails', async () => {
    validateAndIncrementStub.mockReturnValue(null)
    requestStub.body.path = 'foo/bar/a%20image.png'
    await routeHandler(requestFake, responseFake)
    expect(setLatestPictureStub.mock.calls.length).toBe(0)
  })
  it('should not call setLatestPicture when isPathTraversal returns true', async () => {
    isPathTraversalStub.mockReturnValue(true)
    await routeHandler(requestFake, responseFake)
    expect(setLatestPictureStub.mock.calls.length).toBe(0)
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
  it('should log on entry to navigate/latest handler', async () => {
    await routeHandler(requestFake, responseFake)
    const matched = loggerStub.mock.calls.some((c) => String(c[0]).includes('POST /navigate/latest'))
    expect(matched).toBe(true)
  })
  it('should log when modcount validation fails', async () => {
    validateAndIncrementStub.mockReturnValue(null)
    await routeHandler(requestFake, responseFake)
    const matched = loggerStub.mock.calls.some((c) => String(c[0]).includes('modcount mismatch'))
    expect(matched).toBe(true)
  })
})

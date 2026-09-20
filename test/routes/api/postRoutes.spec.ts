'use sanity'

import type { Application, RequestHandler as ExpressRequestHandler, Response as ExpressResponse, Router } from 'express'
import type { Server } from 'node:http'
import type { Server as WebSocketServer } from 'socket.io'
import { getRouter, Imports } from '#routes/api.js'
import { StatusCodes } from 'http-status-codes'
import { cast, stubToKnex } from '#testutils/typeGuards.js'
import { stubLoggerFactory } from '#testutils/debug.js'
import { createResponseFake } from '#testutils/express.js'
import type { MockInstance } from 'vitest'

type RequestHandler = (req: Request, res: ExpressResponse) => Promise<void>
interface RequestStub {
  body: { path: string }
  originalUrl: string
}

interface MountedRoute {
  routeHandler: RequestHandler
  requestStub: RequestStub
  requestFake: Request
  responseStub: ReturnType<typeof createResponseFake>['stub']
  responseFake: ExpressResponse
  handlerStub: MockInstance
  isBlockedTraversalStub: MockInstance
  loggerStub: MockInstance
  knexFake: { Knex: number }
}

const mountPostRoute = async (route: string, stubHandler: () => MockInstance): Promise<MountedRoute> => {
  const requestStub: RequestStub = { body: { path: '/image.png' }, originalUrl: '/' }
  const { stub: responseStub, fake: responseFake } = createResponseFake()
  const knexFake = { Knex: Math.random() }
  const postFn = vi.fn()
  const initializeStub = vi.spyOn(Imports, 'initialize').mockResolvedValue(stubToKnex(knexFake))
  const makeRouterStub = vi.spyOn(Imports, 'Router').mockReturnValue(
    cast<Router>({
      post: postFn,
      get: vi.fn(),
    }),
  )
  const handlerStub = stubHandler()
  const { loggerStub } = stubLoggerFactory(Imports)
  vi.spyOn(Imports, 'handleErrors').mockImplementation((_logger, action) => cast<ExpressRequestHandler>(action))
  const isBlockedTraversalStub = vi.spyOn(Imports, 'isBlockedTraversal').mockReturnValue(false)
  await getRouter(cast<Application>(null), cast<Server>(null), cast<WebSocketServer>(null))
  const routeHandler = cast<RequestHandler>(
    postFn.mock.calls.find((call) => call[0] === route)?.[1],
    (fn): fn is RequestHandler => fn !== null,
  )
  initializeStub.mockRestore()
  makeRouterStub.mockRestore()
  return {
    routeHandler,
    requestStub,
    requestFake: cast<Request>(requestStub),
    responseStub,
    responseFake,
    handlerStub,
    isBlockedTraversalStub,
    loggerStub,
    knexFake,
  }
}

interface PostRouteCase {
  route: string
  handlerName: string
  stubHandler: () => MockInstance
  inputPath: string
  expectedPath: string
}

const postRoutes: PostRouteCase[] = [
  {
    route: '/mark/read',
    handlerName: 'markFolderSeen',
    stubHandler: () => vi.spyOn(Imports, 'markFolderSeen').mockResolvedValue(undefined),
    inputPath: 'foo/a%20bar/baz',
    expectedPath: '/foo/a bar/baz/',
  },
  {
    route: '/mark/unread',
    handlerName: 'markFolderSeen',
    stubHandler: () => vi.spyOn(Imports, 'markFolderSeen').mockResolvedValue(undefined),
    inputPath: 'foo/a%20bar/baz',
    expectedPath: '/foo/a bar/baz/',
  },
  {
    route: '/bookmarks/add',
    handlerName: 'addBookmark',
    stubHandler: () => vi.spyOn(Imports, 'addBookmark').mockResolvedValue(undefined),
    inputPath: 'foo/a%20bar/baz.gif',
    expectedPath: '/foo/a bar/baz.gif',
  },
  {
    route: '/bookmarks/remove',
    handlerName: 'removeBookmark',
    stubHandler: () => vi.spyOn(Imports, 'removeBookmark').mockResolvedValue(undefined),
    inputPath: 'foo/a%20bar/baz.gif',
    expectedPath: '/foo/a bar/baz.gif',
  },
]

describe.each(postRoutes)(
  'routes/api route POST $route',
  ({ route, handlerName, stubHandler, inputPath, expectedPath }: PostRouteCase) => {
    let mounted: MountedRoute = cast<MountedRoute>({})
    beforeEach(async () => {
      mounted = await mountPostRoute(route, stubHandler)
    })
    it('should return status OK', async () => {
      await mounted.routeHandler(mounted.requestFake, mounted.responseFake)
      expect(mounted.responseStub.status.mock.calls[0]).toEqual([StatusCodes.OK])
    })
    it('should return empty response body on success', async () => {
      await mounted.routeHandler(mounted.requestFake, mounted.responseFake)
      expect(mounted.responseStub.end.mock.calls[0]).toHaveLength(0)
    })
    it(`should call ${handlerName} with knex instance`, async () => {
      mounted.requestStub.body.path = inputPath
      await mounted.routeHandler(mounted.requestFake, mounted.responseFake)
      expect(mounted.handlerStub.mock.calls[0]?.[0]).toBe(mounted.knexFake)
    })
    it(`should call ${handlerName} with decoded path`, async () => {
      mounted.requestStub.body.path = inputPath
      await mounted.routeHandler(mounted.requestFake, mounted.responseFake)
      expect(mounted.handlerStub.mock.calls[0]?.[1]).toBe(expectedPath)
    })
    it(`should not call ${handlerName} when isBlockedTraversal returns true`, async () => {
      mounted.isBlockedTraversalStub.mockReturnValue(true)
      await mounted.routeHandler(mounted.requestFake, mounted.responseFake)
      expect(mounted.handlerStub.mock.calls.length).toBe(0)
    })
    it('should return status FORBIDDEN when isBlockedTraversal returns true', async () => {
      mounted.isBlockedTraversalStub.mockReturnValue(true)
      await mounted.routeHandler(mounted.requestFake, mounted.responseFake)
      expect(mounted.responseStub.status.mock.calls[0]).toEqual([StatusCodes.FORBIDDEN])
    })
    it('should return E_NO_TRAVERSE json error when isBlockedTraversal returns true', async () => {
      mounted.isBlockedTraversalStub.mockReturnValue(true)
      await mounted.routeHandler(mounted.requestFake, mounted.responseFake)
      expect(mounted.responseStub.json.mock.calls[0]?.[0]).toHaveProperty('error.code', 'E_NO_TRAVERSE')
    })
    it(`should log on entry to the ${route} handler`, async () => {
      await mounted.routeHandler(mounted.requestFake, mounted.responseFake)
      const matched = mounted.loggerStub.mock.calls.some((c) => String(c[0]).includes(`POST ${route}`))
      expect(matched).toBe(true)
    })
  },
)

const markRoutes: Array<[string, boolean]> = [
  ['/mark/read', true],
  ['/mark/unread', false],
]

describe.each(markRoutes)('routes/api route POST %s seen flag', (route: string, markAsSeen: boolean) => {
  let mounted: MountedRoute = cast<MountedRoute>({})
  beforeEach(async () => {
    mounted = await mountPostRoute(route, () => vi.spyOn(Imports, 'markFolderSeen').mockResolvedValue(undefined))
  })
  it(`should call markFolderSeen with markAsSeen ${String(markAsSeen)}`, async () => {
    mounted.requestStub.body.path = 'foo/a%20bar/baz'
    await mounted.routeHandler(mounted.requestFake, mounted.responseFake)
    expect(mounted.handlerStub.mock.calls[0]?.[2]).toBe(markAsSeen)
  })
})

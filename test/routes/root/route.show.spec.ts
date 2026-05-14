'use sanity'

import type { Application, Response as ExpressResponse, Router } from 'express'
import type { Server as WebSocketServer } from 'socket.io'
import type { Server } from 'node:http'
import { getRouter, Imports } from '#routes/root.js'
import { StatusCodes } from 'http-status-codes'
import { cast } from '#testutils/typeGuards.js'
import { createResponseFake } from '#testutils/express.js'
import { voidFn } from '#testutils/mocks.js'
import type { MockInstance } from 'vitest'

describe('routes/root route /show', () => {
  let routeFn: (_: Request, __: ExpressResponse) => void = voidFn()
  let routeAltFn: (_: Request, __: ExpressResponse) => void = voidFn()
  let requestStub = { params: { path: undefined as string[] | string | undefined } }
  let requestFake = cast<Request>(requestStub)
  let { stub: resposeStub, fake: responseFake } = createResponseFake()
  let isPathTraversalStub: MockInstance = vi.fn()
  beforeEach(async () => {
    const applicationFake = cast<Application>({})
    const serverFake = cast<Server>({})
    const socketsFake = cast<WebSocketServer>({})
    const routerStub = { get: vi.fn() }
    let getRouterStub: MockInstance | undefined = undefined
    try {
      getRouterStub = vi.spyOn(Imports, 'Router').mockReturnValue(cast<Router>(routerStub))
      await getRouter(applicationFake, serverFake, socketsFake)
      routeFn = cast<(_: Request, __: ExpressResponse) => void>(
        routerStub.get.mock.calls.find((c) => c[0] === '/show')?.[1],
      )
      routeAltFn = cast<(_: Request, __: ExpressResponse) => void>(
        routerStub.get.mock.calls.find((c) => c[0] === '/show/*path')?.[1],
      )
    } finally {
      getRouterStub?.mockRestore()
    }
    isPathTraversalStub = vi.spyOn(Imports, 'isPathTraversal').mockReturnValue(false)
    requestStub = { params: { path: undefined } }
    requestFake = cast<Request>(requestStub)
    ;({ stub: resposeStub, fake: responseFake } = createResponseFake())
  })
  it("should alias same handler for both '/show' and '/show/*path' routes", () => {
    expect(routeFn).toBe(routeAltFn)
  })
  it('should return FORBIDDEN when isPathTraversal returns true', () => {
    isPathTraversalStub.mockReturnValue(true)
    routeFn(requestFake, responseFake)
    expect(resposeStub.status.mock.calls[0]).toEqual([StatusCodes.FORBIDDEN])
  })
  it('should render error template when isPathTraversal returns true', () => {
    isPathTraversalStub.mockReturnValue(true)
    routeFn(requestFake, responseFake)
    expect(resposeStub.render.mock.calls[0]?.[0]).toBe('error')
  })
  it('should render E_NO_TRAVERSE error data when isPathTraversal returns true', () => {
    isPathTraversalStub.mockReturnValue(true)
    routeFn(requestFake, responseFake)
    expect(resposeStub.render.mock.calls[0]?.[1]).toHaveProperty('error.code', 'E_NO_TRAVERSE')
  })
  it('should not render app when isPathTraversal returns true', () => {
    isPathTraversalStub.mockReturnValue(true)
    routeFn(requestFake, responseFake)
    expect(resposeStub.render.mock.calls[0]?.[0]).not.toBe('app')
  })
  const successPaths: Array<string | string[] | undefined> = [
    undefined,
    '',
    'foo/~bar',
    'this/is/a/valid/path',
    ['this', 'is', 'also', 'a', 'valid', 'path'],
  ]
  successPaths.forEach((path) => {
    it(`should render for '${JSON.stringify(path)}'`, () => {
      if (path === undefined) {
        requestStub.params.path = path
      }
      routeFn(requestFake, responseFake)
      expect(resposeStub.render.mock.calls.length).toBe(1)
    })
    it(`should render app for '${JSON.stringify(path)}'`, () => {
      if (path === undefined) {
        requestStub.params.path = path
      }
      routeFn(requestFake, responseFake)
      expect(resposeStub.render.mock.calls[0]).toEqual(['app'])
    })
    it(`should not set explicit status '${JSON.stringify(path)}'`, () => {
      if (path === undefined) {
        requestStub.params.path = path
      }
      routeFn(requestFake, responseFake)
      expect(resposeStub.status.mock.calls.length).toBe(0)
    })
  })

  describe('logging', () => {
    let loggerStub: MockInstance = vi.fn()
    const TRAVERSAL_FORMAT = 'path traversal blocked: %s'
    const isTraversalCall = (c: readonly unknown[]): boolean => c[0] === TRAVERSAL_FORMAT
    beforeEach(() => {
      loggerStub = vi.spyOn(Imports, 'logger').mockImplementation((..._args: unknown[]) => undefined)
    })

    it('should log GET-format on rootRoute invocation', () => {
      requestStub.params.path = 'foo/bar'
      routeFn(requestFake, responseFake)
      expect(loggerStub.mock.calls[0]?.[0]).toBe('GET %s')
    })

    it('should log the folder path on rootRoute invocation', () => {
      requestStub.params.path = 'foo/bar'
      routeFn(requestFake, responseFake)
      expect(loggerStub.mock.calls[0]?.[1]).toBe('/foo/bar')
    })

    it('should log path-traversal-blocked format when isPathTraversal returns true', () => {
      isPathTraversalStub.mockReturnValue(true)
      requestStub.params.path = 'evil'
      routeFn(requestFake, responseFake)
      const hasTraversalLog = loggerStub.mock.calls.some(isTraversalCall)
      expect(hasTraversalLog).toBe(true)
    })

    it('should log the blocked folder path when isPathTraversal returns true', () => {
      isPathTraversalStub.mockReturnValue(true)
      requestStub.params.path = 'evil'
      routeFn(requestFake, responseFake)
      const traversalCall = loggerStub.mock.calls.find(isTraversalCall)
      expect(traversalCall?.[1]).toBe('/evil')
    })
  })
})

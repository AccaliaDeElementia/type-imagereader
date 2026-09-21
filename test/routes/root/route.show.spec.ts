'use sanity'

import type { Application, Response as ExpressResponse, Router } from 'express'
import type { Server as WebSocketServer } from 'socket.io'
import type { Server } from 'node:http'
import type { Debugger } from 'debug'
import { getRouter, Imports } from '#routes/root.js'
import { StatusCodes } from 'http-status-codes'
import { cast, stubToKnex } from '#testutils/typeGuards.js'
import { createResponseFake } from '#testutils/express.js'
import type { MockInstance } from 'vitest'

type AsyncRouteFn = (_: Request, __: ExpressResponse) => Promise<void>

describe('routes/root route /show', () => {
  let routeFn: AsyncRouteFn = cast<AsyncRouteFn>(vi.fn().mockResolvedValue(undefined))
  let routeAltFn: AsyncRouteFn = cast<AsyncRouteFn>(vi.fn().mockResolvedValue(undefined))
  let requestStub = { params: { path: undefined as string[] | string | undefined } }
  let requestFake = cast<Request>(requestStub)
  let { stub: resposeStub, fake: responseFake } = createResponseFake()
  let isBlockedTraversalStub: MockInstance = vi.fn()
  let folderExistsStub: MockInstance = vi.fn()
  beforeEach(async () => {
    const applicationFake = cast<Application>({})
    const serverFake = cast<Server>({})
    const socketsFake = cast<WebSocketServer>({})
    const routerStub = { get: vi.fn() }
    let getRouterStub: MockInstance | undefined = undefined
    vi.spyOn(Imports, 'initialize').mockResolvedValue(stubToKnex(vi.fn()))
    try {
      getRouterStub = vi.spyOn(Imports, 'Router').mockReturnValue(cast<Router>(routerStub))
      await getRouter(applicationFake, serverFake, socketsFake)
      routeFn = cast<(_: Request, __: ExpressResponse) => Promise<void>>(
        routerStub.get.mock.calls.find((c) => c[0] === '/show')?.[1],
      )
      routeAltFn = cast<(_: Request, __: ExpressResponse) => Promise<void>>(
        routerStub.get.mock.calls.find((c) => c[0] === '/show/*path')?.[1],
      )
    } finally {
      getRouterStub?.mockRestore()
    }
    isBlockedTraversalStub = vi.spyOn(Imports, 'isBlockedTraversal').mockReturnValue(false)
    folderExistsStub = vi.spyOn(Imports, 'folderExists').mockResolvedValue(true)
    requestStub = { params: { path: undefined } }
    requestFake = cast<Request>(requestStub)
    ;({ stub: resposeStub, fake: responseFake } = createResponseFake())
  })
  it("should alias same handler for both '/show' and '/show/*path' routes", () => {
    expect(routeFn).toBe(routeAltFn)
  })
  it('should return FORBIDDEN when isBlockedTraversal returns true', async () => {
    isBlockedTraversalStub.mockReturnValue(true)
    await routeFn(requestFake, responseFake)
    expect(resposeStub.status.mock.calls[0]).toEqual([StatusCodes.FORBIDDEN])
  })
  it('should render error template when isBlockedTraversal returns true', async () => {
    isBlockedTraversalStub.mockReturnValue(true)
    await routeFn(requestFake, responseFake)
    expect(resposeStub.render.mock.calls[0]?.[0]).toBe('error')
  })
  it('should render E_NO_TRAVERSE error data when isBlockedTraversal returns true', async () => {
    isBlockedTraversalStub.mockReturnValue(true)
    await routeFn(requestFake, responseFake)
    expect(resposeStub.render.mock.calls[0]?.[1]).toHaveProperty('code', 'E_NO_TRAVERSE')
  })
  it('should not render app when isBlockedTraversal returns true', async () => {
    isBlockedTraversalStub.mockReturnValue(true)
    await routeFn(requestFake, responseFake)
    expect(resposeStub.render.mock.calls[0]?.[0]).not.toBe('app')
  })
  it('should return NOT_FOUND when folderExists returns false', async () => {
    folderExistsStub.mockResolvedValue(false)
    await routeFn(requestFake, responseFake)
    expect(resposeStub.status.mock.calls[0]).toEqual([StatusCodes.NOT_FOUND])
  })
  it('should render error template when folderExists returns false', async () => {
    folderExistsStub.mockResolvedValue(false)
    await routeFn(requestFake, responseFake)
    expect(resposeStub.render.mock.calls[0]?.[0]).toBe('error')
  })
  it('should render E_NOT_FOUND error data when folderExists returns false', async () => {
    folderExistsStub.mockResolvedValue(false)
    await routeFn(requestFake, responseFake)
    expect(resposeStub.render.mock.calls[0]?.[1]).toHaveProperty('code', 'E_NOT_FOUND')
  })
  it('should not render app when folderExists returns false', async () => {
    folderExistsStub.mockResolvedValue(false)
    await routeFn(requestFake, responseFake)
    expect(resposeStub.render.mock.calls[0]?.[0]).not.toBe('app')
  })
  it('should pass the folder-style path to folderExists', async () => {
    requestStub.params.path = 'foo/bar'
    await routeFn(requestFake, responseFake)
    expect(folderExistsStub.mock.calls[0]?.[1]).toBe('/foo/bar/')
  })
  it('should pass the root folder path to folderExists when path is undefined', async () => {
    requestStub.params.path = undefined
    await routeFn(requestFake, responseFake)
    expect(folderExistsStub.mock.calls[0]?.[1]).toBe('/')
  })
  const successPaths: Array<[string | string[] | undefined, string]> = [
    [undefined, '/'],
    ['', '/'],
    ['foo/~bar', '/foo/~bar/'],
    ['this/is/a/valid/path', '/this/is/a/valid/path/'],
    [['this', 'is', 'also', 'a', 'valid', 'path'], '/this/is/also/a/valid/path/'],
  ]
  successPaths.forEach(([path, expectedFolderPath]) => {
    it(`should resolve ${JSON.stringify(path)} to the folder path '${expectedFolderPath}'`, async () => {
      requestStub.params.path = path
      await routeFn(requestFake, responseFake)
      expect(folderExistsStub.mock.calls[0]?.[1]).toBe(expectedFolderPath)
    })
    it(`should render for '${JSON.stringify(path)}'`, async () => {
      requestStub.params.path = path
      await routeFn(requestFake, responseFake)
      expect(resposeStub.render.mock.calls.length).toBe(1)
    })
    it(`should render app for '${JSON.stringify(path)}'`, async () => {
      requestStub.params.path = path
      await routeFn(requestFake, responseFake)
      expect(resposeStub.render.mock.calls[0]).toEqual(['app'])
    })
    it(`should not set explicit status '${JSON.stringify(path)}'`, async () => {
      requestStub.params.path = path
      await routeFn(requestFake, responseFake)
      expect(resposeStub.status.mock.calls.length).toBe(0)
    })
  })

  describe('logging', () => {
    let loggerStub: MockInstance = vi.fn()
    const TRAVERSAL_FORMAT = 'path traversal blocked: %s'
    const isTraversalCall = (c: readonly unknown[]): boolean => c[0] === TRAVERSAL_FORMAT
    beforeEach(() => {
      loggerStub = vi.spyOn(Imports, 'logger').mockReturnValue(undefined)
    })

    it('should log GET-format on rootRoute invocation', async () => {
      requestStub.params.path = 'foo/bar'
      await routeFn(requestFake, responseFake)
      expect(loggerStub.mock.calls[0]?.[0]).toBe('GET %s')
    })

    it('should log the folder path on rootRoute invocation', async () => {
      requestStub.params.path = 'foo/bar'
      await routeFn(requestFake, responseFake)
      expect(loggerStub.mock.calls[0]?.[1]).toBe('/foo/bar')
    })

    it('should log path-traversal-blocked format when isBlockedTraversal returns true', async () => {
      isBlockedTraversalStub.mockImplementation((logger: Debugger, path: string): boolean => {
        logger('path traversal blocked: %s', path)
        return true
      })
      requestStub.params.path = 'evil'
      await routeFn(requestFake, responseFake)
      const hasTraversalLog = loggerStub.mock.calls.some(isTraversalCall)
      expect(hasTraversalLog).toBe(true)
    })

    it('should log the blocked folder path when isBlockedTraversal returns true', async () => {
      isBlockedTraversalStub.mockImplementation((logger: Debugger, path: string): boolean => {
        logger('path traversal blocked: %s', path)
        return true
      })
      requestStub.params.path = 'evil'
      await routeFn(requestFake, responseFake)
      const traversalCall = loggerStub.mock.calls.find(isTraversalCall)
      expect(traversalCall?.[1]).toBe('/evil')
    })

    it('should log folder-not-found when folderExists returns false', async () => {
      folderExistsStub.mockResolvedValue(false)
      requestStub.params.path = 'missing'
      await routeFn(requestFake, responseFake)
      const hasNotFoundLog = loggerStub.mock.calls.some((c) => c[0] === 'folder not found: %s')
      expect(hasNotFoundLog).toBe(true)
    })
  })
})

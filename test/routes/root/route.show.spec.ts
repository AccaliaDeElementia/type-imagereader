'use sanity'

import type { Application, Response as ExpressResponse, Router } from 'express'
import type { Server as WebSocketServer } from 'socket.io'
import type { Server } from 'node:http'
import { getRouter, Imports } from '#routes/root.js'
import { StatusCodes } from 'http-status-codes'
import Sinon from 'sinon'
import { cast } from '#testutils/typeGuards.js'
import { createResponseFake } from '#testutils/express.js'

const sandbox = Sinon.createSandbox()

describe('routes/root route /show', () => {
  let routeFn: (_: Request, __: ExpressResponse) => void = sandbox.stub()
  let routeAltFn: (_: Request, __: ExpressResponse) => void = sandbox.stub()
  let requestStub = { params: { path: undefined as string[] | string | undefined } }
  let requestFake = cast<Request>(requestStub)
  let { stub: resposeStub, fake: responseFake } = createResponseFake()
  let isPathTraversalStub = sandbox.stub()
  beforeEach(async () => {
    const applicationFake = cast<Application>({})
    const serverFake = cast<Server>({})
    const socketsFake = cast<WebSocketServer>({})
    const routerStub = { get: sandbox.stub() }
    let getRouterStub: Sinon.SinonStub | undefined = undefined
    try {
      getRouterStub = sandbox.stub(Imports, 'Router').returns(cast<Router>(routerStub))
      await getRouter(applicationFake, serverFake, socketsFake)
      routeFn = cast<(_: Request, __: ExpressResponse) => void>(
        routerStub.get.getCalls().find((c) => c.args[0] === '/show')?.args[1],
      )
      routeAltFn = cast<(_: Request, __: ExpressResponse) => void>(
        routerStub.get.getCalls().find((c) => c.args[0] === '/show/*path')?.args[1],
      )
    } finally {
      getRouterStub?.restore()
    }
    isPathTraversalStub = sandbox.stub(Imports, 'isPathTraversal').returns(false)
    requestStub = { params: { path: undefined } }
    requestFake = cast<Request>(requestStub)
    ;({ stub: resposeStub, fake: responseFake } = createResponseFake())
  })
  afterEach(() => {
    sandbox.restore()
  })
  it("should alias same handler for both '/show' and '/show/*path' routes", () => {
    expect(routeFn).toBe(routeAltFn)
  })
  it('should return FORBIDDEN when isPathTraversal returns true', () => {
    isPathTraversalStub.returns(true)
    routeFn(requestFake, responseFake)
    expect(resposeStub.status.firstCall.args).toEqual([StatusCodes.FORBIDDEN])
  })
  it('should render error template when isPathTraversal returns true', () => {
    isPathTraversalStub.returns(true)
    routeFn(requestFake, responseFake)
    expect(resposeStub.render.firstCall.args[0]).toBe('error')
  })
  it('should render E_NO_TRAVERSE error data when isPathTraversal returns true', () => {
    isPathTraversalStub.returns(true)
    routeFn(requestFake, responseFake)
    expect(resposeStub.render.firstCall.args[1]).toHaveProperty('error.code', 'E_NO_TRAVERSE')
  })
  it('should not render app when isPathTraversal returns true', () => {
    isPathTraversalStub.returns(true)
    routeFn(requestFake, responseFake)
    expect(resposeStub.render.firstCall.args[0]).not.toBe('app')
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
      expect(resposeStub.render.callCount).toBe(1)
    })
    it(`should render app for '${JSON.stringify(path)}'`, () => {
      if (path === undefined) {
        requestStub.params.path = path
      }
      routeFn(requestFake, responseFake)
      expect(resposeStub.render.firstCall.args).toEqual(['app'])
    })
    it(`should not set explicit status '${JSON.stringify(path)}'`, () => {
      if (path === undefined) {
        requestStub.params.path = path
      }
      routeFn(requestFake, responseFake)
      expect(resposeStub.status.callCount).toBe(0)
    })
  })

  describe('logging', () => {
    let loggerStub = sandbox.stub()
    const TRAVERSAL_FORMAT = 'path traversal blocked: %s'
    const isTraversalCall = (c: Sinon.SinonSpyCall): boolean => c.args[0] === TRAVERSAL_FORMAT
    beforeEach(() => {
      loggerStub = sandbox.stub(Imports, 'logger')
    })

    it('should log GET-format on rootRoute invocation', () => {
      requestStub.params.path = 'foo/bar'
      routeFn(requestFake, responseFake)
      expect(loggerStub.firstCall.args[0]).toBe('GET %s')
    })

    it('should log the folder path on rootRoute invocation', () => {
      requestStub.params.path = 'foo/bar'
      routeFn(requestFake, responseFake)
      expect(loggerStub.firstCall.args[1]).toBe('/foo/bar')
    })

    it('should log path-traversal-blocked format when isPathTraversal returns true', () => {
      isPathTraversalStub.returns(true)
      requestStub.params.path = 'evil'
      routeFn(requestFake, responseFake)
      const hasTraversalLog = loggerStub.getCalls().some(isTraversalCall)
      expect(hasTraversalLog).toBe(true)
    })

    it('should log the blocked folder path when isPathTraversal returns true', () => {
      isPathTraversalStub.returns(true)
      requestStub.params.path = 'evil'
      routeFn(requestFake, responseFake)
      const traversalCall = loggerStub.getCalls().find(isTraversalCall)
      expect(traversalCall?.args[1]).toBe('/evil')
    })
  })
})

'use sanity'

import { expect } from 'chai'
import type { Application, Response as ExpressResponse, Router } from 'express'
import type { Server as WebSocketServer } from 'socket.io'
import type { Server } from 'node:http'
import { getRouter, Imports } from '#routes/index'
import { StatusCodes } from 'http-status-codes'
import Sinon from 'sinon'
import { Cast } from '#testutils/TypeGuards'
import { createResponseFake } from '#testutils/Express'

const sandbox = Sinon.createSandbox()

describe('routes/index route /show', () => {
  let routeFn: (_: Request, __: ExpressResponse) => void = Sinon.stub()
  let routeAltFn: (_: Request, __: ExpressResponse) => void = Sinon.stub()
  let requestStub = { params: { path: undefined as string[] | string | undefined } }
  let requestFake = Cast<Request>(requestStub)
  let { stub: resposeStub, fake: responseFake } = createResponseFake()
  let isPathTraversalStub = Sinon.stub()
  beforeEach(async () => {
    const applicationFake = Cast<Application>({})
    const serverFake = Cast<Server>({})
    const socketsFake = Cast<WebSocketServer>({})
    const routerStub = { get: Sinon.stub() }
    let getRouterStub: Sinon.SinonStub | undefined = undefined
    try {
      getRouterStub = sandbox.stub(Imports, 'Router').returns(Cast<Router>(routerStub))
      await getRouter(applicationFake, serverFake, socketsFake)
      routeFn = Cast<(_: Request, __: ExpressResponse) => void>(
        routerStub.get.getCalls().find((c) => c.args[0] === '/show')?.args[1],
      )
      routeAltFn = Cast<(_: Request, __: ExpressResponse) => void>(
        routerStub.get.getCalls().find((c) => c.args[0] === '/show/*path')?.args[1],
      )
    } finally {
      getRouterStub?.restore()
    }
    isPathTraversalStub = Sinon.stub(Imports, 'isPathTraversal').returns(false)
    requestStub = { params: { path: undefined } }
    requestFake = Cast<Request>(requestStub)
    ;({ stub: resposeStub, fake: responseFake } = createResponseFake())
  })
  afterEach(() => {
    isPathTraversalStub.restore()
  })
  it("should alias same handler for both '/show' and '/show/*path' routes", () => {
    expect(routeFn).to.equal(routeAltFn)
  })
  it('should return FORBIDDEN when isPathTraversal returns true', () => {
    isPathTraversalStub.returns(true)
    routeFn(requestFake, responseFake)
    expect(resposeStub.status.firstCall.args).to.deep.equal([StatusCodes.FORBIDDEN])
  })
  it('should render error template when isPathTraversal returns true', () => {
    isPathTraversalStub.returns(true)
    routeFn(requestFake, responseFake)
    expect(resposeStub.render.firstCall.args[0]).to.equal('error')
  })
  it('should render E_NO_TRAVERSE error data when isPathTraversal returns true', () => {
    isPathTraversalStub.returns(true)
    routeFn(requestFake, responseFake)
    expect(resposeStub.render.firstCall.args[1]).to.have.nested.property('error.code', 'E_NO_TRAVERSE')
  })
  it('should not render app when isPathTraversal returns true', () => {
    isPathTraversalStub.returns(true)
    routeFn(requestFake, responseFake)
    expect(resposeStub.render.firstCall.args[0]).to.not.equal('app')
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
      expect(resposeStub.render.callCount).to.equal(1)
    })
    it(`should render app for '${JSON.stringify(path)}'`, () => {
      if (path === undefined) {
        requestStub.params.path = path
      }
      routeFn(requestFake, responseFake)
      expect(resposeStub.render.firstCall.args).to.deep.equal(['app'])
    })
    it(`should not set explicit status '${JSON.stringify(path)}'`, () => {
      if (path === undefined) {
        requestStub.params.path = path
      }
      routeFn(requestFake, responseFake)
      expect(resposeStub.status.callCount).to.equal(0)
    })
  })
})

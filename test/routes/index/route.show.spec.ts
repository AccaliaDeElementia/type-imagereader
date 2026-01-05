'use sanity'

import { expect } from 'chai'
import type { Application, Router } from 'express'
import type { Server as WebSocketServer } from 'socket.io'
import type { Server } from 'node:http'
import { getRouter, Imports } from '../../../routes/index'
import Sinon from 'sinon'
import { Cast } from '../../testutils/TypeGuards'

describe('routes/index route /', () => {
  let routeFn: (_: Request, __: Response) => void = Sinon.stub()
  let routeAltFn: (_: Request, __: Response) => void = Sinon.stub()
  let requestStub = { params: [] as string[] }
  let requestFake = Cast<Request>(requestStub)
  let resposeStub = { render: Sinon.stub(), status: Sinon.stub().returnsThis() }
  let responseFake = Cast<Response>(resposeStub)
  beforeEach(async () => {
    const applicationFake = Cast<Application>({})
    const serverFake = Cast<Server>({})
    const socketsFake = Cast<WebSocketServer>({})
    const routerStub = { get: Sinon.stub() }
    let getRouterStub: Sinon.SinonStub | undefined = undefined
    try {
      getRouterStub = Sinon.stub(Imports, 'Router').returns(Cast<Router>(routerStub))
      await getRouter(applicationFake, serverFake, socketsFake)
      routeFn = Cast<(_: Request, __: Response) => void>(
        routerStub.get.getCalls().find((c) => c.args[0] === '/show')?.args[1],
      )
      routeAltFn = Cast<(_: Request, __: Response) => void>(
        routerStub.get.getCalls().find((c) => c.args[0] === '/show/*')?.args[1],
      )
    } finally {
      getRouterStub?.restore()
    }
    requestStub = { params: [] as string[] }
    requestFake = Cast<Request>(requestStub)
    resposeStub = { render: Sinon.stub(), status: Sinon.stub().returnsThis() }
    responseFake = Cast<Response>(resposeStub)
  })
  it("should alias same handler for both '/show' and '/show/*' routes", () => {
    expect(routeFn).to.equal(routeAltFn)
  })
  const errorData = {
    error: {
      title: 'ERROR',
      code: 'E_NO_TRAVERSE',
      message: 'Directory Traversal is not Allowed!',
    },
  }
  const getArgs = (stub: Sinon.SinonStub): unknown[] => stub.firstCall.args as unknown[]
  const errorTests: Array<[string, string, () => void]> = [
    ['set explicit status', 'foo/../bar', () => expect(resposeStub.status.callCount).to.equal(1)],
    ['set explicit status', 'foo/./bar', () => expect(resposeStub.status.callCount).to.equal(1)],
    ['set explicit status', 'foo//bar', () => expect(resposeStub.status.callCount).to.equal(1)],
    ['set explicit status', '~foo/bar', () => expect(resposeStub.status.callCount).to.equal(1)],
    ['set explicit status', '/foo/bar/', () => expect(resposeStub.status.callCount).to.equal(1)],
    ['forbid', 'foo/../bar', () => expect(getArgs(resposeStub.status)[0]).to.equal(403)],
    ['forbid', 'foo/./bar', () => expect(getArgs(resposeStub.status)[0]).to.equal(403)],
    ['forbid', 'foo//bar', () => expect(getArgs(resposeStub.status)[0]).to.equal(403)],
    ['forbid', '~foo/bar', () => expect(getArgs(resposeStub.status)[0]).to.equal(403)],
    ['forbid', '/foo/bar/', () => expect(getArgs(resposeStub.status)[0]).to.equal(403)],
    ["render 'error'", 'foo/../bar', () => expect(getArgs(resposeStub.render)[0]).to.equal('error')],
    ["render 'error'", 'foo/./bar', () => expect(getArgs(resposeStub.render)[0]).to.equal('error')],
    ["render 'error'", 'foo//bar', () => expect(getArgs(resposeStub.render)[0]).to.equal('error')],
    ["render 'error'", '~foo/bar', () => expect(getArgs(resposeStub.render)[0]).to.equal('error')],
    ["render 'error'", '/foo/bar/', () => expect(getArgs(resposeStub.render)[0]).to.equal('error')],
    ['render with errorData', 'foo/../bar', () => expect(getArgs(resposeStub.render)[1]).to.deep.equal(errorData)],
    ['render with errorData', 'foo/./bar', () => expect(getArgs(resposeStub.render)[1]).to.deep.equal(errorData)],
    ['render with errorData', 'foo//bar', () => expect(getArgs(resposeStub.render)[1]).to.deep.equal(errorData)],
    ['render with errorData', '~foo/bar', () => expect(getArgs(resposeStub.render)[1]).to.deep.equal(errorData)],
    ['render with errorData', '/foo/bar/', () => expect(getArgs(resposeStub.render)[1]).to.deep.equal(errorData)],
  ]
  errorTests.forEach(([title, path, validationFn]) => {
    it(`should ${title} for '${path}'`, () => {
      requestStub.params = [path]
      routeFn(requestFake, responseFake)
      validationFn()
    })
  })
  const successPaths: Array<string | undefined> = [undefined, '', 'foo/~bar', 'this/is/a/valid/path']
  successPaths.forEach((path) => {
    it(`should render for '${path}'`, () => {
      if (path === undefined) {
        requestStub.params = []
      } else {
        requestStub.params = [path]
      }
      routeFn(requestFake, responseFake)
      expect(resposeStub.render.callCount).to.equal(1)
    })
    it(`should render app for '${path}'`, () => {
      if (path === undefined) {
        requestStub.params = []
      } else {
        requestStub.params = [path]
      }
      routeFn(requestFake, responseFake)
      expect(resposeStub.render.firstCall.args).to.deep.equal(['app'])
    })
    it(`should not set explicit status '${path}'`, () => {
      if (path === undefined) {
        requestStub.params = []
      } else {
        requestStub.params = [path]
      }
      routeFn(requestFake, responseFake)
      expect(resposeStub.status.callCount).to.equal(0)
    })
  })
})

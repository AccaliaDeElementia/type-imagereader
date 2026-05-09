'use sanity'

import { expect } from 'chai'
import type { Application, Router } from 'express'
import type { Server as WebSocketServer } from 'socket.io'
import type { Server } from 'node:http'
import { getRouter, Imports } from '#routes/index.js'
import Sinon from 'sinon'
import { cast } from '#testutils/typeGuards.js'

const sandbox = Sinon.createSandbox()

describe('routes/index route /', () => {
  let routeFn: (_: Request, __: Response) => void = sandbox.stub()
  let requestFake = cast<Request>({})
  let resposeStub = { redirect: sandbox.stub() }
  let responseFake = cast<Response>(resposeStub)
  beforeEach(async () => {
    const applicationFake = cast<Application>({})
    const serverFake = cast<Server>({})
    const socketsFake = cast<WebSocketServer>({})
    const routerStub = { get: sandbox.stub() }
    let getRouterStub: Sinon.SinonStub | undefined = undefined
    try {
      getRouterStub = sandbox.stub(Imports, 'Router').returns(cast<Router>(routerStub))
      await getRouter(applicationFake, serverFake, socketsFake)
      routeFn = cast<(_: Request, __: Response) => void>(
        routerStub.get.getCalls().find((c) => c.args[0] === '/')?.args[1],
      )
    } finally {
      getRouterStub?.restore()
    }
    requestFake = cast<Request>({})
    resposeStub = { redirect: sandbox.stub() }
    responseFake = cast<Response>(resposeStub)
  })
  afterEach(() => {
    sandbox.restore()
  })
  it('should redirect response', () => {
    routeFn(requestFake, responseFake)
    expect(resposeStub.redirect.callCount).to.equal(1)
  })
  it('should redirect with temporary redirect', () => {
    routeFn(requestFake, responseFake)
    expect(resposeStub.redirect.firstCall.args[0]).to.equal(302)
  })
  it("should redirect to '/show'", () => {
    routeFn(requestFake, responseFake)
    expect(resposeStub.redirect.firstCall.args[1]).to.equal('/show')
  })
})

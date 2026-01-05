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
  let requestFake = Cast<Request>({})
  let resposeStub = { redirect: Sinon.stub() }
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
        routerStub.get.getCalls().find((c) => c.args[0] === '/')?.args[1],
      )
    } finally {
      getRouterStub?.restore()
    }
    requestFake = Cast<Request>({})
    resposeStub = { redirect: Sinon.stub() }
    responseFake = Cast<Response>(resposeStub)
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

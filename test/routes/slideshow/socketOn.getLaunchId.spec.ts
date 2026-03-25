'use sanity'

import Sinon from 'sinon'
import { Cast, StubToKnex } from '#testutils/TypeGuards'
import { expect } from 'chai'
import { Config, Functions, SocketHandlers } from '#routes/slideshow'
import type { Server as WebSocketServer, Socket } from 'socket.io'

describe('routes/slideshow socket get-launchId()', () => {
  let knexFake = StubToKnex({})
  let serverFake = Cast<WebSocketServer>({})
  let socketStub = { on: Sinon.stub() }
  let socketFake = Cast<Socket>(socketStub)
  beforeEach(() => {
    knexFake = StubToKnex({})
    serverFake = Cast<WebSocketServer>({})
    socketStub = { on: Sinon.stub() }
    socketFake = Cast<Socket>(socketStub)
    Functions.HandleSocket(knexFake, serverFake, socketFake)
  })
  it('should call provided callback on invocation', () => {
    const spy = Sinon.stub()
    SocketHandlers.getLaunchId(spy)
    expect(spy.callCount).to.equal(1)
  })
  it('should retrieve Config.launchId on invocation', () => {
    const value = 1e9 + Math.floor(Math.random() * 1e9)
    Config.launchId = value
    const spy = Sinon.stub()
    SocketHandlers.getLaunchId(spy)
    expect(spy.firstCall.args).to.deep.equal([value])
  })
})

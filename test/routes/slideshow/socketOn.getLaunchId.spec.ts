'use sanity'

import Sinon from 'sinon'
import { Cast, StubToKnex } from '../../testutils/TypeGuards'
import { assert, expect } from 'chai'
import { Config, Functions } from '../../../routes/slideshow'
import type { Server as WebSocketServer, Socket } from 'socket.io'

describe('routes/slideshow socket get-launchId()', () => {
  let knexFake = StubToKnex({})
  let serverFake = Cast<WebSocketServer>({})
  let socketStub = { on: Sinon.stub() }
  let socketFake = Cast<Socket>(socketStub)
  let handlerFn = (_: (__: number) => void): void => {
    assert.fail('Should be overwritten in beforeEach!')
  }
  beforeEach(() => {
    knexFake = StubToKnex({})
    serverFake = Cast<WebSocketServer>({})
    socketStub = { on: Sinon.stub() }
    socketFake = Cast<Socket>(socketStub)
    Functions.HandleSocket(knexFake, serverFake, socketFake)
    const fn = socketStub.on
      .getCalls()
      .filter((call) => call.args[0] === 'get-launchId')
      .map((call) => call.args[1] as unknown)[0]
    assert.isFunction(fn)
    handlerFn = Cast<(_: (__: number) => void) => void>(fn)
  })
  it('should call provided callback on invocation', () => {
    const spy = Sinon.stub()
    handlerFn(spy)
    expect(spy.callCount).to.equal(1)
  })
  it('should retrieve Config.launchId on invocation', () => {
    const value = 1e9 + Math.floor(Math.random() * 1e9)
    Config.launchId = value
    const spy = Sinon.stub()
    handlerFn(spy)
    expect(spy.firstCall.args).to.deep.equal([value])
  })
})

'use sanity'

import Sinon from 'sinon'
import { cast, stubToKnex } from '#testutils/typeGuards.js'
import { expect } from 'chai'
import { Config, getLaunchId, handleSocket } from '#routes/slideshow.js'
import type { Server as WebSocketServer, Socket } from 'socket.io'

const sandbox = Sinon.createSandbox()

describe('routes/slideshow socket get-launchId()', () => {
  let knexFake = stubToKnex({})
  let serverFake = cast<WebSocketServer>({})
  let socketStub = { on: sandbox.stub() }
  let socketFake = cast<Socket>(socketStub)
  beforeEach(() => {
    knexFake = stubToKnex({})
    serverFake = cast<WebSocketServer>({})
    socketStub = { on: sandbox.stub() }
    socketFake = cast<Socket>(socketStub)
    handleSocket(knexFake, serverFake, socketFake)
  })
  afterEach(() => {
    sandbox.restore()
  })
  it('should call provided callback on invocation', () => {
    const spy = sandbox.stub()
    getLaunchId(spy)
    expect(spy.callCount).to.equal(1)
  })
  it('should retrieve Config.launchId on invocation', () => {
    const value = 1e9 + Math.floor(Math.random() * 1e9)
    Config.launchId = value
    const spy = sandbox.stub()
    getLaunchId(spy)
    expect(spy.firstCall.args).to.deep.equal([value])
  })
})

'use sanity'

import Sinon from 'sinon'
import { Cast, StubToKnex } from '../../testutils/TypeGuards'
import { assert, expect } from 'chai'
import { Functions } from '../../../routes/slideshow'
import type { Server as WebSocketServer, Socket } from 'socket.io'

describe('routes/slideshow function HandleSocket()', () => {
  let knexFake = StubToKnex({})
  let serverFake = Cast<WebSocketServer>({})
  let socketStub = { on: Sinon.stub() }
  let socketFake = Cast<Socket>(socketStub)
  beforeEach(() => {
    knexFake = StubToKnex({})
    serverFake = Cast<WebSocketServer>({})
    socketStub = { on: Sinon.stub() }
    socketFake = Cast<Socket>(socketStub)
  })
  const endpoints = ['get-launchId', 'join-slideshow', 'prev-image', 'next-image', 'goto-image']
  it('should register expected endpoint count', () => {
    Functions.HandleSocket(knexFake, serverFake, socketFake)
    expect(socketStub.on.callCount).to.equal(endpoints.length)
  })
  const getCallback = (endpoint: string): unknown =>
    socketStub.on
      .getCalls()
      .filter((call) => call.args[0] === endpoint)
      .map((call) => call.args[1] as unknown)[0]
  endpoints.forEach((endpoint) => {
    it(`should handle socket message '${endpoint}'`, () => {
      Functions.HandleSocket(knexFake, serverFake, socketFake)
      expect(socketStub.on.calledWith(endpoint)).to.equal(true)
    })
    it(`should register a callback for '${endpoint}'`, () => {
      Functions.HandleSocket(knexFake, serverFake, socketFake)
      assert.isFunction(getCallback(endpoint))
    })
  })
  it('should return an object for state storage', () => {
    const state = Functions.HandleSocket(knexFake, serverFake, socketFake)
    assert.isObject(state)
  })
  it('should return state object', () => {
    const state = Functions.HandleSocket(knexFake, serverFake, socketFake)
    expect(state).to.have.all.keys('roomName')
  })
  it('should set initial roomName to null', () => {
    const state = Functions.HandleSocket(knexFake, serverFake, socketFake)
    expect(state.roomName).to.equal(null)
  })
})

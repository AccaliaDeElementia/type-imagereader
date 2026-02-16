'use sanity'

import Sinon from 'sinon'
import { Cast, StubToKnex } from '../../testutils/TypeGuards'
import { assert, expect } from 'chai'
import { Functions, SocketHandlers } from '../../../routes/slideshow'
import type { Server as WebSocketServer, Socket } from 'socket.io'

describe('routes/slideshow function HandleSocket()', () => {
  let knexFake = StubToKnex({})
  let serverFake = Cast<WebSocketServer>({})
  let socketStub = { on: Sinon.stub() }
  let socketFake = Cast<Socket>(socketStub)
  const endpoints = {
    'get-launchId': Sinon.stub(),
    'join-slideshow': Sinon.stub(),
    'prev-image': Sinon.stub(),
    'next-image': Sinon.stub(),
    'goto-image': Sinon.stub(),
  }
  beforeEach(() => {
    knexFake = StubToKnex({})
    serverFake = Cast<WebSocketServer>({})
    socketStub = { on: Sinon.stub() }
    socketFake = Cast<Socket>(socketStub)
    endpoints['get-launchId'] = Sinon.stub(SocketHandlers, 'getLaunchId')
    endpoints['join-slideshow'] = Sinon.stub(SocketHandlers, 'joinSlideshow')
    endpoints['prev-image'] = Sinon.stub(SocketHandlers, 'prevImage')
    endpoints['next-image'] = Sinon.stub(SocketHandlers, 'nextImage')
    endpoints['goto-image'] = Sinon.stub(SocketHandlers, 'gotoImage')
  })
  afterEach(() => {
    endpoints['get-launchId'].restore()
    endpoints['join-slideshow'].restore()
    endpoints['prev-image'].restore()
    endpoints['next-image'].restore()
    endpoints['goto-image'].restore()
  })
  it('should register expected endpoint count', () => {
    Functions.HandleSocket(knexFake, serverFake, socketFake)
    expect(socketStub.on.callCount).to.equal(Object.keys(endpoints).length)
  })
  const getCallback = (endpoint: string): unknown =>
    socketStub.on
      .getCalls()
      .filter((call) => call.args[0] === endpoint)
      .map((call) => call.args[1] as unknown)[0]
  Object.entries(endpoints).forEach(([endpoint]) => {
    it(`should handle socket message '${endpoint}'`, () => {
      Functions.HandleSocket(knexFake, serverFake, socketFake)
      expect(socketStub.on.calledWith(endpoint)).to.equal(true)
    })
    it(`should register a callback for '${endpoint}'`, () => {
      Functions.HandleSocket(knexFake, serverFake, socketFake)
      assert.isFunction(getCallback(endpoint))
    })
    it(`should call expected handler for'${endpoint}'`, () => {
      Functions.HandleSocket(knexFake, serverFake, socketFake)
      const fn = Cast<() => void>(getCallback(endpoint))
      const stub = Object.entries(endpoints)
        .filter(([key]) => key === endpoint)
        .map(([_, value]) => value)
        .pop()
      expect(stub?.callCount).to.equal(0)
      fn()
      expect(stub?.callCount).to.equal(1)
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

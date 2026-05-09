'use sanity'

import Sinon from 'sinon'
import { cast, stubToKnex } from '#testutils/TypeGuards.js'
import { assert, expect } from 'chai'
import { handleSocket, Internals, Imports } from '#routes/slideshow.js'
import type { Server as WebSocketServer, Socket } from 'socket.io'
import { setImmediate as yieldMacro } from 'node:timers/promises'

const sandbox = Sinon.createSandbox()

describe('routes/slideshow handleSocket()', () => {
  let knexFake = stubToKnex({})
  let serverFake = cast<WebSocketServer>({})
  let socketStub = { on: sandbox.stub() }
  let socketFake = cast<Socket>(socketStub)
  let socketStubs: Array<[string, Sinon.SinonStub]> = []
  let loggerStub = sandbox.stub()
  beforeEach(() => {
    knexFake = stubToKnex({})
    serverFake = cast<WebSocketServer>({})
    socketStub = { on: sandbox.stub() }
    socketFake = cast<Socket>(socketStub)
    loggerStub = sandbox.stub(Imports, 'logger')
    socketStubs = [
      ['get-launchId', sandbox.stub(Internals, 'getLaunchId')],
      ['join-slideshow', sandbox.stub(Internals, 'joinSlideshow').resolves()],
      ['prev-image', sandbox.stub(Internals, 'prevImage').resolves()],
      ['next-image', sandbox.stub(Internals, 'nextImage').resolves()],
      ['goto-image', sandbox.stub(Internals, 'gotoImage').resolves()],
    ]
  })
  afterEach(() => {
    sandbox.restore()
  })
  const endpoints = ['get-launchId', 'join-slideshow', 'prev-image', 'next-image', 'goto-image']
  it('should register expected endpoint count', () => {
    handleSocket(knexFake, serverFake, socketFake)
    expect(socketStub.on.callCount).to.equal(endpoints.length)
  })
  const getCallback = (endpoint: string): unknown =>
    socketStub.on
      .getCalls()
      .filter((call) => call.args[0] === endpoint)
      .map((call) => call.args[1] as unknown)[0]
  endpoints.forEach((endpoint) => {
    it(`should handle socket message '${endpoint}'`, () => {
      handleSocket(knexFake, serverFake, socketFake)
      expect(socketStub.on.calledWith(endpoint)).to.equal(true)
    })
    it(`should register a callback for '${endpoint}'`, () => {
      handleSocket(knexFake, serverFake, socketFake)
      assert.isFunction(getCallback(endpoint))
    })
    it(`should forward call for ${endpoint}`, () => {
      handleSocket(knexFake, serverFake, socketFake)
      const fn = cast<() => void>(getCallback(endpoint))
      fn()
      const stub = socketStubs.find(([name]) => name === endpoint)
      assert(stub !== undefined)
      expect(stub[1].callCount).to.equal(1)
    })
  })
  const asyncEndpoints: Array<[string, string]> = [
    ['join-slideshow', 'joinSlideshow'],
    ['prev-image', 'prevImage'],
    ['next-image', 'nextImage'],
    ['goto-image', 'gotoImage'],
  ]
  asyncEndpoints.forEach(([endpoint, handlerName]) => {
    it(`should log the error when ${endpoint} handler rejects`, async () => {
      const stub = socketStubs.find(([name]) => name === endpoint)
      assert(stub !== undefined)
      const err = new Error(`boom-${handlerName}`)
      stub[1].rejects(err)
      handleSocket(knexFake, serverFake, socketFake)
      const fn = cast<(cb?: () => void) => void>(getCallback(endpoint))
      fn(() => undefined)
      await yieldMacro()
      const matching = loggerStub.getCalls().find((call) => call.args[1] === err)
      assert(matching !== undefined, `expected logger to be called with the ${handlerName} error`)
    })
  })
  it('should invoke the client callback with null when goto-image rejects', async () => {
    const stub = socketStubs.find(([name]) => name === 'goto-image')
    assert(stub !== undefined)
    stub[1].rejects(new Error('goto failed'))
    handleSocket(knexFake, serverFake, socketFake)
    const fn = cast<(cb: (arg: unknown) => void) => void>(getCallback('goto-image'))
    const callbackStub = sandbox.stub()
    fn(callbackStub)
    await yieldMacro()
    expect(callbackStub.firstCall.args).to.deep.equal([null])
  })
  it('should return an object for state storage', () => {
    const state = handleSocket(knexFake, serverFake, socketFake)
    assert.isObject(state)
  })
  it('should return state object', () => {
    const state = handleSocket(knexFake, serverFake, socketFake)
    expect(state).to.have.all.keys('roomName')
  })
  it('should set initial roomName to null', () => {
    const state = handleSocket(knexFake, serverFake, socketFake)
    expect(state.roomName).to.equal(null)
  })
})

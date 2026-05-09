'use sanity'

import Sinon from 'sinon'
import { Disconnect, Internals, WebSockets, type WebSocket } from '#public/scripts/slideshow/sockets.js'
import { cast } from '#testutils/TypeGuards.js'
import { expect } from 'chai'
import assert from 'node:assert'

const sandbox = Sinon.createSandbox()

describe('public/slideshow/sockets Disconnect()', () => {
  const fakeDisconnect = sandbox.stub()
  const fakeSocket = cast<WebSocket>({ disconnect: fakeDisconnect })
  beforeEach(() => {
    WebSockets.socket = fakeSocket
    fakeDisconnect.reset()
  })
  afterEach(() => {
    sandbox.restore()
  })
  it('should allow disconnect without socket', () => {
    WebSockets.socket = undefined
    Disconnect()
    assert(true, 'Should not explode because important object is missing')
  })
  it('should disconnect with socket', () => {
    Disconnect()
    expect(fakeDisconnect.callCount).to.equal(1)
  })
  it('should clear launchId with socket', () => {
    WebSockets.launchId = 42
    Disconnect()
    expect(WebSockets.launchId).to.equal(undefined)
  })
  it('should clear launchId without socket', () => {
    WebSockets.socket = undefined
    WebSockets.launchId = 42
    Disconnect()
    expect(WebSockets.launchId).to.equal(undefined)
  })
  it('should clear locationAssign with socket', () => {
    WebSockets.locationAssign = sandbox.stub()
    Disconnect()
    expect(WebSockets.locationAssign).to.equal(Internals.UninitializedLocationAssign)
  })
  it('should clear locationAssign without socket', () => {
    WebSockets.socket = undefined
    WebSockets.locationAssign = sandbox.stub()
    Disconnect()
    expect(WebSockets.locationAssign).to.equal(Internals.UninitializedLocationAssign)
  })
  it('should clear LocationReload with socket', () => {
    WebSockets.LocationReload = sandbox.stub()
    Disconnect()
    expect(WebSockets.LocationReload).to.equal(Internals.UninitializedLocationReload)
  })
  it('should clear LocationReload without socket', () => {
    WebSockets.socket = undefined
    WebSockets.LocationReload = sandbox.stub()
    Disconnect()
    expect(WebSockets.LocationReload).to.equal(Internals.UninitializedLocationReload)
  })
})

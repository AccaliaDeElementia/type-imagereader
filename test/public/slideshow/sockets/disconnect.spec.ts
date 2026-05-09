'use sanity'

import Sinon from 'sinon'
import { disconnect, Internals, WebSockets, type WebSocket } from '#public/scripts/slideshow/sockets.js'
import { cast } from '#testutils/typeGuards.js'
import { expect } from 'chai'
import assert from 'node:assert'

const sandbox = Sinon.createSandbox()

describe('public/slideshow/sockets disconnect()', () => {
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
    disconnect()
    assert(true, 'Should not explode because important object is missing')
  })
  it('should disconnect with socket', () => {
    disconnect()
    expect(fakeDisconnect.callCount).to.equal(1)
  })
  it('should clear launchId with socket', () => {
    WebSockets.launchId = 42
    disconnect()
    expect(WebSockets.launchId).to.equal(undefined)
  })
  it('should clear launchId without socket', () => {
    WebSockets.socket = undefined
    WebSockets.launchId = 42
    disconnect()
    expect(WebSockets.launchId).to.equal(undefined)
  })
  it('should clear locationAssign with socket', () => {
    WebSockets.locationAssign = sandbox.stub()
    disconnect()
    expect(WebSockets.locationAssign).to.equal(Internals.uninitializedLocationAssign)
  })
  it('should clear locationAssign without socket', () => {
    WebSockets.socket = undefined
    WebSockets.locationAssign = sandbox.stub()
    disconnect()
    expect(WebSockets.locationAssign).to.equal(Internals.uninitializedLocationAssign)
  })
  it('should clear locationReload with socket', () => {
    WebSockets.locationReload = sandbox.stub()
    disconnect()
    expect(WebSockets.locationReload).to.equal(Internals.uninitializedLocationReload)
  })
  it('should clear locationReload without socket', () => {
    WebSockets.socket = undefined
    WebSockets.locationReload = sandbox.stub()
    disconnect()
    expect(WebSockets.locationReload).to.equal(Internals.uninitializedLocationReload)
  })
})

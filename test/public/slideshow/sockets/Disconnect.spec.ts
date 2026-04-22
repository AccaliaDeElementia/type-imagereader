'use sanity'

import Sinon from 'sinon'
import {
  UninitializedLocationAssign,
  UninitializedLocationReload,
  WebSockets,
  type WebSocket,
} from '#public/scripts/slideshow/sockets'
import { afterEach, beforeEach, describe, it } from 'mocha'
import { Cast } from '#testutils/TypeGuards'
import { expect } from 'chai'
import assert from 'node:assert'

const sandbox = Sinon.createSandbox()

describe('public/slideshow/sockets Disconnect()', () => {
  const fakeDisconnect = sandbox.stub()
  const fakeSocket = Cast<WebSocket>({ disconnect: fakeDisconnect })
  beforeEach(() => {
    WebSockets.socket = fakeSocket
    fakeDisconnect.reset()
  })
  afterEach(() => {
    sandbox.restore()
  })
  it('should allow disconnect without socket', () => {
    WebSockets.socket = undefined
    WebSockets.disconnect()
    assert(true, 'Should not explode because important object is missing')
  })
  it('should disconnect with socket', () => {
    WebSockets.disconnect()
    expect(fakeDisconnect.callCount).to.equal(1)
  })
  it('should clear launchId with socket', () => {
    WebSockets.launchId = 42
    WebSockets.disconnect()
    expect(WebSockets.launchId).to.equal(undefined)
  })
  it('should clear launchId without socket', () => {
    WebSockets.socket = undefined
    WebSockets.launchId = 42
    WebSockets.disconnect()
    expect(WebSockets.launchId).to.equal(undefined)
  })
  it('should clear LocationAssign with socket', () => {
    WebSockets.LocationAssign = sandbox.stub()
    WebSockets.disconnect()
    expect(WebSockets.LocationAssign).to.equal(UninitializedLocationAssign)
  })
  it('should clear LocationAssign without socket', () => {
    WebSockets.socket = undefined
    WebSockets.LocationAssign = sandbox.stub()
    WebSockets.disconnect()
    expect(WebSockets.LocationAssign).to.equal(UninitializedLocationAssign)
  })
  it('should clear LocationReload with socket', () => {
    WebSockets.LocationReload = sandbox.stub()
    WebSockets.disconnect()
    expect(WebSockets.LocationReload).to.equal(UninitializedLocationReload)
  })
  it('should clear LocationReload without socket', () => {
    WebSockets.socket = undefined
    WebSockets.LocationReload = sandbox.stub()
    WebSockets.disconnect()
    expect(WebSockets.LocationReload).to.equal(UninitializedLocationReload)
  })
})

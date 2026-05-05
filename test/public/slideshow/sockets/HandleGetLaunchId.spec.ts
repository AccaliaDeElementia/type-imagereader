'use sanity'

import Sinon from 'sinon'
import { Functions, WebSockets } from '#public/scripts/slideshow/sockets.js'
import { beforeEach, afterEach, describe, it } from 'mocha'
import { expect } from 'chai'

const sandbox = Sinon.createSandbox()

describe('public/slideshow/sockets HandleGetLaunchId()', () => {
  let fakeReload: Sinon.SinonStub | undefined = undefined
  beforeEach(() => {
    fakeReload = sandbox.stub(WebSockets, 'LocationReload')
    WebSockets.launchId = undefined
  })
  afterEach(() => {
    sandbox.restore()
  })
  it('should save launchId on call', () => {
    Functions.HandleGetLaunchId(8675309)
    expect(WebSockets.launchId).to.equal(8675309)
  })
  it('should not reload on first call', () => {
    Functions.HandleGetLaunchId(8675309)
    expect(fakeReload?.callCount).to.equal(0)
  })
  it('should preserve launchId on recall', () => {
    WebSockets.launchId = 8675309
    Functions.HandleGetLaunchId(8675309)
    expect(WebSockets.launchId).to.equal(8675309)
  })
  it('should not reload on recall', () => {
    WebSockets.launchId = 8675309
    Functions.HandleGetLaunchId(8675309)
    expect(fakeReload?.callCount).to.equal(0)
  })
  it('should preserve launchId on relaunch', () => {
    WebSockets.launchId = 'Old Id'
    Functions.HandleGetLaunchId(8675309)
    expect(WebSockets.launchId).to.equal('Old Id')
  })
  it('should reload on relaunch', () => {
    WebSockets.launchId = 'Old Id'
    Functions.HandleGetLaunchId(8675309)
    expect(fakeReload?.callCount).to.equal(1)
  })
  it('should ignore a non-number launchId on first call', () => {
    Functions.HandleGetLaunchId(null)
    expect(WebSockets.launchId).to.equal(undefined)
  })
  it('should ignore a NaN launchId on first call', () => {
    Functions.HandleGetLaunchId(Number.NaN)
    expect(WebSockets.launchId).to.equal(undefined)
  })
  it('should not reload when receiving an invalid launchId after a valid one was stored', () => {
    WebSockets.launchId = 8675309
    Functions.HandleGetLaunchId(null)
    expect(fakeReload?.callCount).to.equal(0)
  })
})

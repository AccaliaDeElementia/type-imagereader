'use sanity'

import Sinon from 'sinon'
import { Internals, WebSockets } from '#public/scripts/slideshow/sockets.js'
const sandbox = Sinon.createSandbox()

describe('public/slideshow/sockets handleGetLaunchId()', () => {
  let fakeReload: Sinon.SinonStub | undefined = undefined
  beforeEach(() => {
    fakeReload = sandbox.stub(WebSockets, 'locationReload')
    WebSockets.launchId = undefined
  })
  afterEach(() => {
    sandbox.restore()
  })
  it('should save launchId on call', () => {
    Internals.handleGetLaunchId(8675309)
    expect(WebSockets.launchId).toBe(8675309)
  })
  it('should not reload on first call', () => {
    Internals.handleGetLaunchId(8675309)
    expect(fakeReload?.callCount).toBe(0)
  })
  it('should preserve launchId on recall', () => {
    WebSockets.launchId = 8675309
    Internals.handleGetLaunchId(8675309)
    expect(WebSockets.launchId).toBe(8675309)
  })
  it('should not reload on recall', () => {
    WebSockets.launchId = 8675309
    Internals.handleGetLaunchId(8675309)
    expect(fakeReload?.callCount).toBe(0)
  })
  it('should preserve launchId on relaunch', () => {
    WebSockets.launchId = 'Old Id'
    Internals.handleGetLaunchId(8675309)
    expect(WebSockets.launchId).toBe('Old Id')
  })
  it('should reload on relaunch', () => {
    WebSockets.launchId = 'Old Id'
    Internals.handleGetLaunchId(8675309)
    expect(fakeReload?.callCount).toBe(1)
  })
  it('should ignore a non-number launchId on first call', () => {
    Internals.handleGetLaunchId(null)
    expect(WebSockets.launchId).toBe(undefined)
  })
  it('should ignore a NaN launchId on first call', () => {
    Internals.handleGetLaunchId(Number.NaN)
    expect(WebSockets.launchId).toBe(undefined)
  })
  it('should not reload when receiving an invalid launchId after a valid one was stored', () => {
    WebSockets.launchId = 8675309
    Internals.handleGetLaunchId(null)
    expect(fakeReload?.callCount).toBe(0)
  })
})

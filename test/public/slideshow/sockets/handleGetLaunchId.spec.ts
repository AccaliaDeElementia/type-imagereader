'use sanity'

import { Internals, WebSockets } from '#public/scripts/slideshow/sockets.js'
import type { MockInstance } from 'vitest'
describe('public/slideshow/sockets handleGetLaunchId()', () => {
  let fakeReload: MockInstance | undefined = undefined
  beforeEach(() => {
    fakeReload = vi.spyOn(WebSockets, 'locationReload').mockImplementation((..._args: unknown[]) => undefined)
    WebSockets.launchId = undefined
  })
  it('should save launchId on call', () => {
    Internals.handleGetLaunchId(8675309)
    expect(WebSockets.launchId).toBe(8675309)
  })
  it('should not reload on first call', () => {
    Internals.handleGetLaunchId(8675309)
    expect(fakeReload?.mock.calls.length).toBe(0)
  })
  it('should preserve launchId on recall', () => {
    WebSockets.launchId = 8675309
    Internals.handleGetLaunchId(8675309)
    expect(WebSockets.launchId).toBe(8675309)
  })
  it('should not reload on recall', () => {
    WebSockets.launchId = 8675309
    Internals.handleGetLaunchId(8675309)
    expect(fakeReload?.mock.calls.length).toBe(0)
  })
  it('should preserve launchId on relaunch', () => {
    WebSockets.launchId = 'Old Id'
    Internals.handleGetLaunchId(8675309)
    expect(WebSockets.launchId).toBe('Old Id')
  })
  it('should reload on relaunch', () => {
    WebSockets.launchId = 'Old Id'
    Internals.handleGetLaunchId(8675309)
    expect(fakeReload?.mock.calls.length).toBe(1)
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
    expect(fakeReload?.mock.calls.length).toBe(0)
  })
})

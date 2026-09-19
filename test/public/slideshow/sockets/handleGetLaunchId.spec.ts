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
  it('should preserve the stored launchId when a different launchId arrives', () => {
    WebSockets.launchId = 1234567
    Internals.handleGetLaunchId(8675309)
    expect(WebSockets.launchId).toBe(1234567)
  })
  it('should reload when a different launchId arrives', () => {
    WebSockets.launchId = 1234567
    Internals.handleGetLaunchId(8675309)
    expect(fakeReload?.mock.calls.length).toBe(1)
  })
  const unusableLaunchIds: Array<[string, unknown]> = [
    ['null', null],
    ['undefined', undefined],
    ['a numeric string', '8675309'],
    ['an object', {}],
    ['NaN', Number.NaN],
    ['Infinity', Number.POSITIVE_INFINITY],
    ['negative Infinity', Number.NEGATIVE_INFINITY],
  ]
  it.each(unusableLaunchIds)('should not store %s as the launchId on first call', (_title, launchId) => {
    Internals.handleGetLaunchId(launchId)
    expect(WebSockets.launchId).toBe(undefined)
  })
  it.each(unusableLaunchIds)('should not reload when %s arrives after a valid launchId', (_title, launchId) => {
    WebSockets.launchId = 8675309
    Internals.handleGetLaunchId(launchId)
    expect(fakeReload?.mock.calls.length).toBe(0)
  })
})

'use sanity'

import { JSDOM } from 'jsdom'
import { mountDom, unmountDom } from '#testutils/dom.js'

import { Internals, PubSub, stopDeferred } from '#public/scripts/app/pubsub.js'
import { resetPubSub } from '#testutils/pubsub.js'
import type { MockInstance } from 'vitest'

describe('public/app/pubsub stopDeferred()', () => {
  let dom = new JSDOM('<html></html>', {})
  let clearIntervalSpy: MockInstance = vi.fn()
  beforeEach(() => {
    dom = new JSDOM('<html></html>', {})
    mountDom(dom)
    clearIntervalSpy = vi.spyOn(global.window, 'clearInterval').mockImplementation((..._args: unknown[]) => undefined)
    PubSub.cycleTime = 17
    resetPubSub()
    PubSub.timer = 12
    vi.spyOn(Internals, 'executeInterval').mockImplementation((..._args: unknown[]) => undefined)
  })
  afterEach(() => {
    vi.restoreAllMocks()
    unmountDom()
  })
  it('should clear interval with Window.clearInterval()', () => {
    stopDeferred()
    expect(clearIntervalSpy.mock.calls.length).toBe(1)
  })
  it('should pass saved timer id to clearInterval()', () => {
    PubSub.timer = 6413287
    stopDeferred()
    expect(clearIntervalSpy.mock.calls[0]).toEqual([6413287])
  })
  it('should clear saved timer id', () => {
    PubSub.timer = 6413287
    stopDeferred()
    expect(PubSub.timer).toBe(undefined)
  })
  it('should not clear interval if timer is not set', () => {
    PubSub.timer = undefined
    stopDeferred()
    expect(clearIntervalSpy.mock.calls.length).toBe(0)
  })
})

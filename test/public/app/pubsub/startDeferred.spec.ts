'use sanity'

import { JSDOM } from 'jsdom'
import { mountDom, unmountDom } from '#testutils/dom.js'

import { Internals, PubSub, startDeferred } from '#public/scripts/app/pubsub.js'
import { resetPubSub } from '#testutils/pubsub.js'
import assert from 'node:assert'
import { cast } from '#testutils/typeGuards.js'
import { hasValue } from '#utils/helpers.js'
import type { MockInstance } from 'vitest'

describe('public/app/pubsub startDeferred()', () => {
  let dom = new JSDOM('<html></html>', {})
  let setIntervalSpy: MockInstance = vi.fn()
  let executeIntervalSpy: MockInstance = vi.fn()
  beforeEach(() => {
    dom = new JSDOM('<html></html>', {})
    mountDom(dom)
    setIntervalSpy = vi.spyOn(global.window, 'setInterval').mockReturnValue(cast(1))
    PubSub.cycleTime = 17
    resetPubSub()
    executeIntervalSpy = vi.spyOn(Internals, 'executeInterval').mockImplementation((..._args: unknown[]) => undefined)
  })
  afterEach(() => {
    vi.restoreAllMocks()
    unmountDom()
  })
  it('should set interval with Window.SetInterval()', () => {
    startDeferred()
    expect(setIntervalSpy.mock.calls.length).toBe(1)
  })
  it('should call executeInterval with interval fn', () => {
    startDeferred()
    const fn = setIntervalSpy.mock.calls[0]?.[0] as unknown
    assert(hasValue(fn))
    cast<() => void>(fn)()
    expect(executeIntervalSpy.mock.calls.length).toBe(1)
  })
  it('should call setInterval with 2 arguments', () => {
    startDeferred()
    expect(setIntervalSpy.mock.calls[0]).toHaveLength(2)
  })
  it('should set interval with configured interval period', () => {
    startDeferred()
    expect(setIntervalSpy.mock.calls[0]?.[1]).toBe(17)
  })
  it('should save timer id for later deactivation', () => {
    setIntervalSpy.mockReturnValue(6413287)
    startDeferred()
    expect(PubSub.timer).toBe(6413287)
  })
})

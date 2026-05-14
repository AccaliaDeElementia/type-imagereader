'use sanity'

import { JSDOM } from 'jsdom'
import { mountDom, unmountDom } from '#testutils/dom.js'

import { capturedInterval, capturedSubscriber, resetPubSub } from '#testutils/pubsub.js'
import { init, Imports, Internals, WakeLock } from '#public/scripts/app/wakelock.js'
import type { MockInstance } from 'vitest'

describe('public/app/WakeLock init()', () => {
  let dom = new JSDOM('<html></html>', {})
  let takeLockSpy: MockInstance = vi.fn()
  let releaseLockSpy: MockInstance = vi.fn()
  let subscribeStub: MockInstance = vi.fn()
  let addIntervalStub: MockInstance = vi.fn()
  beforeEach(() => {
    dom = new JSDOM('<html></html>', {})
    mountDom(dom)
    takeLockSpy = vi.spyOn(Internals, 'takeLock').mockResolvedValue(undefined)
    releaseLockSpy = vi.spyOn(Internals, 'releaseLock').mockResolvedValue(undefined)
    subscribeStub = vi.spyOn(Imports, 'subscribe').mockImplementation((..._args: unknown[]) => undefined)
    addIntervalStub = vi.spyOn(Imports, 'addInterval').mockImplementation((..._args: unknown[]) => undefined)
    resetPubSub()
    WakeLock.initialized = false
  })
  afterEach(() => {
    vi.restoreAllMocks()
    unmountDom()
  })
  it('should subscribe to Picture:LoadNew', () => {
    init()
    expect(subscribeStub.mock.calls.some((c) => c[0] === 'Picture:LoadNew')).toBe(true)
  })
  it('should execute takeLock on receiving Picture:LoadNew notification', async () => {
    init()
    const fn = capturedSubscriber(subscribeStub, 'Picture:LoadNew')
    await fn(undefined)
    expect(takeLockSpy.mock.calls.length).toBe(1)
  })
  it('should tolerate takeLock rejecting on receiving Picture:LoadNew notification', async () => {
    init()
    takeLockSpy.mockRejectedValue('FOO')
    const fn = capturedSubscriber(subscribeStub, 'Picture:LoadNew')
    await fn(undefined)
    expect(takeLockSpy.mock.calls.length).toBe(1)
  })
  it('should add interval for WakeLock:Release', () => {
    init()
    expect(addIntervalStub.mock.calls.some((c) => c[0] === 'WakeLock:Release')).toBe(true)
  })
  it('it should use an interval of 30 seconds for wakelock.Release()', () => {
    init()
    expect(addIntervalStub.mock.calls[0]?.[2]).toBe(30_000)
  })
  it('should invoke WakeLock.release() when release timer expires', () => {
    init()
    capturedInterval(addIntervalStub, 'WakeLock:Release')()
    expect(releaseLockSpy.mock.calls.length).toBe(1)
  })
  it('should tolerate WakeLock.release() rejecting when release timer expires', async () => {
    init()
    releaseLockSpy.mockRejectedValue('FOO')
    capturedInterval(addIntervalStub, 'WakeLock:Release')()
    await Promise.resolve()
    expect(releaseLockSpy.mock.calls.length).toBe(1)
  })
  it('should only register one Picture:LoadNew subscriber when init is called twice', () => {
    init()
    init()
    expect(subscribeStub.mock.calls.length).toBe(1)
  })
  it('should only call takeLock once per Picture:LoadNew when init is called twice', async () => {
    init()
    init()
    const fn = capturedSubscriber(subscribeStub, 'Picture:LoadNew')
    await fn(undefined)
    expect(takeLockSpy.mock.calls.length).toBe(1)
  })
})

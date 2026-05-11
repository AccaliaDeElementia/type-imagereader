'use sanity'

import Sinon from 'sinon'
import { JSDOM } from 'jsdom'
import { mountDom, unmountDom } from '#testutils/dom.js'

import { PubSub } from '#public/scripts/app/pubsub.js'
import { resetPubSub } from '#testutils/pubsub.js'
import assert from 'node:assert'
import { init, Internals, WakeLock } from '#public/scripts/app/wakelock.js'

const sandbox = Sinon.createSandbox()

describe('public/app/WakeLock init()', () => {
  let dom = new JSDOM('<html></html>', {})
  let takeLockSpy = sandbox.stub()
  let releaseLockSpy = sandbox.stub()
  beforeEach(() => {
    dom = new JSDOM('<html></html>', {})
    mountDom(dom)
    takeLockSpy = sandbox.stub(Internals, 'takeLock').resolves()
    releaseLockSpy = sandbox.stub(Internals, 'releaseLock').resolves()
    resetPubSub()
    WakeLock.initialized = false
  })
  afterEach(() => {
    sandbox.restore()
    unmountDom()
  })
  it('should subscribe to Picture:LoadNew', () => {
    init()
    expect(Object.keys(PubSub.subscribers)).toContain('PICTURE:LOADNEW')
  })
  it('should execute takeLock on receiving Picture:LoadNew notification', async () => {
    init()
    const [fn] = PubSub.subscribers['PICTURE:LOADNEW'] ?? []
    assert(fn !== undefined)
    await fn(undefined)
    expect(takeLockSpy.callCount).toBe(1)
  })
  it('should tolerate takeLock rejecting on receiving Picture:LoadNew notification', async () => {
    init()
    takeLockSpy.rejects('FOO')
    const [fn] = PubSub.subscribers['PICTURE:LOADNEW'] ?? []
    assert(fn !== undefined)
    await fn(undefined)
    expect(takeLockSpy.callCount).toBe(1)
  })
  it('should add interval for WakeLock:Release', () => {
    init()
    expect(Object.keys(PubSub.intervals)).toContain('WakeLock:Release')
  })
  it('it should use an interval of 30 seconds for wakelock.Release()', () => {
    init()
    const interval = PubSub.intervals['WakeLock:Release']
    assert(interval !== undefined)
    expect(interval.intervalCycles).toBe(3000)
  })
  it('should invoke WakeLock.release() when release timer expires', () => {
    init()
    const interval = PubSub.intervals['WakeLock:Release']
    assert(interval !== undefined)
    interval.method()
    expect(releaseLockSpy.callCount).toBe(1)
  })
  it('should tolerate WakeLock.release() rejecting when release timer expires', async () => {
    init()
    releaseLockSpy.rejects('FOO')
    const interval = PubSub.intervals['WakeLock:Release']
    assert(interval !== undefined)
    interval.method()
    await Promise.resolve()
    expect(releaseLockSpy.callCount).toBe(1)
  })
  it('should only register one Picture:LoadNew subscriber when init is called twice', () => {
    init()
    init()
    expect(PubSub.subscribers['PICTURE:LOADNEW']).toHaveLength(1)
  })
  it('should only call takeLock once per Picture:LoadNew when init is called twice', async () => {
    init()
    init()
    const [fn] = PubSub.subscribers['PICTURE:LOADNEW'] ?? []
    assert(fn !== undefined)
    await fn(undefined)
    expect(takeLockSpy.callCount).toBe(1)
  })
})

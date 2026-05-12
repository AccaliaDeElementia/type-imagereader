'use sanity'

import Sinon from 'sinon'
import { JSDOM } from 'jsdom'
import { mountDom, unmountDom } from '#testutils/dom.js'

import { capturedInterval, capturedSubscriber, resetPubSub } from '#testutils/pubsub.js'
import { init, Imports, Internals, WakeLock } from '#public/scripts/app/wakelock.js'

const sandbox = Sinon.createSandbox()

describe('public/app/WakeLock init()', () => {
  let dom = new JSDOM('<html></html>', {})
  let takeLockSpy = sandbox.stub()
  let releaseLockSpy = sandbox.stub()
  let subscribeStub = sandbox.stub()
  let addIntervalStub = sandbox.stub()
  beforeEach(() => {
    dom = new JSDOM('<html></html>', {})
    mountDom(dom)
    takeLockSpy = sandbox.stub(Internals, 'takeLock').resolves()
    releaseLockSpy = sandbox.stub(Internals, 'releaseLock').resolves()
    subscribeStub = sandbox.stub(Imports, 'subscribe')
    addIntervalStub = sandbox.stub(Imports, 'addInterval')
    resetPubSub()
    WakeLock.initialized = false
  })
  afterEach(() => {
    sandbox.restore()
    unmountDom()
  })
  it('should subscribe to Picture:LoadNew', () => {
    init()
    expect(subscribeStub.calledWith('Picture:LoadNew')).toBe(true)
  })
  it('should execute takeLock on receiving Picture:LoadNew notification', async () => {
    init()
    const fn = capturedSubscriber(subscribeStub, 'Picture:LoadNew')
    await fn(undefined)
    expect(takeLockSpy.callCount).toBe(1)
  })
  it('should tolerate takeLock rejecting on receiving Picture:LoadNew notification', async () => {
    init()
    takeLockSpy.rejects('FOO')
    const fn = capturedSubscriber(subscribeStub, 'Picture:LoadNew')
    await fn(undefined)
    expect(takeLockSpy.callCount).toBe(1)
  })
  it('should add interval for WakeLock:Release', () => {
    init()
    expect(addIntervalStub.calledWith('WakeLock:Release')).toBe(true)
  })
  it('it should use an interval of 30 seconds for wakelock.Release()', () => {
    init()
    expect(addIntervalStub.firstCall.args[2]).toBe(30_000)
  })
  it('should invoke WakeLock.release() when release timer expires', () => {
    init()
    capturedInterval(addIntervalStub, 'WakeLock:Release')()
    expect(releaseLockSpy.callCount).toBe(1)
  })
  it('should tolerate WakeLock.release() rejecting when release timer expires', async () => {
    init()
    releaseLockSpy.rejects('FOO')
    capturedInterval(addIntervalStub, 'WakeLock:Release')()
    await Promise.resolve()
    expect(releaseLockSpy.callCount).toBe(1)
  })
  it('should only register one Picture:LoadNew subscriber when init is called twice', () => {
    init()
    init()
    expect(subscribeStub.callCount).toBe(1)
  })
  it('should only call takeLock once per Picture:LoadNew when init is called twice', async () => {
    init()
    init()
    const fn = capturedSubscriber(subscribeStub, 'Picture:LoadNew')
    await fn(undefined)
    expect(takeLockSpy.callCount).toBe(1)
  })
})

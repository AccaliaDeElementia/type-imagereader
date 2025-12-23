'use sanity'

import Sinon from 'sinon'
import { expect } from 'chai'
import { JSDOM } from 'jsdom'

import { PubSub } from '../../../../public/scripts/app/pubsub'
import { Cast } from '../../../testutils/TypeGuards'
import assert from 'assert'
import { WakeLock } from '../../../../public/scripts/app/wakelock'

describe('public/app/wakelock function Init()', () => {
  const existingWindow = global.window
  const existingDocument = global.document
  let dom = new JSDOM('<html></html>', {})
  let takeLockSpy = Sinon.stub()
  let releaseLockSpy = Sinon.stub()
  beforeEach(() => {
    dom = new JSDOM('<html></html>', {})
    global.window = Cast<Window & typeof globalThis>(dom.window)
    global.document = dom.window.document
    takeLockSpy = Sinon.stub(WakeLock, 'TakeLock').resolves()
    releaseLockSpy = Sinon.stub(WakeLock, 'ReleaseLock').resolves()
    PubSub.subscribers = {}
  })
  afterEach(() => {
    takeLockSpy.restore()
    releaseLockSpy.restore()
    global.window = existingWindow
    global.document = existingDocument
  })
  after(() => {
    Sinon.restore()
  })
  it('should subscribe to Picture:LoadNew', () => {
    WakeLock.Init()
    expect(PubSub.subscribers).to.have.any.keys('PICTURE:LOADNEW')
  })
  it('should execute TakeLock on receiving Picture:LoadNew notification', async () => {
    WakeLock.Init()
    const fn = (PubSub.subscribers['PICTURE:LOADNEW'] ?? [])[0]
    assert(fn !== undefined)
    await fn(undefined)
    expect(takeLockSpy.callCount).to.equal(1)
  })
  it('should tolerate TakeLock rejecting on receiving Picture:LoadNew notification', async () => {
    WakeLock.Init()
    takeLockSpy.rejects('FOO')
    const fn = (PubSub.subscribers['PICTURE:LOADNEW'] ?? [])[0]
    assert(fn !== undefined)
    await fn(undefined)
    expect(takeLockSpy.callCount).to.equal(1)
  })
  it('should add interval for WakeLock:Release', () => {
    WakeLock.Init()
    expect(PubSub.intervals).to.have.any.keys('WakeLock:Release')
  })
  it('it should use an interval of 30 seconds for wakelock.Release()', () => {
    WakeLock.Init()
    const interval = PubSub.intervals['WakeLock:Release']
    assert(interval !== undefined)
    expect(interval.intervalCycles).to.equal(3000)
  })
  it('should invoke WakeLock.release() when release timer expires', () => {
    WakeLock.Init()
    const interval = PubSub.intervals['WakeLock:Release']
    assert(interval !== undefined)
    interval.method()
    expect(releaseLockSpy.callCount).to.equal(1)
  })
  it('should tolerate WakeLock.release() rejecting when release timer expires', async () => {
    WakeLock.Init()
    releaseLockSpy.rejects('FOO')
    const interval = PubSub.intervals['WakeLock:Release']
    assert(interval !== undefined)
    interval.method()
    await Promise.resolve()
    expect(releaseLockSpy.callCount).to.equal(1)
  })
})

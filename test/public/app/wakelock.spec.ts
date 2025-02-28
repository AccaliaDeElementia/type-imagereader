'use sanity'

import { expect } from 'chai'
import { suite, test } from '@testdeck/mocha'
import * as sinon from 'sinon'

import { JSDOM } from 'jsdom'
import { render } from 'pug'

import { PubSub } from '../../../public/scripts/app/pubsub'
import { WakeLock } from '../../../public/scripts/app/wakelock'
import type { WakeLockSentinel } from '../../../public/scripts/app/wakelock'
import assert from 'assert'
import { Cast } from '../../testutils/TypeGuards'

const markup = `
html
  body
`

class BaseTests {
  existingWindow: Window & typeof globalThis
  existingDocument: Document
  dom: JSDOM
  constructor() {
    this.existingWindow = global.window
    this.existingDocument = global.document
    this.dom = new JSDOM('', {})
  }

  before(): void {
    this.dom = new JSDOM(render(markup), {
      url: 'http://127.0.0.1:2999',
    })
    this.existingWindow = global.window
    global.window = Cast<Window & typeof globalThis>(this.dom.window)
    this.existingDocument = global.document
    global.document = this.dom.window.document
    PubSub.subscribers = {}
    PubSub.intervals = {}
    PubSub.deferred = []
  }

  after(): void {
    global.window = this.existingWindow
    global.document = this.existingDocument
  }
}

@suite
export class WakeLockInitTests extends BaseTests {
  takeLockSpy: sinon.SinonStub = sinon.stub()
  releaseLockSpy: sinon.SinonStub = sinon.stub()
  before(): void {
    super.before()
    this.takeLockSpy = sinon.stub(WakeLock, 'TakeLock').resolves()
    this.releaseLockSpy = sinon.stub(WakeLock, 'ReleaseLock').resolves()
  }

  after(): void {
    this.takeLockSpy.restore()
    this.releaseLockSpy.restore()
    super.after()
  }

  @test
  'it should subscribe to Picture:LoadNew'(): void {
    WakeLock.Init()
    expect(PubSub.subscribers).to.have.any.keys('PICTURE:LOADNEW')
  }

  @test
  'it should execute TakeLock on receiving Picture:LoadNew notification'(): void {
    WakeLock.Init()
    const fn = (PubSub.subscribers['PICTURE:LOADNEW'] ?? [])[0]
    assert(fn !== undefined)
    fn(undefined)
    expect(this.takeLockSpy.callCount).to.equal(1)
  }

  @test
  async 'it should tolerate TakeLock rejecting on receiving Picture:LoadNew notification'(): Promise<void> {
    WakeLock.Init()
    this.takeLockSpy.rejects('FOO')
    const fn = (PubSub.subscribers['PICTURE:LOADNEW'] ?? [])[0]
    assert(fn !== undefined)
    fn(undefined)
    await Promise.resolve()
    expect(this.takeLockSpy.callCount).to.equal(1)
  }

  @test
  'it should add interval for WakeLock:Release'(): void {
    WakeLock.Init()
    expect(PubSub.intervals).to.have.any.keys('WakeLock:Release')
  }

  @test
  'it should use an interval of 30 seconds for wakelock.Release()'(): void {
    WakeLock.Init()
    const interval = PubSub.intervals['WakeLock:Release']
    assert(interval !== undefined)
    expect(interval.intervalCycles).to.equal(3000)
  }

  @test
  'it should invoke WakeLock.release() when release timer expires'(): void {
    WakeLock.Init()
    const interval = PubSub.intervals['WakeLock:Release']
    assert(interval !== undefined)
    interval.method()
    expect(this.releaseLockSpy.callCount).to.equal(1)
  }

  @test
  async 'it should tolerate WakeLock.release() rejecting when release timer expires'(): Promise<void> {
    WakeLock.Init()
    this.releaseLockSpy.rejects('FOO')
    const interval = PubSub.intervals['WakeLock:Release']
    assert(interval !== undefined)
    interval.method()
    await Promise.resolve()
    expect(this.releaseLockSpy.callCount).to.equal(1)
  }
}

@suite
export class WakeLockTakeLockTests extends BaseTests {
  existingNavigator: Navigator = global.navigator
  clock: sinon.SinonFakeTimers | undefined
  wakelockRequest: sinon.SinonStub = sinon.stub()
  sentinel: WakeLockSentinel = {
    release: sinon.stub().resolves(),
    released: false,
  }

  before(): void {
    super.before()
    this.clock = sinon.useFakeTimers()
    WakeLock.sentinel = null
    WakeLock.timeout = 0
    this.sentinel = {
      release: sinon.stub().resolves(),
      released: false,
    }
    this.wakelockRequest = sinon.stub()
    this.wakelockRequest.resolves(this.sentinel)
    this.existingNavigator = global.navigator
    Object.defineProperty(global, 'navigator', {
      configurable: true,
      get: () => this.dom.window.navigator,
    })

    Object.defineProperty(global.navigator, 'wakeLock', {
      configurable: true,
      get: () => ({
        request: this.wakelockRequest,
      }),
    })
  }

  after(): void {
    Object.defineProperty(global.navigator, 'wakeLock', {
      configurable: true,
      get: () => undefined,
    })
    Object.defineProperty(global, 'navigator', {
      configurable: true,
      get: () => this.existingNavigator,
    })
    this.clock?.restore()
    super.after()
  }

  @test
  async 'it should take lock if sentinel is null'(): Promise<void> {
    await WakeLock.TakeLock()
    expect(this.wakelockRequest.callCount).to.equal(1)
  }

  @test
  async 'it should take lock if sentinel is already released'(): Promise<void> {
    WakeLock.sentinel = {
      release: async () => {
        await Promise.resolve()
      },
      released: true,
    }
    await WakeLock.TakeLock()
    expect(this.wakelockRequest.callCount).to.equal(1)
  }

  @test
  async 'it should not take lock if lock already held'(): Promise<void> {
    WakeLock.sentinel = {
      release: async () => {
        await Promise.resolve()
      },
      released: false,
    }
    await WakeLock.TakeLock()
    expect(this.wakelockRequest.callCount).to.equal(0)
  }

  @test
  async 'it should save lock sentinel when sentinel is null'(): Promise<void> {
    await WakeLock.TakeLock()
    expect(WakeLock.sentinel).to.equal(this.sentinel)
  }

  @test
  async 'it should save lock sentinel when current sentinel is already released'(): Promise<void> {
    WakeLock.sentinel = {
      release: async () => {
        await Promise.resolve()
      },
      released: true,
    }
    await WakeLock.TakeLock()
    expect(WakeLock.sentinel).to.equal(this.sentinel)
  }

  @test
  async 'it should not overwrite lock sentinel when lock already held'(): Promise<void> {
    WakeLock.sentinel = {
      release: async () => {
        await Promise.resolve()
      },
      released: false,
    }
    await WakeLock.TakeLock()
    expect(WakeLock.sentinel).to.not.equal(this.sentinel)
  }

  @test
  async 'it should set timeout when taking lock'(): Promise<void> {
    this.clock?.tick(3141)
    await WakeLock.TakeLock()
    expect(WakeLock.timeout).to.equal(123141) // 120 seconds plus system time
  }

  @test
  async 'it should reset timeout when lock already held'(): Promise<void> {
    this.clock?.tick(6282)
    WakeLock.sentinel = this.sentinel
    await WakeLock.TakeLock()
    expect(this.wakelockRequest.callCount).to.equal(0)
    expect(WakeLock.timeout).to.equal(126282) // 120 seconds plus system time
  }

  @test
  async 'it should reset state when lock request rejects'(): Promise<void> {
    WakeLock.sentinel = this.sentinel
    this.sentinel.released = true
    WakeLock.timeout = 1
    this.wakelockRequest.rejects('no you may not')
    await WakeLock.TakeLock()
    expect(WakeLock.sentinel).to.equal(null)
    expect(WakeLock.timeout).to.equal(0)
  }

  @test
  async 'it should reset state when lock request throws'(): Promise<void> {
    WakeLock.sentinel = this.sentinel
    this.sentinel.released = true
    WakeLock.timeout = 1
    this.wakelockRequest.throws('no you may not')
    await WakeLock.TakeLock()
    expect(WakeLock.sentinel).to.equal(null)
    expect(WakeLock.timeout).to.equal(0)
  }

  @test
  async 'it should reset state when wakeLock not supported'(): Promise<void> {
    WakeLock.sentinel = this.sentinel
    this.sentinel.released = true
    WakeLock.timeout = 1
    Object.defineProperty(navigator, 'wakeLock', {
      configurable: true,
      get: () => undefined,
    })
    await WakeLock.TakeLock()
    expect(WakeLock.sentinel).to.equal(null)
    expect(WakeLock.timeout).to.equal(0)
  }
}

@suite
export class WakeLockReleaseLockTests {
  clock: sinon.SinonFakeTimers | undefined
  sentinelRelease: sinon.SinonStub = sinon.stub()
  sentinel: WakeLockSentinel = {
    release: sinon.stub().resolves(),
    released: false,
  }

  before(): void {
    this.clock = sinon.useFakeTimers()
    WakeLock.sentinel = null
    WakeLock.timeout = 0
    this.sentinelRelease = sinon.stub().resolves()
    this.sentinel = {
      release: this.sentinelRelease,
      released: false,
    }
  }

  after(): void {
    this.clock?.restore()
  }

  @test
  async 'it should not release when sentinel is null'(): Promise<void> {
    this.clock?.tick(100)
    WakeLock.timeout = 10
    WakeLock.sentinel = null
    await WakeLock.ReleaseLock()
    expect(WakeLock.timeout).to.equal(10)
  }

  @test
  async 'it should not release when timeout is not expired'(): Promise<void> {
    this.clock?.tick(100)
    WakeLock.timeout = 110
    WakeLock.sentinel = this.sentinel
    await WakeLock.ReleaseLock()
    expect(WakeLock.timeout).to.equal(110)
    expect(this.sentinelRelease.callCount).to.equal(0)
  }

  @test
  async 'it should reset timeout when expired'(): Promise<void> {
    this.clock?.tick(100)
    WakeLock.timeout = 10
    WakeLock.sentinel = this.sentinel
    await WakeLock.ReleaseLock()
    expect(WakeLock.timeout).to.equal(0)
  }

  @test
  async 'it should null released sentinel'(): Promise<void> {
    this.clock?.tick(100)
    WakeLock.timeout = 10
    WakeLock.sentinel = this.sentinel
    await WakeLock.ReleaseLock()
    expect(WakeLock.sentinel).to.equal(null)
  }

  @test
  async 'it should release active sentinel when expired'(): Promise<void> {
    this.clock?.tick(100)
    WakeLock.timeout = 10
    WakeLock.sentinel = this.sentinel
    await WakeLock.ReleaseLock()
    expect(this.sentinelRelease.callCount).to.equal(1)
  }

  @test
  async 'it should not release already released sentinel when expired'(): Promise<void> {
    this.clock?.tick(100)
    WakeLock.timeout = 10
    WakeLock.sentinel = this.sentinel
    this.sentinel.released = true
    await WakeLock.ReleaseLock()
    expect(this.sentinelRelease.callCount).to.equal(0)
  }

  @test
  async 'it should handle when sentinel release rejects'(): Promise<void> {
    this.clock?.tick(100)
    WakeLock.timeout = 10
    WakeLock.sentinel = this.sentinel
    this.sentinelRelease.rejects('fool!')
    await WakeLock.ReleaseLock()
    expect(WakeLock.sentinel).to.equal(null)
  }

  @test
  async 'it should handle when sentinel release throws'(): Promise<void> {
    this.clock?.tick(100)
    WakeLock.timeout = 10
    WakeLock.sentinel = this.sentinel
    this.sentinelRelease.throws('fool!')
    await WakeLock.ReleaseLock()
    expect(WakeLock.sentinel).to.equal(null)
  }
}

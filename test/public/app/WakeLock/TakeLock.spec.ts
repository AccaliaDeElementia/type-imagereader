'use sanity'

import Sinon from 'sinon'
import { expect } from 'chai'
import { JSDOM } from 'jsdom'

import { takeLock, WakeLock, type WakeLockSentinel } from '#public/scripts/app/wakelock.js'

const sandbox = Sinon.createSandbox()
describe('public/app/WakeLock takeLock()', () => {
  const existingNavigator = global.navigator

  let clock: sinon.SinonFakeTimers | undefined = undefined
  let wakelockRequest = sandbox.stub()
  let sentinel: WakeLockSentinel = {
    release: sandbox.stub().resolves(),
    released: false,
  }
  let dom = new JSDOM('<html></html>', {})
  beforeEach(() => {
    dom = new JSDOM('<html></html>', {})
    clock = sandbox.useFakeTimers()
    WakeLock.sentinel = null
    WakeLock.timeout = 0
    sentinel = {
      release: sandbox.stub().resolves(),
      released: false,
    }

    wakelockRequest = sandbox.stub()
    wakelockRequest.resolves(sentinel)
    Object.defineProperty(global, 'navigator', {
      configurable: true,
      get: () => dom.window.navigator,
    })

    Object.defineProperty(global.navigator, 'wakeLock', {
      configurable: true,
      get: () => ({
        request: wakelockRequest,
      }),
    })
  })
  afterEach(() => {
    sandbox.restore()
    Object.defineProperty(global.navigator, 'wakeLock', {
      configurable: true,
      get: () => undefined,
    })
    Object.defineProperty(global, 'navigator', {
      configurable: true,
      get: () => existingNavigator,
    })
  })
  it('should take lock if sentinel is null', async () => {
    await takeLock()
    expect(wakelockRequest.callCount).to.equal(1)
  })
  it('should request screen level wakelock', async () => {
    await takeLock()
    expect(wakelockRequest.firstCall.args).to.deep.equal(['screen'])
  })
  it('should save sentinel when taking lock because sentinel is null', async () => {
    await takeLock()
    expect(WakeLock.sentinel).to.equal(sentinel)
  })
  it('should take lock when sentinal is already released', async () => {
    WakeLock.sentinel = {
      release: sandbox.stub().resolves(),
      released: true,
    }
    await takeLock()
    expect(wakelockRequest.callCount).to.equal(1)
  })
  it('should save sentinel when taking lock because sentinel already released', async () => {
    WakeLock.sentinel = {
      release: sandbox.stub().resolves(),
      released: true,
    }
    await takeLock()
    expect(WakeLock.sentinel).to.equal(sentinel)
  })
  it('should not take lock when sentinal is already held', async () => {
    WakeLock.sentinel = sentinel
    sentinel.released = false
    await takeLock()
    expect(wakelockRequest.callCount).to.equal(0)
  })
  it('should not overwrite sentinel when lock already held', async () => {
    const sent = {
      release: sandbox.stub().resolves(),
      released: false,
    }
    WakeLock.sentinel = sent
    await takeLock()
    expect(WakeLock.sentinel).to.equal(sent)
  })
  it('should set timeout when taking lock initially', async () => {
    clock?.tick(3141)
    await takeLock()
    expect(WakeLock.timeout).to.equal(123141, 'Timeout should be 120 seconds in the future')
  })
  it('should reset timeout when taking already held lock', async () => {
    clock?.tick(6282)
    WakeLock.sentinel = sentinel
    await takeLock()
    expect(WakeLock.timeout).to.equal(126282, 'Timeout should be 120 seconds in the future')
  })
  it('should reset sentinal when lock request throws', async () => {
    WakeLock.sentinel = {
      release: sandbox.stub().resolves(),
      released: true,
    }
    wakelockRequest.throws('FOO')
    await takeLock()
    expect(WakeLock.sentinel).to.equal(null)
  })
  it('should reset timeout when lock request throws', async () => {
    WakeLock.timeout = 999999
    wakelockRequest.throws('FOO')
    await takeLock()
    expect(WakeLock.timeout).to.equal(0)
  })
  it('should reset sentinal when lock request rejects', async () => {
    WakeLock.sentinel = {
      release: sandbox.stub().resolves(),
      released: true,
    }
    wakelockRequest.rejects('FOO')
    await takeLock()
    expect(WakeLock.sentinel).to.equal(null)
  })
  it('should reset timeout when lock request rejects', async () => {
    WakeLock.timeout = 9999999
    wakelockRequest.rejects('FOO')
    await takeLock()
    expect(WakeLock.timeout).to.equal(0)
  })
  it('should gracefully handle missing wakelock functionality', async () => {
    WakeLock.sentinel = sentinel
    sentinel.released = true
    WakeLock.timeout = -1
    Object.defineProperty(navigator, 'wakeLock', {
      configurable: true,
      get: () => undefined,
    })
    const fn = async (): Promise<unknown> => {
      await takeLock()
      return undefined
    }
    expect(await fn()).to.equal(undefined, 'should not reject or throw')
  })
  it('should reset sentinel when missing wakelock functionality', async () => {
    WakeLock.sentinel = sentinel
    sentinel.released = true
    WakeLock.timeout = -1
    Object.defineProperty(navigator, 'wakeLock', {
      configurable: true,
      get: () => undefined,
    })
    await takeLock()
    expect(WakeLock.sentinel).to.equal(null)
  })
  it('should request the wake lock only once when takeLock is called concurrently', async () => {
    const { promise, resolve } = Promise.withResolvers<WakeLockSentinel>()
    wakelockRequest.returns(promise)
    const a = takeLock()
    const b = takeLock()
    resolve(sentinel)
    await Promise.all([a, b])
    expect(wakelockRequest.callCount).to.equal(1)
  })

  it('should reset timeout when missing wakelock functionality', async () => {
    WakeLock.sentinel = sentinel
    sentinel.released = true
    WakeLock.timeout = -1
    Object.defineProperty(navigator, 'wakeLock', {
      configurable: true,
      get: () => undefined,
    })
    await takeLock()
    expect(WakeLock.timeout).to.equal(0)
  })
})

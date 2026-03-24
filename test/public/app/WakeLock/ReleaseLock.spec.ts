'use sanity'

import Sinon from 'sinon'
import { expect } from 'chai'

import { WakeLock, type WakeLockSentinel } from '../../../../public/scripts/app/wakelock'

describe('public/app/wakelock function TakeLock()', () => {
  let clock: sinon.SinonFakeTimers | undefined = undefined
  let sentinelRelease: sinon.SinonStub = Sinon.stub().resolves()
  let sentinel: WakeLockSentinel = {
    release: sentinelRelease,
    released: false,
  }
  beforeEach(() => {
    clock = Sinon.useFakeTimers()
    WakeLock.sentinel = null
    WakeLock.timeout = 0
    sentinelRelease = Sinon.stub().resolves()
    sentinel = {
      release: sentinelRelease,
      released: false,
    }
  })
  afterEach(() => {
    clock?.restore()
  })
  after(() => {
    Sinon.restore()
  })
  it('should reset timeout when sentinel is null and timeout has expired', async () => {
    WakeLock.sentinel = null
    WakeLock.timeout = 1154
    clock?.tick(9001)
    await WakeLock.ReleaseLock()
    expect(WakeLock.timeout).to.equal(0)
  })
  it('should not reset timeout when sentinel is null and timeout has not expired', async () => {
    WakeLock.sentinel = null
    WakeLock.timeout = 9002
    clock?.tick(9001)
    await WakeLock.ReleaseLock()
    expect(WakeLock.timeout).to.equal(9002)
  })
  it('should not release lock when timeout is not expired', async () => {
    WakeLock.sentinel = sentinel
    WakeLock.timeout = 101
    clock?.tick(100)
    await WakeLock.ReleaseLock()
    expect(WakeLock.sentinel).to.equal(sentinel)
  })
  it('should reset timeout when expired', async () => {
    WakeLock.sentinel = sentinel
    WakeLock.timeout = 99
    clock?.tick(100)
    await WakeLock.ReleaseLock()
    expect(WakeLock.timeout).to.equal(0)
  })
  it('should reset active sentinel when expired', async () => {
    WakeLock.sentinel = sentinel
    sentinel.released = false
    WakeLock.timeout = 99
    clock?.tick(100)
    await WakeLock.ReleaseLock()
    expect(WakeLock.sentinel).to.equal(null)
  })
  it('should reset released sentinel when expired', async () => {
    WakeLock.sentinel = sentinel
    sentinel.released = true
    WakeLock.timeout = 99
    clock?.tick(100)
    await WakeLock.ReleaseLock()
    expect(WakeLock.sentinel).to.equal(null)
  })
  it('should release active sentinel when expired', async () => {
    WakeLock.sentinel = sentinel
    sentinel.released = false
    WakeLock.timeout = 99
    clock?.tick(100)
    await WakeLock.ReleaseLock()
    expect(sentinelRelease.callCount).to.equal(1)
  })
  it('should not release released sentinel when expired', async () => {
    WakeLock.sentinel = sentinel
    sentinel.released = true
    WakeLock.timeout = 99
    clock?.tick(100)
    await WakeLock.ReleaseLock()
    expect(sentinelRelease.callCount).to.equal(0)
  })
  it('should gracefully handle sentinel release throwing', async () => {
    WakeLock.sentinel = sentinel
    sentinel.released = true
    WakeLock.timeout = 99
    clock?.tick(100)
    sentinelRelease.throws('FOOL!')
    await WakeLock.ReleaseLock()
    expect(WakeLock.sentinel).to.equal(null)
  })
  it('should gracefully handle sentinel release rejecting', async () => {
    WakeLock.sentinel = sentinel
    sentinel.released = true
    WakeLock.timeout = 99
    clock?.tick(100)
    sentinelRelease.rejects('FOOL!')
    await WakeLock.ReleaseLock()
    expect(WakeLock.sentinel).to.equal(null)
  })
  it('should reset timeout when timeout equals current time with no sentinel', async () => {
    WakeLock.sentinel = null
    WakeLock.timeout = 100
    clock?.tick(100)
    await WakeLock.ReleaseLock()
    expect(WakeLock.timeout).to.equal(0)
  })
  it('should release sentinel when timeout equals current time', async () => {
    WakeLock.sentinel = sentinel
    sentinel.released = false
    WakeLock.timeout = 100
    clock?.tick(100)
    await WakeLock.ReleaseLock()
    expect(WakeLock.sentinel).to.equal(null)
  })
  it('should call sentinel release when timeout equals current time', async () => {
    WakeLock.sentinel = sentinel
    sentinel.released = false
    WakeLock.timeout = 100
    clock?.tick(100)
    await WakeLock.ReleaseLock()
    expect(sentinelRelease.callCount).to.equal(1)
  })
})

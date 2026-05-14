'use sanity'

import { cast } from '#testutils/typeGuards.js'

import { releaseLock, WakeLock, type WakeLockSentinel } from '#public/scripts/app/wakelock.js'

describe('public/app/WakeLock releaseLock()', () => {
  let sentinelRelease = vi.fn().mockResolvedValue(undefined)
  let sentinel: WakeLockSentinel = {
    release: sentinelRelease,
    released: false,
  }
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(0)
    WakeLock.sentinel = null
    WakeLock.timeout = 0
    sentinelRelease = vi.fn().mockResolvedValue(undefined)
    sentinel = {
      release: sentinelRelease,
      released: false,
    }
  })
  it('should reset timeout when sentinel is null and timeout has expired', async () => {
    WakeLock.sentinel = null
    WakeLock.timeout = 1154
    vi.advanceTimersByTime(9001)
    await releaseLock()
    expect(WakeLock.timeout).toBe(0)
  })
  it('should not reset timeout when sentinel is null and timeout has not expired', async () => {
    WakeLock.sentinel = null
    WakeLock.timeout = 9002
    vi.advanceTimersByTime(9001)
    await releaseLock()
    expect(WakeLock.timeout).toBe(9002)
  })
  it('should not release lock when timeout is not expired', async () => {
    WakeLock.sentinel = sentinel
    WakeLock.timeout = 101
    vi.advanceTimersByTime(100)
    await releaseLock()
    expect(WakeLock.sentinel).toBe(sentinel)
  })
  it('should reset timeout when expired', async () => {
    WakeLock.sentinel = sentinel
    WakeLock.timeout = 99
    vi.advanceTimersByTime(100)
    await releaseLock()
    expect(WakeLock.timeout).toBe(0)
  })
  it('should reset active sentinel when expired', async () => {
    WakeLock.sentinel = sentinel
    sentinel.released = false
    WakeLock.timeout = 99
    vi.advanceTimersByTime(100)
    await releaseLock()
    expect(WakeLock.sentinel).toBe(null)
  })
  it('should reset released sentinel when expired', async () => {
    WakeLock.sentinel = sentinel
    sentinel.released = true
    WakeLock.timeout = 99
    vi.advanceTimersByTime(100)
    await releaseLock()
    expect(WakeLock.sentinel).toBe(null)
  })
  it('should release active sentinel when expired', async () => {
    WakeLock.sentinel = sentinel
    sentinel.released = false
    WakeLock.timeout = 99
    vi.advanceTimersByTime(100)
    await releaseLock()
    expect(sentinelRelease.mock.calls.length).toBe(1)
  })
  it('should not release released sentinel when expired', async () => {
    WakeLock.sentinel = sentinel
    sentinel.released = true
    WakeLock.timeout = 99
    vi.advanceTimersByTime(100)
    await releaseLock()
    expect(sentinelRelease.mock.calls.length).toBe(0)
  })
  it('should gracefully handle sentinel release throwing', async () => {
    WakeLock.sentinel = sentinel
    sentinel.released = true
    WakeLock.timeout = 99
    vi.advanceTimersByTime(100)
    sentinelRelease.mockImplementation(() => {
      throw cast<Error>('FOOL!')
    })
    await releaseLock()
    expect(WakeLock.sentinel).toBe(null)
  })
  it('should gracefully handle sentinel release rejecting', async () => {
    WakeLock.sentinel = sentinel
    sentinel.released = true
    WakeLock.timeout = 99
    vi.advanceTimersByTime(100)
    sentinelRelease.mockRejectedValue('FOOL!')
    await releaseLock()
    expect(WakeLock.sentinel).toBe(null)
  })
  it('should gracefully handle sentinel release rejecting when sentinel is active', async () => {
    WakeLock.sentinel = sentinel
    sentinel.released = false
    WakeLock.timeout = 99
    vi.advanceTimersByTime(100)
    sentinelRelease.mockRejectedValue(new Error('release failed'))
    await releaseLock()
    expect(WakeLock.sentinel).toBe(null)
  })
  it('should gracefully handle sentinel release throwing when sentinel is active', async () => {
    WakeLock.sentinel = sentinel
    sentinel.released = false
    WakeLock.timeout = 99
    vi.advanceTimersByTime(100)
    sentinelRelease.mockImplementation(() => {
      throw new Error('release failed')
    })
    await releaseLock()
    expect(WakeLock.sentinel).toBe(null)
  })
  it('should preserve a sentinel installed during an in-flight release', async () => {
    const { promise: releasePromise, resolve: resolveRelease } = Promise.withResolvers<undefined>()
    const sentinelA: WakeLockSentinel = {
      release: vi.fn().mockReturnValue(releasePromise),
      released: false,
    }
    const sentinelB: WakeLockSentinel = {
      release: vi.fn().mockResolvedValue(undefined),
      released: false,
    }
    WakeLock.sentinel = sentinelA
    WakeLock.timeout = 99
    vi.advanceTimersByTime(100)
    const releasing = releaseLock()
    WakeLock.sentinel = sentinelB
    resolveRelease(undefined)
    await releasing
    expect(WakeLock.sentinel).toBe(sentinelB)
  })

  it('should reset timeout when timeout equals current time with no sentinel', async () => {
    WakeLock.sentinel = null
    WakeLock.timeout = 100
    vi.advanceTimersByTime(100)
    await releaseLock()
    expect(WakeLock.timeout).toBe(0)
  })
  it('should release sentinel when timeout equals current time', async () => {
    WakeLock.sentinel = sentinel
    sentinel.released = false
    WakeLock.timeout = 100
    vi.advanceTimersByTime(100)
    await releaseLock()
    expect(WakeLock.sentinel).toBe(null)
  })
  it('should call sentinel release when timeout equals current time', async () => {
    WakeLock.sentinel = sentinel
    sentinel.released = false
    WakeLock.timeout = 100
    vi.advanceTimersByTime(100)
    await releaseLock()
    expect(sentinelRelease.mock.calls.length).toBe(1)
  })
})

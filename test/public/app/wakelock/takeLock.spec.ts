'use sanity'

import { cast } from '#testutils/typeGuards.js'

import { JSDOM } from 'jsdom'

import { takeLock, WakeLock, type WakeLockSentinel } from '#public/scripts/app/wakelock.js'

describe('public/app/WakeLock takeLock()', () => {
  const existingNavigator = global.navigator
  let wakelockRequest = vi.fn()
  let sentinel: WakeLockSentinel = {
    release: vi.fn().mockResolvedValue(undefined),
    released: false,
  }
  let dom = new JSDOM('<html></html>', {})
  beforeEach(() => {
    dom = new JSDOM('<html></html>', {})
    vi.useFakeTimers()
    vi.setSystemTime(0)
    WakeLock.sentinel = null
    WakeLock.timeout = 0
    sentinel = {
      release: vi.fn().mockResolvedValue(undefined),
      released: false,
    }

    wakelockRequest = vi.fn()
    wakelockRequest.mockResolvedValue(sentinel)
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
    vi.restoreAllMocks()
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
    expect(wakelockRequest.mock.calls.length).toBe(1)
  })
  it('should request screen level wakelock', async () => {
    await takeLock()
    expect(wakelockRequest.mock.calls[0]).toEqual(['screen'])
  })
  it('should save sentinel when taking lock because sentinel is null', async () => {
    await takeLock()
    expect(WakeLock.sentinel).toBe(sentinel)
  })
  it('should take lock when sentinal is already released', async () => {
    WakeLock.sentinel = {
      release: vi.fn().mockResolvedValue(undefined),
      released: true,
    }
    await takeLock()
    expect(wakelockRequest.mock.calls.length).toBe(1)
  })
  it('should save sentinel when taking lock because sentinel already released', async () => {
    WakeLock.sentinel = {
      release: vi.fn().mockResolvedValue(undefined),
      released: true,
    }
    await takeLock()
    expect(WakeLock.sentinel).toBe(sentinel)
  })
  it('should not take lock when sentinal is already held', async () => {
    WakeLock.sentinel = sentinel
    sentinel.released = false
    await takeLock()
    expect(wakelockRequest.mock.calls.length).toBe(0)
  })
  it('should not overwrite sentinel when lock already held', async () => {
    const sent = {
      release: vi.fn().mockResolvedValue(undefined),
      released: false,
    }
    WakeLock.sentinel = sent
    await takeLock()
    expect(WakeLock.sentinel).toBe(sent)
  })
  it('should set timeout when taking lock initially', async () => {
    vi.advanceTimersByTime(3141)
    await takeLock()
    expect(WakeLock.timeout, 'Timeout should be 120 seconds in the future').toBe(123141)
  })
  it('should reset timeout when taking already held lock', async () => {
    vi.advanceTimersByTime(6282)
    WakeLock.sentinel = sentinel
    await takeLock()
    expect(WakeLock.timeout, 'Timeout should be 120 seconds in the future').toBe(126282)
  })
  it('should reset sentinal when lock request throws', async () => {
    WakeLock.sentinel = {
      release: vi.fn().mockResolvedValue(undefined),
      released: true,
    }
    wakelockRequest.mockImplementation(() => {
      throw cast<Error>('FOO')
    })
    await takeLock()
    expect(WakeLock.sentinel).toBe(null)
  })
  it('should reset timeout when lock request throws', async () => {
    WakeLock.timeout = 999999
    wakelockRequest.mockImplementation(() => {
      throw cast<Error>('FOO')
    })
    await takeLock()
    expect(WakeLock.timeout).toBe(0)
  })
  it('should reset sentinal when lock request rejects', async () => {
    WakeLock.sentinel = {
      release: vi.fn().mockResolvedValue(undefined),
      released: true,
    }
    wakelockRequest.mockRejectedValue('FOO')
    await takeLock()
    expect(WakeLock.sentinel).toBe(null)
  })
  it('should reset timeout when lock request rejects', async () => {
    WakeLock.timeout = 9999999
    wakelockRequest.mockRejectedValue('FOO')
    await takeLock()
    expect(WakeLock.timeout).toBe(0)
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
    expect(await fn(), 'should not reject or throw').toBe(undefined)
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
    expect(WakeLock.sentinel).toBe(null)
  })
  it('should request the wake lock only once when takeLock is called concurrently', async () => {
    const { promise, resolve } = Promise.withResolvers<WakeLockSentinel>()
    wakelockRequest.mockReturnValue(promise)
    const a = takeLock()
    const b = takeLock()
    resolve(sentinel)
    await Promise.all([a, b])
    expect(wakelockRequest.mock.calls.length).toBe(1)
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
    expect(WakeLock.timeout).toBe(0)
  })
})

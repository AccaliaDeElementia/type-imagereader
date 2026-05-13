'use sanity'

import { delay } from '#testutils/utils.js'

describe('testutils delay()', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('should not resolve before the specified delay elapses', async () => {
    let resolved = false
    const promise = delay(100).then(() => {
      resolved = true
    })
    await vi.advanceTimersByTimeAsync(99)
    expect(resolved).toBe(false)
    await vi.advanceTimersByTimeAsync(1)
    await promise
    expect(resolved).toBe(true)
  })
  it('should resolve after the specified delay elapses', async () => {
    let resolved = false
    const promise = delay(100).then(() => {
      resolved = true
    })
    await vi.advanceTimersByTimeAsync(100)
    await promise
    expect(resolved).toBe(true)
  })
})

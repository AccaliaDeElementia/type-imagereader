'use sanity'

import { expect, vi } from 'vitest'

const LEAKED_FAKE_TIMERS_MESSAGE =
  "This test finished with vitest fake timers still installed. vi.restoreAllMocks() does not undo them, so every later test in the file would silently run on a frozen clock. Call vi.useRealTimers() in the spec's own afterEach."

export function restoreRealTimersAndFailOnLeak(): void {
  const leakedFakeTimers = vi.isFakeTimers()
  vi.useRealTimers()
  expect(leakedFakeTimers, LEAKED_FAKE_TIMERS_MESSAGE).toBe(false)
}

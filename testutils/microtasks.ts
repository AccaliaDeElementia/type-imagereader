'use sanity'

import { setImmediate as macroYield } from 'node:timers/promises'

// The engine drains the microtask queue completely between macrotasks, so one
// yield flushes a chain of any depth; N chained `await Promise.resolve()` calls
// FIFO-resume the caller and so only advance N hops.
//
// Mocked out by `vi.useFakeTimers()` along with the rest of setImmediate —
// fake-timer specs need `vi.runAllTimersAsync()` instead.
export async function flushMicrotasks(): Promise<void> {
  await macroYield()
}

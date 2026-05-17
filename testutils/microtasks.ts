'use sanity'

import { setImmediate as macroYield } from 'node:timers/promises'

// Drain all queued microtasks, including those dynamically scheduled by other
// microtasks during draining. Works by yielding to a macrotask boundary
// (setImmediate) — the engine drains the microtask queue completely between
// macrotasks.
//
// Prefer this over chained `await Promise.resolve()` calls when the production
// promise chain depth is non-trivial or may grow: each `await Promise.resolve()`
// FIFO-resumes the test continuation, so N awaits only flush N microtask hops.
// `flushMicrotasks` drains everything in one call.
//
// CAVEAT: does NOT work under `vi.useFakeTimers()` (fake timers mock
// setImmediate too). Fake-timer specs should use `vi.runAllTimersAsync()` or
// `vi.advanceTimersByTimeAsync(0)` instead.
export async function flushMicrotasks(): Promise<void> {
  await macroYield()
}

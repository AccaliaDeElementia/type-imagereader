'use sanity'

import { vi, type Mock, type MockInstance } from 'vitest'

// Find the first call to `stub` whose arguments match `predicate`.
// Returns the args array of the matching call (or undefined if no match).
export function findStubCall(
  stub: MockInstance,
  predicate: (args: readonly unknown[]) => boolean,
): readonly unknown[] | undefined {
  return stub.mock.calls.find((args) => predicate(args))
}

// A vitest Mock typed as `(...args: unknown[]) => void`. Use this when passing a
// spy into a slot whose declared type is void-returning (EventEmitter listeners,
// NextFunction, PubSub VoidMethod, etc.) — the explicit void return satisfies
// `@typescript-eslint/strict-void-return` while still recording calls and
// arguments for `.mock.calls` assertions.
export function voidFn(): Mock<(...args: unknown[]) => void> {
  return vi.fn<(...args: unknown[]) => void>()
}

'use sanity'

import type { MockInstance } from 'vitest'

// Find the first call to `stub` whose arguments match `predicate`.
// Returns the args array of the matching call (or undefined if no match).
export function findStubCall(
  stub: MockInstance,
  predicate: (args: readonly unknown[]) => boolean,
): readonly unknown[] | undefined {
  return stub.mock.calls.find((args) => predicate(args))
}

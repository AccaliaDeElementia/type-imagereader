'use sanity'

import { vi, type Mock, type MockInstance } from 'vitest'

export function findStubCall(
  stub: MockInstance,
  predicate: (args: readonly unknown[]) => boolean,
): readonly unknown[] | undefined {
  return stub.mock.calls.find((args) => predicate(args))
}

// A bare vi.fn() in a void-returning slot trips `@typescript-eslint/strict-void-return`.
export function voidFn(): Mock<(...args: unknown[]) => void> {
  return vi.fn<(...args: unknown[]) => void>()
}

'use sanity'

export function required<T>(value: T | null | undefined, description: string): T {
  if (value === null) {
    throw new Error(`test precondition failed: ${description} was null`)
  }
  if (value === undefined) {
    throw new Error(`test precondition failed: ${description} was undefined`)
  }
  return value
}

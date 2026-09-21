'use sanity'

export function requirePresent<T>(value: T, description: string): asserts value is NonNullable<T> {
  if (value === null) {
    throw new Error(`test precondition failed: ${description} was null`)
  }
  if (value === undefined) {
    throw new Error(`test precondition failed: ${description} was undefined`)
  }
}

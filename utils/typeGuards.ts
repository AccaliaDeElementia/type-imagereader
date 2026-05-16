'use sanity'

export function isDictionary(obj: unknown): obj is Record<string, unknown> {
  return obj !== null && typeof obj === 'object' && !Array.isArray(obj)
}

export function hasRequiredKey(obj: object, key: string, isT: (o: unknown) => boolean): boolean {
  if (!Object.hasOwn(obj, key)) return false
  const value: unknown = Object.getOwnPropertyDescriptor(obj, key)?.value
  return isT(value)
}

export function hasOptionalKey(obj: object, key: string, isT: (o: unknown) => boolean): boolean {
  if (!Object.hasOwn(obj, key)) return true
  const value: unknown = Object.getOwnPropertyDescriptor(obj, key)?.value
  return value === undefined || isT(value)
}

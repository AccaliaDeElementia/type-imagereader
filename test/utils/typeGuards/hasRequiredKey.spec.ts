'use sanity'

import { hasRequiredKey } from '#utils/typeGuards.js'

describe('utils/typeGuards hasRequiredKey()', () => {
  it('should return false when the key is absent', () => {
    expect(hasRequiredKey({}, 'foo', () => true)).toBe(false)
  })
  it('should return true when the key is present and the predicate accepts the value', () => {
    expect(hasRequiredKey({ foo: 'bar' }, 'foo', (o) => typeof o === 'string')).toBe(true)
  })
  it('should return false when the key is present but the predicate rejects the value', () => {
    expect(hasRequiredKey({ foo: 42 }, 'foo', (o) => typeof o === 'string')).toBe(false)
  })
  it('should pass the property value to the predicate', () => {
    const predicate = vi.fn().mockReturnValue(true)
    hasRequiredKey({ foo: 'hello' }, 'foo', predicate)
    expect(predicate.mock.calls[0]?.[0]).toBe('hello')
  })
  it('should reject inherited properties not present as own', () => {
    const obj: object = {}
    Object.setPrototypeOf(obj, { inherited: 'value' })
    expect(hasRequiredKey(obj, 'inherited', () => true)).toBe(false)
  })
  it('should pass an explicit undefined value through to the predicate', () => {
    expect(hasRequiredKey({ foo: undefined }, 'foo', (o) => o === undefined)).toBe(true)
  })
})

'use sanity'

import { hasOptionalKey } from '#utils/typeGuards.js'

describe('utils/typeGuards hasOptionalKey()', () => {
  it('should return true when the key is absent', () => {
    expect(hasOptionalKey({}, 'foo', () => false)).toBe(true)
  })
  it('should return true when the key is present and the predicate accepts the value', () => {
    expect(hasOptionalKey({ foo: 'bar' }, 'foo', (o) => typeof o === 'string')).toBe(true)
  })
  it('should return false when the key is present but the predicate rejects the value', () => {
    expect(hasOptionalKey({ foo: 42 }, 'foo', (o) => typeof o === 'string')).toBe(false)
  })
  it('should return true when the key is present but the value is explicitly undefined (bypassing the predicate)', () => {
    expect(hasOptionalKey({ foo: undefined }, 'foo', () => false)).toBe(true)
  })
  it('should pass the property value to the predicate', () => {
    const predicate = vi.fn().mockReturnValue(true)
    hasOptionalKey({ foo: 'hello' }, 'foo', predicate)
    expect(predicate.mock.calls[0]?.[0]).toBe('hello')
  })
  it('should treat inherited properties as absent', () => {
    const obj: object = {}
    Object.setPrototypeOf(obj, { inherited: 'value' })
    expect(hasOptionalKey(obj, 'inherited', () => false)).toBe(true)
  })
})

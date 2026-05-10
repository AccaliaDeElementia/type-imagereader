'use sanity'

import { cast } from '#testutils/typeGuards.js'

describe('testutils cast()', () => {
  it('should return the value when isT returns true', () => {
    const value = 42
    expect(cast(value, (o): o is number => typeof o === 'number')).toBe(42)
  })
  it('should throw when isT returns false', () => {
    const isNumber = (o: unknown): o is number => typeof o === 'number'
    expect(() => cast('not a number', isNumber)).toThrow('Object is not correct type to cast')
  })
})

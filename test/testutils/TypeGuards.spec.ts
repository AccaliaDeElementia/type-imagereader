'use sanity'

import { expect } from 'chai'

import { Cast } from '#testutils/TypeGuards.js'

describe('testutils/TypeGuards function Cast()', () => {
  it('should return the value when isT returns true', () => {
    const value = 42
    expect(Cast(value, (o): o is number => typeof o === 'number')).to.equal(42)
  })
  it('should throw when isT returns false', () => {
    const isNumber = (o: unknown): o is number => typeof o === 'number'
    expect(() => Cast('not a number', isNumber)).to.throw('Object is not correct type to cast')
  })
})

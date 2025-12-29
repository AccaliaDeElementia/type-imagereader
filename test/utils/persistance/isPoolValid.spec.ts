'use sanity'

import { expect } from 'chai'
import { TypeGuards } from '../../../utils/persistance'

describe('utils/persistance function isPoolValid()', () => {
  it('should accept missing pool element', () => {
    expect(TypeGuards.isPoolValid({})).to.equal(true)
  })
  const tests: Array<[string, unknown, boolean]> = [
    ['valid pool', { min: 2, max: 6 }, true],
    ['null pool', null, false],
    ['undefined pool', undefined, false],
    ['array pool', [], false],
    ['non object pool', true, false],
    ['string pool', 'pool', false],
    ['missing min value', { max: 6 }, false],
    ['null min value', { min: null, max: 6 }, false],
    ['undefined min value', { min: undefined, max: 6 }, false],
    ['non number min value', { min: '2', max: 6 }, false],
    ['missing max value', { min: 2 }, false],
    ['null max value', { min: 2, max: null }, false],
    ['undefined max value', { min: 2, max: undefined }, false],
    ['non number max value', { min: 2, max: '6' }, false],
    ['max less than min', { min: 6, max: 2 }, false],
    ['max equal min', { min: 6, max: 6 }, false],
  ]
  tests.forEach(([title, input, expected]) => {
    it(`should ${expected ? 'accept' : 'reject'} ${title}`, () => {
      expect(TypeGuards.isPoolValid({ pool: input })).to.equal(expected)
    })
  })
})

'use sanity'

import { expect } from 'chai'
import { TypeGuards } from '../../../utils/persistance'

describe('utils/persistance function isDictionary()', () => {
  const tests: Array<[string, unknown, boolean]> = [
    ['valid dictionary', { min: 2, max: 6 }, true],
    ['null dictionary', null, false],
    ['undefined dictionary', undefined, false],
    ['array dictionary', [], false],
    ['boolean dictionary', true, false],
    ['string dictionary', 'pool', false],
  ]
  tests.forEach(([title, input, expected]) => {
    it(`should ${expected ? 'accept' : 'reject'} ${title}`, () => {
      expect(TypeGuards.isDictionary(input)).to.equal(expected)
    })
  })
})

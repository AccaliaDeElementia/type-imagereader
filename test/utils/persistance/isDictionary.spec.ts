'use sanity'

import { isDictionary } from '#utils/persistance.js'

describe('utils/persistance isDictionary()', () => {
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
      expect(isDictionary(input)).toBe(expected)
    })
  })
})

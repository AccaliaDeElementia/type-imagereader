'use sanity'

import { expect } from 'chai'
import { IndexPercentToText } from '../../../utils/helpers'

describe('utils/helpers function IndexPercentToText()', () => {
  const tests: Array<[string, number, number, string]> = [
    ['index 0 of 1', 0, 1, '100'],
    ['index 0 of 10', 0, 10, '10'],
    ['index 4 of 10', 4, 10, '50'],
    ['index 9 of 10', 9, 10, '100'],
    ['index 0 of 100', 0, 100, '1'],
    ['index 49 of 100', 49, 100, '50'],
    ['index 99 of 100', 99, 100, '100'],
    ['index 0 of 0', 0, 0, '0'],
    ['index 5 of 0', 5, 0, '0'],
    // Gap A: decimal output — verifies PERCENT_MULT/PERCENT_DIV precision path
    ['index 0 of 3', 0, 3, '33.3'],
    ['index 1 of 3', 1, 3, '66.6'],
    ['index 0 of 7', 0, 7, '14.2'],
    ['index 1 of 7', 1, 7, '28.5'],
    // Gap B: index beyond last valid position
    ['index 10 of 10', 10, 10, '110'],
    ['index 5 of 3', 5, 3, '200'],
  ]
  tests.forEach(([title, index, total, expected]) => {
    it(`should return '${expected}' for ${title}`, () => {
      expect(IndexPercentToText(index, total)).to.equal(expected)
    })
  })
})

'use sanity'

import { indexToText } from '#utils/helpers.js'

describe('utils/helpers indexToText()', () => {
  const tests: Array<[string, number, string]> = [
    ['index 0', 0, (1).toLocaleString()],
    ['index 1', 1, (2).toLocaleString()],
    ['index 9', 9, (10).toLocaleString()],
    ['index 99', 99, (100).toLocaleString()],
    ['index 999', 999, (1000).toLocaleString()],
  ]
  tests.forEach(([title, index, expected]) => {
    it(`should return '${expected}' for ${title}`, () => {
      expect(indexToText(index)).toBe(expected)
    })
  })
})

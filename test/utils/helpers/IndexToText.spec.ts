'use sanity'

import { expect } from 'chai'
import { IndexToText } from '../../../utils/helpers'

describe('utils/helpers function IndexToText()', () => {
  const tests: Array<[string, number, string]> = [
    ['index 0', 0, (1).toLocaleString()],
    ['index 1', 1, (2).toLocaleString()],
    ['index 9', 9, (10).toLocaleString()],
    ['index 99', 99, (100).toLocaleString()],
    ['index 999', 999, (1000).toLocaleString()],
  ]
  tests.forEach(([title, index, expected]) => {
    it(`should return '${expected}' for ${title}`, () => {
      expect(IndexToText(index)).to.equal(expected)
    })
  })
})

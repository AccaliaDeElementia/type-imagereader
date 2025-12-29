'use sanity'

import { expect } from 'chai'
import { StringIsNullOrEmpty } from '../../../utils/helpers'

describe('utils/helpers function StringIsNullOrEmpty()', () => {
  const tests: Array<[string, string | null | undefined, boolean]> = [
    ['null', null, true],
    ['undefined', undefined, true],
    ['empty', '', true],
    ["'a'", 'a', false],
    ["'1'", '1', false],
    ['non empty string', 'a valid string', false],
  ]
  tests.forEach(([title, value, expected]) => {
    it(`should ${expected ? 'accept' : 'reject'} ${title}`, () => {
      expect(StringIsNullOrEmpty(value)).to.equal(expected)
    })
  })
})

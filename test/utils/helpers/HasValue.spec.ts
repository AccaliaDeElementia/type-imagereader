'use sanity'

import { expect } from 'chai'
import { HasValue } from '#utils/helpers.js'

describe('utils/helpers function HasValue()', () => {
  const tests: Array<[string, unknown, boolean]> = [
    ['null', null, false],
    ['undefined', undefined, false],
    ['a string value', 'foo', true],
    ['an empty string', '', true],
    ['zero', 0, true],
    ['false', false, true],
    ['an object', { key: 'value' }, true],
    ['an empty array', [], true],
  ]
  tests.forEach(([title, input, expected]) => {
    it(`should return ${String(expected)} for ${title}`, () => {
      expect(HasValue(input)).to.equal(expected)
    })
  })
})

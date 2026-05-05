'use sanity'

import { expect } from 'chai'
import { HasValues } from '#utils/helpers.js'
import { Cast } from '#testutils/TypeGuards.js'

describe('utils/helpers function HasValues()', () => {
  const tests: Array<[string, unknown, boolean]> = [
    ['null', null, false],
    ['undefined', undefined, false],
    ['empty array', [], false],
    ['empty string', '', false],
    ['array with one element', [1], true],
    ['array with multiple elements', [1, 2, 3], true],
    ['non-empty string', 'abc', true],
  ]
  tests.forEach(([title, input, expected]) => {
    it(`should return ${String(expected)} for ${title}`, () => {
      expect(HasValues(Cast<Parameters<typeof HasValues>[0]>(input))).to.equal(expected)
    })
  })
})

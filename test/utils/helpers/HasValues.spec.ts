'use sanity'

import { expect } from 'chai'
import { hasValues } from '#utils/helpers.js'
import { Cast } from '#testutils/TypeGuards.js'

describe('utils/helpers hasValues()', () => {
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
      expect(hasValues(Cast<Parameters<typeof hasValues>[0]>(input))).to.equal(expected)
    })
  })
})

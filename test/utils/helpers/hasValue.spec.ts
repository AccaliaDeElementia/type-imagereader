'use sanity'

import { hasValue } from '#utils/helpers.js'

describe('utils/helpers hasValue()', () => {
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
      expect(hasValue(input)).toBe(expected)
    })
  })
})

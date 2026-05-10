'use sanity'

import { stringishHasValue } from '#utils/helpers.js'

describe('utils/helpers stringishHasValue()', () => {
  const tests: Array<[string, string | null | undefined, boolean]> = [
    ['null', null, false],
    ['undefined', undefined, false],
    ['empty string', '', false],
    ["single character 'a'", 'a', true],
    ["single character '1'", '1', true],
    ['non-empty string', 'a valid string', true],
  ]
  tests.forEach(([title, value, expected]) => {
    it(`should return ${String(expected)} for ${title}`, () => {
      expect(stringishHasValue(value)).toBe(expected)
    })
  })
})

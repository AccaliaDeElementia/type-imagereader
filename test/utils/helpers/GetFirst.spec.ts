'use sanity'

import { expect } from 'chai'
import { getFirst } from '#utils/helpers.js'
import { Cast } from '#testutils/TypeGuards.js'

describe('utils/helpers getFirst()', () => {
  const tests: Array<[string, unknown, unknown]> = [
    ['null', null, undefined],
    ['undefined', undefined, undefined],
    ['empty array', [], undefined],
    ['single-element array', ['only'], 'only'],
    ['multi-element array', ['first', 'second', 'third'], 'first'],
    ['array with undefined first element', [undefined, 'second'], undefined],
    ['array with null first element', [null, 'second'], null],
    ['a string', 'abc', 'a'],
  ]
  tests.forEach(([title, input, expected]) => {
    it(`should return ${JSON.stringify(expected)} for ${title}`, () => {
      expect(getFirst(Cast<Parameters<typeof getFirst>[0]>(input))).to.equal(expected)
    })
  })
})

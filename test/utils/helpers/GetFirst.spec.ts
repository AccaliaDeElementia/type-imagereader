'use sanity'

import { expect } from 'chai'
import { GetFirst } from '#utils/helpers.js'
import { Cast } from '#testutils/TypeGuards.js'

describe('utils/helpers function GetFirst()', () => {
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
      expect(GetFirst(Cast<Parameters<typeof GetFirst>[0]>(input))).to.equal(expected)
    })
  })
})

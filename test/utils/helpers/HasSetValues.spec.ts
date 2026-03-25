'use sanity'

import { expect } from 'chai'
import { HasSetValues } from '#utils/helpers'
import Sinon from 'sinon'
import { Cast } from '#testutils/TypeGuards'

describe('utils/helpers function HasSetValues()', () => {
  const add = Sinon.stub()
  const tests: Array<[string, unknown, boolean]> = [
    ['null', null, false],
    ['undefined', undefined, false],
    ['set-like with size zero', { size: 0, add }, false],
    ['set-like with size one', { size: 1, add }, true],
    ['set-like with size greater than one', { size: 42, add }, true],
    ['a native Set with one element', new Set([1]), true],
    ['an empty native Set', new Set(), false],
  ]
  tests.forEach(([title, input, expected]) => {
    it(`should return ${String(expected)} for ${title}`, () => {
      expect(HasSetValues(Cast<Parameters<typeof HasSetValues>[0]>(input))).to.equal(expected)
    })
  })
})

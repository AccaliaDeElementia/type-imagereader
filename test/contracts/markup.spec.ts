'use sanity'

import { describe, it } from 'mocha'
import { expect } from 'chai'
import { isHTMLElement } from '../../contracts/markup'

describe('Contracts: isHTMLElement()', () => {
  const cases: Array<[string, unknown, boolean]> = [
    ['null', null, false],
    ['undefined', undefined, false],
    ['dict', {}, false],
    ['array', [], false],
    ['"HTMLElement"', { style: {} }, true],
  ]
  cases.forEach(([title, obj, expected]) => {
    it(`should return ${expected} for ${title}`, () => {
      expect(isHTMLElement(obj)).to.equal(expected)
    })
  })
})

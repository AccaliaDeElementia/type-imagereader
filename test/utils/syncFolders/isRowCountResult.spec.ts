'use sanity'

import { expect } from 'chai'
import { isRowCountResult } from '../../../utils/syncfolders'

describe('utils/syncfolders function isRowCountResult()', () => {
  const tests: Array<[string, unknown, boolean]> = [
    ['null', null, false],
    ['undefined', undefined, false],
    ['empty string', '', false],
    ['empty object', {}, false],
    ['array', [], false],
    ['number', 42, false],
    ['boolean', true, false],
    ['valid result', { rowCount: 42 }, true],
    ['null rowCount', { rowCount: null }, false],
    ['undefined rowCount', { rowCount: undefined }, false],
    ['object rowCount', { rowCount: {} }, false],
    ['array rowCount', { rowCount: [] }, false],
    ['string rowCount', { rowCount: 'string' }, false],
    ['boolean rowCount', { rowCount: true }, false],
  ]
  tests.forEach(([title, value, expected]) => {
    it(`should ${expected ? 'accept' : 'reject'} ${title}`, () => {
      expect(isRowCountResult(value)).to.equal(expected)
    })
  })
})

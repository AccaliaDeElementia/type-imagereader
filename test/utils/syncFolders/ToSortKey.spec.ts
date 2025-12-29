'use sanity'

import { expect } from 'chai'
import { Functions } from '../../../utils/syncfolders'

describe('utils/syncfolders function ToSortKey()', () => {
  beforeEach(() => {
    Functions.padLength = 20
  })
  const tests: Array<[string, string, number, string]> = [
    ['should return key unchanged with no replacers', 'some key', 20, 'some key'],
    ['should return key lowercased with no replacers', 'SOME KEY', 20, 'some key'],
    ['should replace number words with numbers', 'FIFTY', 2, '50'],
    ['should replace number words with numbers', 'miracle on forty-second street', 2, 'miracle on 42 street'],
    ['should pad numbers to length', 'FIFTY', 5, '00050'],
    ['should replace positional number words with numbers', 'second story', 2, '02 story'],
    ['should not shrink numbers longer than padding', '0123456789', 5, '0123456789'],
    ['should not shrink decimal numbers', 'three point one four one five nine two', 3, '003.141592'],
  ]
  tests.forEach(([title, value, padding, expected]) => {
    it(title, () => {
      Functions.padLength = padding
      expect(Functions.ToSortKey(value)).to.equal(expected)
    })
  })
})

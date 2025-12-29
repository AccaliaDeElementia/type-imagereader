'use sanity'

import { expect } from 'chai'
import { Functions } from '../../../utils/syncfolders'

describe('utils/syncfolders function Chunk()', () => {
  beforeEach(() => {
    Functions.padLength = 20
  })
  const tests: Array<[string, unknown[], number, unknown[][]]> = [
    ['it should not split chunk of smaller entries', [0, 1, 2, 3, 4, 5], 10, [[0, 1, 2, 3, 4, 5]]],
    [
      'it should split chunk of larger entries',
      ['a', 'b', 'c', 'd', 'e', 'f', 'g'],
      5,
      [
        ['a', 'b', 'c', 'd', 'e'],
        ['f', 'g'],
      ],
    ],
    ['it shhould handle empty input', [], 100, []],
  ]
  tests.forEach(([title, value, spread, expected]) => {
    it(title, () => {
      expect(Functions.Chunk(value, spread)).to.deep.equal(expected)
    })
  })
})

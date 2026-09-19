'use sanity'

import { chunk, DEFAULT_CHUNK_SIZE, Helpers } from '#sync/helpers.js'

describe('sync/helpers chunk()', () => {
  beforeEach(() => {
    Helpers.padLength = 20
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
    ['it should handle empty input', [], 100, []],
  ]
  tests.forEach(([title, value, spread, expected]) => {
    it(title, () => {
      expect(chunk(value, spread)).toEqual(expected)
    })
  })
  it('should keep exactly DEFAULT_CHUNK_SIZE entries in a single chunk when no size argument is provided', () => {
    expect(chunk(Array.from({ length: DEFAULT_CHUNK_SIZE }))).toHaveLength(1)
  })
  it('should split one entry past DEFAULT_CHUNK_SIZE into two chunks when no size argument is provided', () => {
    expect(chunk(Array.from({ length: DEFAULT_CHUNK_SIZE + 1 }))).toHaveLength(2)
  })
})

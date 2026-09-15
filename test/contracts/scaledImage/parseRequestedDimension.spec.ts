'use sanity'

import { parseRequestedDimension, UNBOUNDED } from '#contracts/scaledImage.js'

describe('Contracts: parseRequestedDimension()', () => {
  const cases: Array<[string, number | undefined]> = [
    ['auto', UNBOUNDED],
    ['1', 1],
    ['1920', 1920],
    ['0', undefined],
    ['-1', undefined],
    ['01', undefined],
    ['1.5', undefined],
    ['AUTO', undefined],
    ['auto ', undefined],
    ['', undefined],
    ['nonsense', undefined],
  ]
  cases.forEach(([segment, expected]) => {
    it(`should parse ${JSON.stringify(segment)} as ${String(expected)}`, () => {
      expect(parseRequestedDimension(segment)).toBe(expected)
    })
  })
})

'use sanity'

import { hasSetValues } from '#utils/helpers.js'
import { cast } from '#testutils/typeGuards.js'

describe('utils/helpers hasSetValues()', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })
  const add = vi.fn()
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
      expect(hasSetValues(cast<Parameters<typeof hasSetValues>[0]>(input))).toBe(expected)
    })
  })
})

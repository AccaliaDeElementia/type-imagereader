'use sanity'

import { isSizeMode, SIZE_MODES } from '#public/scripts/app/sizeMode.js'

describe('public/app/sizeMode isSizeMode()', () => {
  SIZE_MODES.forEach((mode) => {
    it(`should accept ${mode}`, () => {
      expect(isSizeMode(mode)).toBe(true)
    })
  })
  const rejected: Array<[string, unknown]> = [
    ['undefined', undefined],
    ['null', null],
    ['a number', 1],
    ['an unknown name', 'enhance'],
    ['a differently cased name', 'FitScreen'],
    ['the legacy boolean', 'true'],
  ]
  rejected.forEach(([title, value]) => {
    it(`should reject ${title}`, () => {
      expect(isSizeMode(value)).toBe(false)
    })
  })
})

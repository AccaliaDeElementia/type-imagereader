'use sanity'

import { isKnexOptions, Internals } from '#utils/persistence.js'
import type { MockInstance } from 'vitest'

describe('utils/persistence isKnexOptions()', () => {
  let isMigrationsValidStub: MockInstance = vi.fn()
  let isConnectionValid: MockInstance = vi.fn()
  let isPoolValid: MockInstance = vi.fn()
  beforeEach(() => {
    isMigrationsValidStub = vi.spyOn(Internals, 'isMigrationsValid').mockReturnValue(true)
    isConnectionValid = vi.spyOn(Internals, 'isConnectionValid').mockReturnValue(true)
    isPoolValid = vi.spyOn(Internals, 'isPoolValid').mockReturnValue(true)
  })
  const tests: Array<[string, unknown, boolean]> = [
    ['null', null, false],
    ['undefined', undefined, false],
    ['array', [], false],
    ['non object', 'options', false],
    ['missing client', {}, false],
    ['null client', { client: null }, false],
    ['undefined client', { client: undefined }, false],
    ['array client', { client: [] }, false],
    ['non string client', { client: 42 }, false],
    ['valid client', { client: 'sqlite', useNullAsDefault: false }, true],
    ['missing useNullAsDefault client', { client: 'sqlite' }, true],
    ['null useNullAsDefault', { client: 'sqlite', useNullAsDefault: null }, false],
    ['undefined useNullAsDefault', { client: 'sqlite', useNullAsDefault: undefined }, false],
    ['object useNullAsDefault', { client: 'sqlite', useNullAsDefault: {} }, false],
    ['array useNullAsDefault', { client: 'sqlite', useNullAsDefault: [] }, false],
    ['number useNullAsDefault', { client: 'sqlite', useNullAsDefault: 42 }, false],
    ['non boolean useNullAsDefault', { client: 'sqlite', useNullAsDefault: 'true' }, false],
  ]
  tests.forEach(([title, input, expected]) => {
    it(`should ${expected ? 'accept' : 'reject'} ${title}`, () => {
      expect(isKnexOptions(input)).toBe(expected)
    })
  })
  it('should reject when isMigrationsValidStub fails', () => {
    isMigrationsValidStub.mockReturnValue(false)
    expect(isKnexOptions({ client: 'sqlite' })).toBe(false)
  })
  it('should reject when isConnectionValid fails', () => {
    isConnectionValid.mockReturnValue(false)
    expect(isKnexOptions({ client: 'sqlite' })).toBe(false)
  })
  it('should reject when isPoolValid fails', () => {
    isPoolValid.mockReturnValue(false)
    expect(isKnexOptions({ client: 'sqlite' })).toBe(false)
  })
})

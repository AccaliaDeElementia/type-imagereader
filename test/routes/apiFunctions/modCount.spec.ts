'use sanity'

import { Imports, ModCount, type ModCountInternals } from '#routes/apiFunctions.js'
import { cast } from '#testutils/typeGuards.js'
import type { MockInstance } from 'vitest'
const modCountInternals = cast<ModCountInternals>(ModCount)

describe('routes/apiFunctions ModCount functions', () => {
  let mathFloorSpy: MockInstance = vi.fn()
  let mathRandomSpy: MockInstance = vi.fn()
  let loggerStub: MockInstance = vi.fn()
  beforeEach(() => {
    mathFloorSpy = vi.spyOn(Math, 'floor')
    mathRandomSpy = vi.spyOn(Math, 'random')
    modCountInternals.modCount = 5050
    loggerStub = vi.spyOn(Imports, 'logger').mockImplementation(cast(() => undefined))
  })
  it('reset() should call Math.random once', () => {
    modCountInternals.reset()
    expect(mathRandomSpy.mock.calls.length).toBe(1)
  })
  it('reset() should call Math.random with no args', () => {
    modCountInternals.reset()
    expect(mathRandomSpy.mock.calls[0]).toHaveLength(0)
  })
  it('reset() should call Math.floor once to extend start location to (0, 1e10]', () => {
    modCountInternals.reset()
    expect(mathFloorSpy.mock.calls.length).toBe(1)
  })
  it('reset() should call Math.floor with one argument', () => {
    modCountInternals.reset()
    expect(mathFloorSpy.mock.calls[0]).toHaveLength(1)
  })
  it('reset() should extend start location to (0, 1e10] using Math.floor', () => {
    modCountInternals.reset()
    const value = 1e10 * mathRandomSpy.mock.results[0]?.value
    expect(mathFloorSpy.mock.calls[0]?.[0]).toBe(value)
  })
  it('reset() should return floored integer value', () => {
    const result = modCountInternals.reset()
    const value = mathFloorSpy.mock.results[0]?.value as unknown
    expect(result).toBe(value)
  })
  it('reset() should store floored integer value in modCount', () => {
    modCountInternals.reset()
    const value = mathFloorSpy.mock.results[0]?.value as unknown
    expect(modCountInternals.modCount).toBe(value)
  })
  it('reset() should log the new modcount value', () => {
    modCountInternals.reset()
    const matched = loggerStub.mock.calls.some((c) => String(c[0]).includes('ModCount reset'))
    expect(matched).toBe(true)
  })
  it('get() It should return modcount value', () => {
    modCountInternals.modCount = 69420
    expect(ModCount.get()).toBe(69420)
  })
  it('validateAndIncrement() should return null when modcount mismatches', () => {
    modCountInternals.modCount = 69420
    expect(ModCount.validateAndIncrement(8675309)).toBe(null)
  })
  it('validateAndIncrement() should not change stored modcount when mismatch', () => {
    modCountInternals.modCount = 69420
    ModCount.validateAndIncrement(8675309)
    expect(modCountInternals.modCount).toBe(69420)
  })
  it('validateAndIncrement() should return incremented modcount when match', () => {
    modCountInternals.modCount = 69420
    expect(ModCount.validateAndIncrement(69420)).toBe(69421)
  })
  it('validateAndIncrement() should update stored modcount when match', () => {
    modCountInternals.modCount = 69420
    ModCount.validateAndIncrement(69420)
    expect(modCountInternals.modCount).toBe(69421)
  })
  it('validateAndIncrement() should reset modcount on rollover', () => {
    modCountInternals.modCount = Number.MAX_SAFE_INTEGER
    expect(ModCount.validateAndIncrement(Number.MAX_SAFE_INTEGER)).toBe(1)
  })
  it('validateAndIncrement() should reset modcount at exact rollover boundary', () => {
    modCountInternals.modCount = Number.MAX_SAFE_INTEGER - 1
    expect(ModCount.validateAndIncrement(Number.MAX_SAFE_INTEGER - 1)).toBe(1)
  })
})

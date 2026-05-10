'use sanity'

import { extractInsertCount } from '#sync/helpers.js'

describe('sync/helpers extractInsertCount()', () => {
  it('should return rowCount for postgresql style result', () => {
    expect(extractInsertCount({ rowCount: 256 })).toBe(256)
  })
  it('should return first element for sqlite style result', () => {
    expect(extractInsertCount([65536])).toBe(65536)
  })
  it('should return 0 for empty array', () => {
    expect(extractInsertCount([])).toBe(0)
  })
  it('should return 0 for undefined', () => {
    expect(extractInsertCount(undefined)).toBe(0)
  })
  it('should return 0 for null', () => {
    expect(extractInsertCount(null)).toBe(0)
  })
  it('should return 0 for string array', () => {
    expect(extractInsertCount(['not a number'])).toBe(0)
  })
  it('should return 0 for object without rowCount', () => {
    expect(extractInsertCount({ other: 42 })).toBe(0)
  })
  it('should return 0 for non-numeric rowCount', () => {
    expect(extractInsertCount({ rowCount: 'not a number' })).toBe(0)
  })
  it('should return first element only for multi-element array', () => {
    expect(extractInsertCount([10, 20, 30])).toBe(10)
  })
  it('should prefer rowCount over array style when both present', () => {
    const result = Object.assign([42], { rowCount: 99 })
    expect(extractInsertCount(result)).toBe(99)
  })
})

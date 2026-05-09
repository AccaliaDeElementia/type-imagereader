'use sanity'

import { expect } from 'chai'
import { ExtractInsertCount } from '#sync/helpers.js'

describe('sync/helpers ExtractInsertCount()', () => {
  it('should return rowCount for postgresql style result', () => {
    expect(ExtractInsertCount({ rowCount: 256 })).to.equal(256)
  })
  it('should return first element for sqlite style result', () => {
    expect(ExtractInsertCount([65536])).to.equal(65536)
  })
  it('should return 0 for empty array', () => {
    expect(ExtractInsertCount([])).to.equal(0)
  })
  it('should return 0 for undefined', () => {
    expect(ExtractInsertCount(undefined)).to.equal(0)
  })
  it('should return 0 for null', () => {
    expect(ExtractInsertCount(null)).to.equal(0)
  })
  it('should return 0 for string array', () => {
    expect(ExtractInsertCount(['not a number'])).to.equal(0)
  })
  it('should return 0 for object without rowCount', () => {
    expect(ExtractInsertCount({ other: 42 })).to.equal(0)
  })
  it('should return 0 for non-numeric rowCount', () => {
    expect(ExtractInsertCount({ rowCount: 'not a number' })).to.equal(0)
  })
  it('should return first element only for multi-element array', () => {
    expect(ExtractInsertCount([10, 20, 30])).to.equal(10)
  })
  it('should prefer rowCount over array style when both present', () => {
    const result = Object.assign([42], { rowCount: 99 })
    expect(ExtractInsertCount(result)).to.equal(99)
  })
})

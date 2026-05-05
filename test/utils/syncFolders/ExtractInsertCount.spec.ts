'use sanity'

import { expect } from 'chai'
import { Functions } from '#utils/syncfolders.js'

describe('utils/syncfolders function ExtractInsertCount()', () => {
  it('should return rowCount for postgresql style result', () => {
    expect(Functions.ExtractInsertCount({ rowCount: 256 })).to.equal(256)
  })
  it('should return first element for sqlite style result', () => {
    expect(Functions.ExtractInsertCount([65536])).to.equal(65536)
  })
  it('should return 0 for empty array', () => {
    expect(Functions.ExtractInsertCount([])).to.equal(0)
  })
  it('should return 0 for undefined', () => {
    expect(Functions.ExtractInsertCount(undefined)).to.equal(0)
  })
  it('should return 0 for null', () => {
    expect(Functions.ExtractInsertCount(null)).to.equal(0)
  })
  it('should return 0 for string array', () => {
    expect(Functions.ExtractInsertCount(['not a number'])).to.equal(0)
  })
  it('should return 0 for object without rowCount', () => {
    expect(Functions.ExtractInsertCount({ other: 42 })).to.equal(0)
  })
  it('should return 0 for non-numeric rowCount', () => {
    expect(Functions.ExtractInsertCount({ rowCount: 'not a number' })).to.equal(0)
  })
  it('should return first element only for multi-element array', () => {
    expect(Functions.ExtractInsertCount([10, 20, 30])).to.equal(10)
  })
  it('should prefer rowCount over array style when both present', () => {
    const result = Object.assign([42], { rowCount: 99 })
    expect(Functions.ExtractInsertCount(result)).to.equal(99)
  })
})

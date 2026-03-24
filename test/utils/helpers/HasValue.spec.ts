'use sanity'

import { expect } from 'chai'
import { HasValue } from '../../../utils/helpers'

describe('utils/helpers function HasValue()', () => {
  it('should return false for null', () => {
    expect(HasValue(null)).to.equal(false)
  })
  it('should return false for undefined', () => {
    expect(HasValue(undefined)).to.equal(false)
  })
  it('should return true for a string value', () => {
    expect(HasValue('foo')).to.equal(true)
  })
  it('should return true for an empty string', () => {
    expect(HasValue('')).to.equal(true)
  })
  it('should return true for zero', () => {
    expect(HasValue(0)).to.equal(true)
  })
  it('should return true for false', () => {
    expect(HasValue(false)).to.equal(true)
  })
  it('should return true for an object', () => {
    expect(HasValue({ key: 'value' })).to.equal(true)
  })
  it('should return true for an empty array', () => {
    expect(HasValue([])).to.equal(true)
  })
})

'use sanity'

import { expect } from 'chai'
import { HasValues } from '../../../utils/helpers'

describe('utils/helpers function HasValues()', () => {
  it('should return false for null', () => {
    expect(HasValues(null)).to.equal(false)
  })
  it('should return false for undefined', () => {
    expect(HasValues(undefined)).to.equal(false)
  })
  it('should return false for empty array', () => {
    expect(HasValues([])).to.equal(false)
  })
  it('should return false for empty string', () => {
    expect(HasValues('')).to.equal(false)
  })
  it('should return true for array with one element', () => {
    expect(HasValues([1])).to.equal(true)
  })
  it('should return true for array with multiple elements', () => {
    expect(HasValues([1, 2, 3])).to.equal(true)
  })
  it('should return true for non-empty string', () => {
    expect(HasValues('abc')).to.equal(true)
  })
})

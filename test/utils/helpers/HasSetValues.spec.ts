'use sanity'

import { expect } from 'chai'
import { HasSetValues } from '../../../utils/helpers'
import Sinon from 'sinon'

describe('utils/helpers function HasSetValues()', () => {
  const add = Sinon.stub()

  it('should return false for null', () => {
    expect(HasSetValues(null)).to.equal(false)
  })
  it('should return false for undefined', () => {
    expect(HasSetValues(undefined)).to.equal(false)
  })
  it('should return false for set-like with size zero', () => {
    expect(HasSetValues({ size: 0, add })).to.equal(false)
  })
  it('should return true for set-like with size one', () => {
    expect(HasSetValues({ size: 1, add })).to.equal(true)
  })
  it('should return true for set-like with size greater than one', () => {
    expect(HasSetValues({ size: 42, add })).to.equal(true)
  })
  it('should return true for a native Set with one element', () => {
    expect(HasSetValues(new Set([1]))).to.equal(true)
  })
  it('should return false for an empty native Set', () => {
    expect(HasSetValues(new Set())).to.equal(false)
  })
})

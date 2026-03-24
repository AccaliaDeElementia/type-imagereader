'use sanity'

import { expect } from 'chai'
import { GetFirst } from '../../../utils/helpers'

describe('utils/helpers function GetFirst()', () => {
  it('should return undefined for null', () => {
    const result = GetFirst(null)
    expect(result).to.equal(undefined)
  })
  it('should return undefined for undefined', () => {
    const result = GetFirst(undefined)
    expect(result).to.equal(undefined)
  })
  it('should return undefined for empty array', () => {
    const result = GetFirst<string>([])
    expect(result).to.equal(undefined)
  })
  it('should return the first element of a single-element array', () => {
    expect(GetFirst(['only'])).to.equal('only')
  })
  it('should return the first element of a multi-element array', () => {
    expect(GetFirst(['first', 'second', 'third'])).to.equal('first')
  })
  it('should return undefined when first element is undefined', () => {
    const result = GetFirst([undefined, 'second'])
    expect(result).to.equal(undefined)
  })
  it('should return null when first element is null', () => {
    expect(GetFirst([null, 'second'])).to.equal(null)
  })
  it('should return the first character of a string', () => {
    expect(GetFirst('abc')).to.equal('a')
  })
})

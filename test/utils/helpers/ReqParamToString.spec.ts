'use sanity'

import { expect } from 'chai'
import { ReqParamToString } from '#utils/helpers'

describe('utils/helpers function ReqParamToString()', () => {
  describe('null and undefined input', () => {
    it('should return default value for null', () => {
      expect(ReqParamToString(null)).to.equal('')
    })
    it('should return default value for undefined', () => {
      expect(ReqParamToString(undefined)).to.equal('')
    })
    it('should return provided default value for null', () => {
      expect(ReqParamToString(null, 'fallback')).to.equal('fallback')
    })
    it('should return provided default value for undefined', () => {
      expect(ReqParamToString(undefined, 'fallback')).to.equal('fallback')
    })
  })

  describe('string input', () => {
    it('should return the string when non-empty', () => {
      expect(ReqParamToString('foo')).to.equal('foo')
    })
    it('should return default value for empty string', () => {
      expect(ReqParamToString('')).to.equal('')
    })
    it('should return provided default value for empty string', () => {
      expect(ReqParamToString('', 'fallback')).to.equal('fallback')
    })
    it('should return string unchanged when it contains slashes', () => {
      expect(ReqParamToString('foo/bar')).to.equal('foo/bar')
    })
  })

  describe('array input', () => {
    it('should join array elements with slash', () => {
      expect(ReqParamToString(['foo', 'bar'])).to.equal('foo/bar')
    })
    it('should return single element array as string', () => {
      expect(ReqParamToString(['foo'])).to.equal('foo')
    })
    it('should return default value for empty array', () => {
      expect(ReqParamToString([])).to.equal('')
    })
    it('should return provided default value for empty array', () => {
      expect(ReqParamToString([], 'fallback')).to.equal('fallback')
    })
    it('should join array of empty strings as slash-separated result', () => {
      expect(ReqParamToString(['', ''])).to.equal('/')
    })
    it('should preserve path segments when joining array', () => {
      expect(ReqParamToString(['foo', 'bar', 'baz'])).to.equal('foo/bar/baz')
    })
  })

  describe('defaultValue parameter', () => {
    it('should use empty string as default value when not provided', () => {
      expect(ReqParamToString(null)).to.equal('')
    })
    it('should use provided default value when input resolves to empty', () => {
      expect(ReqParamToString('', '/default/path')).to.equal('/default/path')
    })
    it('should not use default value when string input is non-empty', () => {
      expect(ReqParamToString('foo', 'fallback')).to.equal('foo')
    })
    it('should not use default value when array input is non-empty', () => {
      expect(ReqParamToString(['foo', 'bar'], 'fallback')).to.equal('foo/bar')
    })
  })
})

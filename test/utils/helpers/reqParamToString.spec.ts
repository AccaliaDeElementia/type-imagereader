'use sanity'

import { expect } from 'chai'
import { reqParamToString } from '#utils/helpers.js'

describe('utils/helpers reqParamToString()', () => {
  describe('null and undefined input', () => {
    it('should return default value for null', () => {
      expect(reqParamToString(null)).to.equal('')
    })
    it('should return default value for undefined', () => {
      expect(reqParamToString(undefined)).to.equal('')
    })
    it('should return provided default value for null', () => {
      expect(reqParamToString(null, 'fallback')).to.equal('fallback')
    })
    it('should return provided default value for undefined', () => {
      expect(reqParamToString(undefined, 'fallback')).to.equal('fallback')
    })
  })

  describe('string input', () => {
    it('should return the string when non-empty', () => {
      expect(reqParamToString('foo')).to.equal('foo')
    })
    it('should return default value for empty string', () => {
      expect(reqParamToString('')).to.equal('')
    })
    it('should return provided default value for empty string', () => {
      expect(reqParamToString('', 'fallback')).to.equal('fallback')
    })
    it('should return string unchanged when it contains slashes', () => {
      expect(reqParamToString('foo/bar')).to.equal('foo/bar')
    })
  })

  describe('array input', () => {
    it('should join array elements with slash', () => {
      expect(reqParamToString(['foo', 'bar'])).to.equal('foo/bar')
    })
    it('should return single element array as string', () => {
      expect(reqParamToString(['foo'])).to.equal('foo')
    })
    it('should return default value for empty array', () => {
      expect(reqParamToString([])).to.equal('')
    })
    it('should return provided default value for empty array', () => {
      expect(reqParamToString([], 'fallback')).to.equal('fallback')
    })
    it('should join array of empty strings as slash-separated result', () => {
      expect(reqParamToString(['', ''])).to.equal('/')
    })
    it('should preserve path segments when joining array', () => {
      expect(reqParamToString(['foo', 'bar', 'baz'])).to.equal('foo/bar/baz')
    })
  })

  describe('defaultValue parameter', () => {
    it('should use empty string as default value when not provided', () => {
      expect(reqParamToString(null)).to.equal('')
    })
    it('should use provided default value when input resolves to empty', () => {
      expect(reqParamToString('', '/default/path')).to.equal('/default/path')
    })
    it('should not use default value when string input is non-empty', () => {
      expect(reqParamToString('foo', 'fallback')).to.equal('foo')
    })
    it('should not use default value when array input is non-empty', () => {
      expect(reqParamToString(['foo', 'bar'], 'fallback')).to.equal('foo/bar')
    })
  })
})

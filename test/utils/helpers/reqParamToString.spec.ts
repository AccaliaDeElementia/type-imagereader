'use sanity'

import { reqParamToString } from '#utils/helpers.js'

describe('utils/helpers reqParamToString()', () => {
  describe('null and undefined input', () => {
    it('should return default value for null', () => {
      expect(reqParamToString(null)).toBe('')
    })
    it('should return default value for undefined', () => {
      expect(reqParamToString(undefined)).toBe('')
    })
    it('should return provided default value for null', () => {
      expect(reqParamToString(null, 'fallback')).toBe('fallback')
    })
    it('should return provided default value for undefined', () => {
      expect(reqParamToString(undefined, 'fallback')).toBe('fallback')
    })
  })

  describe('string input', () => {
    it('should return the string when non-empty', () => {
      expect(reqParamToString('foo')).toBe('foo')
    })
    it('should return default value for empty string', () => {
      expect(reqParamToString('')).toBe('')
    })
    it('should return provided default value for empty string', () => {
      expect(reqParamToString('', 'fallback')).toBe('fallback')
    })
    it('should return string unchanged when it contains slashes', () => {
      expect(reqParamToString('foo/bar')).toBe('foo/bar')
    })
  })

  describe('array input', () => {
    it('should join array elements with slash', () => {
      expect(reqParamToString(['foo', 'bar'])).toBe('foo/bar')
    })
    it('should return single element array as string', () => {
      expect(reqParamToString(['foo'])).toBe('foo')
    })
    it('should return default value for empty array', () => {
      expect(reqParamToString([])).toBe('')
    })
    it('should return provided default value for empty array', () => {
      expect(reqParamToString([], 'fallback')).toBe('fallback')
    })
    it('should join array of empty strings as slash-separated result', () => {
      expect(reqParamToString(['', ''])).toBe('/')
    })
    it('should preserve path segments when joining array', () => {
      expect(reqParamToString(['foo', 'bar', 'baz'])).toBe('foo/bar/baz')
    })
  })

  describe('defaultValue parameter', () => {
    it('should use empty string as default value when not provided', () => {
      expect(reqParamToString(null)).toBe('')
    })
    it('should use provided default value when input resolves to empty', () => {
      expect(reqParamToString('', '/default/path')).toBe('/default/path')
    })
    it('should not use default value when string input is non-empty', () => {
      expect(reqParamToString('foo', 'fallback')).toBe('foo')
    })
    it('should not use default value when array input is non-empty', () => {
      expect(reqParamToString(['foo', 'bar'], 'fallback')).toBe('foo/bar')
    })
  })
})

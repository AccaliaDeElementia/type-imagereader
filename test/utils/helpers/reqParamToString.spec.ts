'use sanity'

import { reqParamToString } from '#utils/helpers.js'

describe('utils/helpers reqParamToString()', () => {
  describe('null and undefined input', () => {
    it('should fall back to the empty default for null', () => {
      expect(reqParamToString(null)).toBe('')
    })
    it('should fall back to the empty default for undefined', () => {
      expect(reqParamToString(undefined)).toBe('')
    })
    it('should fall back to the provided default for null', () => {
      expect(reqParamToString(null, 'fallback')).toBe('fallback')
    })
    it('should fall back to the provided default for undefined', () => {
      expect(reqParamToString(undefined, 'fallback')).toBe('fallback')
    })
  })

  describe('string input', () => {
    it('should return the string when non-empty', () => {
      expect(reqParamToString('foo')).toBe('foo')
    })
    it('should return the string unchanged when it contains slashes', () => {
      expect(reqParamToString('foo/bar')).toBe('foo/bar')
    })
    it('should return the string in preference to the provided default', () => {
      expect(reqParamToString('foo', 'fallback')).toBe('foo')
    })
    it('should fall back to the empty default for an empty string', () => {
      expect(reqParamToString('')).toBe('')
    })
    it('should fall back to the provided default for an empty string', () => {
      expect(reqParamToString('', 'fallback')).toBe('fallback')
    })
  })

  describe('array input', () => {
    it('should join array elements with slash', () => {
      expect(reqParamToString(['foo', 'bar'])).toBe('foo/bar')
    })
    it('should preserve every path segment when joining', () => {
      expect(reqParamToString(['foo', 'bar', 'baz'])).toBe('foo/bar/baz')
    })
    it('should return a single element array as that string', () => {
      expect(reqParamToString(['foo'])).toBe('foo')
    })
    it('should join an array of empty strings rather than treating it as empty', () => {
      expect(reqParamToString(['', ''])).toBe('/')
    })
    it('should return the joined value in preference to the provided default', () => {
      expect(reqParamToString(['foo', 'bar'], 'fallback')).toBe('foo/bar')
    })
    it('should fall back to the empty default for an empty array', () => {
      expect(reqParamToString([])).toBe('')
    })
    it('should fall back to the provided default for an empty array', () => {
      expect(reqParamToString([], 'fallback')).toBe('fallback')
    })
  })
})

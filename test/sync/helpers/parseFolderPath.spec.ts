'use sanity'

import { parseFolderPath, Helpers } from '#sync/helpers.js'

describe('sync/helpers parseFolderPath()', () => {
  beforeEach(() => {
    Helpers.padLength = 20
  })
  it('should return the parent folder for a single-segment folder under root', () => {
    expect(parseFolderPath('/foo/').folder).toBe('/')
  })
  it('should return the basename as sortKey for a single-segment folder under root', () => {
    expect(parseFolderPath('/foo/').sortKey).toBe('foo')
  })
  it('should return the parent folder for a nested folder', () => {
    expect(parseFolderPath('/foo/bar/').folder).toBe('/foo/')
  })
  it('should return the basename as sortKey for a nested folder', () => {
    expect(parseFolderPath('/foo/bar/').sortKey).toBe('bar')
  })
  it('should return both fields together', () => {
    expect(parseFolderPath('/a/b/c/')).toEqual({ folder: '/a/b/', sortKey: 'c' })
  })
  it('should lowercase uppercase basename via toSortKey', () => {
    expect(parseFolderPath('/FOO/').sortKey).toBe('foo')
  })
  it('should zero-pad numeric basename via toSortKey', () => {
    expect(parseFolderPath('/123/').sortKey).toBe('00000000000000000123')
  })
  it('should compose lowercase and padding on mixed alphanumeric basename', () => {
    expect(parseFolderPath('/Foo123/').sortKey).toBe('foo00000000000000000123')
  })
  it('should reject the root path because the root has no parent folder', () => {
    expect(() => parseFolderPath('/')).toThrow(/root/v)
  })
})

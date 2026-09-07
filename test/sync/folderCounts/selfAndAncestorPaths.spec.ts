'use sanity'

import { selfAndAncestorPaths } from '#sync/folderCounts.js'

describe('sync/folderCounts selfAndAncestorPaths()', () => {
  it('should yield the folder itself first', () => {
    expect(selfAndAncestorPaths('/a/b/')[0]).toBe('/a/b/')
  })
  it('should yield each intermediate ancestor', () => {
    expect(selfAndAncestorPaths('/a/b/')).toContain('/a/')
  })
  it('should yield the root path', () => {
    expect(selfAndAncestorPaths('/a/b/')).toContain('/')
  })
  it('should yield the root exactly once so root counts are not doubled', () => {
    expect(selfAndAncestorPaths('/a/b/c/').filter((p) => p === '/').length).toBe(1)
  })
  it('should yield only the root for a folder directly under root', () => {
    expect(selfAndAncestorPaths('/a/')).toEqual(['/a/', '/'])
  })
  it('should yield the root exactly once for the root itself', () => {
    expect(selfAndAncestorPaths('/')).toEqual(['/'])
  })
})

'use sanity'

import { selfAndAncestorPaths } from '#sync/folderCounts.js'

describe('sync/folderCounts selfAndAncestorPaths()', () => {
  it('should yield the folder and every ancestor, nearest first', () => {
    expect(selfAndAncestorPaths('/a/b/')).toEqual(['/a/b/', '/a/', '/'])
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

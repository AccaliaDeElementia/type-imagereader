'use sanity'

import { toFolderPath } from '#utils/path.js'

describe('utils/Path toFolderPath', () => {
  it('should append trailing slash to a path without one', () => {
    expect(toFolderPath('/foo/bar')).toBe('/foo/bar/')
  })
  it('should leave the root path unchanged', () => {
    expect(toFolderPath('/')).toBe('/')
  })
  it('should handle a single-segment path', () => {
    expect(toFolderPath('/foo')).toBe('/foo/')
  })
  it('should handle a deeply nested path', () => {
    expect(toFolderPath('/a/b/c/d/e')).toBe('/a/b/c/d/e/')
  })
})

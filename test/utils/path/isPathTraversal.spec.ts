'use sanity'

import { isPathTraversal } from '#utils/path.js'

describe('utils/Path isPathTraversal', () => {
  it('should return false for a clean absolute path', () => {
    expect(isPathTraversal('/foo/bar/baz')).toBe(false)
  })
  it('should return false for root path', () => {
    expect(isPathTraversal('/')).toBe(false)
  })
  it('should return true for parent directory traversal', () => {
    expect(isPathTraversal('/foo/../bar')).toBe(true)
  })
  it('should return true for double dot at end', () => {
    expect(isPathTraversal('/foo/bar/..')).toBe(true)
  })
  it('should return true for current directory reference', () => {
    expect(isPathTraversal('/foo/./bar')).toBe(true)
  })
  it('should return false for leading tilde (treated literally by fs)', () => {
    expect(isPathTraversal('/~')).toBe(false)
  })
  it('should return false for leading tilde with username', () => {
    expect(isPathTraversal('/~root')).toBe(false)
  })
  it('should return false for leading tilde with subpath', () => {
    expect(isPathTraversal('/~user/documents')).toBe(false)
  })
  it('should return false for tilde in non-leading position', () => {
    expect(isPathTraversal('/foo/~bar')).toBe(false)
  })
  it('should return true for double slash normalization', () => {
    expect(isPathTraversal('/foo//bar')).toBe(true)
  })
  it('should return false for trailing slash', () => {
    expect(isPathTraversal('/foo/bar/')).toBe(false)
  })
})

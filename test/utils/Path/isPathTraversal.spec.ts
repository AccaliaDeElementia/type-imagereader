'use sanity'

import { expect } from 'chai'
import { isPathTraversal } from '#utils/Path'

describe('utils/Path function isPathTraversal', () => {
  it('should return false for a clean absolute path', () => {
    expect(isPathTraversal('/foo/bar/baz')).to.equal(false)
  })
  it('should return false for root path', () => {
    expect(isPathTraversal('/')).to.equal(false)
  })
  it('should return true for parent directory traversal', () => {
    expect(isPathTraversal('/foo/../bar')).to.equal(true)
  })
  it('should return true for double dot at end', () => {
    expect(isPathTraversal('/foo/bar/..')).to.equal(true)
  })
  it('should return true for current directory reference', () => {
    expect(isPathTraversal('/foo/./bar')).to.equal(true)
  })
  it('should return true for tilde home expansion', () => {
    expect(isPathTraversal('/~')).to.equal(true)
  })
  it('should return true for tilde with username', () => {
    expect(isPathTraversal('/~root')).to.equal(true)
  })
  it('should return true for tilde path expansion', () => {
    expect(isPathTraversal('/~user/documents')).to.equal(true)
  })
  it('should return false for tilde in non-leading position', () => {
    expect(isPathTraversal('/foo/~bar')).to.equal(false)
  })
  it('should return true for double slash normalization', () => {
    expect(isPathTraversal('/foo//bar')).to.equal(true)
  })
  it('should return false for trailing slash', () => {
    expect(isPathTraversal('/foo/bar/')).to.equal(false)
  })
})

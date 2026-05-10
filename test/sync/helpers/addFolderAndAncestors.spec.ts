'use sanity'

import { addFolderAndAncestors } from '#sync/helpers.js'

describe('sync/helpers addFolderAndAncestors()', () => {
  it('should include the input folder itself', () => {
    const affected = new Set<string>()
    addFolderAndAncestors(affected, '/a/b/c/')
    expect(affected.has('/a/b/c/')).toBe(true)
  })
  it('should include every intermediate ancestor', () => {
    const affected = new Set<string>()
    addFolderAndAncestors(affected, '/a/b/c/')
    expect([...affected].sort()).toEqual(['/a/b/c/', '/a/b/', '/a/', '/'].sort())
  })
  it('should include root in the ancestor chain', () => {
    const affected = new Set<string>()
    addFolderAndAncestors(affected, '/a/b/c/')
    expect(affected.has('/')).toBe(true)
  })
  it('should add only root when given root as input', () => {
    const affected = new Set<string>()
    addFolderAndAncestors(affected, '/')
    expect([...affected]).toEqual(['/'])
  })
  it('should add only the folder and root for a top-level folder', () => {
    const affected = new Set<string>()
    addFolderAndAncestors(affected, '/solo/')
    expect([...affected].sort()).toEqual(['/solo/', '/'].sort())
  })
  it('should leave existing entries in the set intact', () => {
    const affected = new Set<string>(['/other/'])
    addFolderAndAncestors(affected, '/a/')
    expect(affected.has('/other/')).toBe(true)
  })
  it('should be idempotent when called twice with the same input', () => {
    const affected = new Set<string>()
    addFolderAndAncestors(affected, '/a/b/')
    const sizeAfterFirst = affected.size
    addFolderAndAncestors(affected, '/a/b/')
    expect(affected.size).toBe(sizeAfterFirst)
  })
})

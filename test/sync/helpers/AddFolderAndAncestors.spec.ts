'use sanity'

import { expect } from 'chai'
import { addFolderAndAncestors } from '#sync/helpers.js'

describe('sync/helpers addFolderAndAncestors()', () => {
  it('should include the input folder itself', () => {
    const affected = new Set<string>()
    addFolderAndAncestors(affected, '/a/b/c/')
    expect(affected.has('/a/b/c/')).to.equal(true)
  })
  it('should include every intermediate ancestor', () => {
    const affected = new Set<string>()
    addFolderAndAncestors(affected, '/a/b/c/')
    expect([...affected]).to.have.members(['/a/b/c/', '/a/b/', '/a/', '/'])
  })
  it('should include root in the ancestor chain', () => {
    const affected = new Set<string>()
    addFolderAndAncestors(affected, '/a/b/c/')
    expect(affected.has('/')).to.equal(true)
  })
  it('should add only root when given root as input', () => {
    const affected = new Set<string>()
    addFolderAndAncestors(affected, '/')
    expect([...affected]).to.deep.equal(['/'])
  })
  it('should add only the folder and root for a top-level folder', () => {
    const affected = new Set<string>()
    addFolderAndAncestors(affected, '/solo/')
    expect([...affected]).to.have.members(['/solo/', '/'])
  })
  it('should leave existing entries in the set intact', () => {
    const affected = new Set<string>(['/other/'])
    addFolderAndAncestors(affected, '/a/')
    expect(affected.has('/other/')).to.equal(true)
  })
  it('should be idempotent when called twice with the same input', () => {
    const affected = new Set<string>()
    addFolderAndAncestors(affected, '/a/b/')
    const sizeAfterFirst = affected.size
    addFolderAndAncestors(affected, '/a/b/')
    expect(affected.size).to.equal(sizeAfterFirst)
  })
})

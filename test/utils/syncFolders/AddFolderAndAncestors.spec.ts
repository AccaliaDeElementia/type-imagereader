'use sanity'

import { expect } from 'chai'
import { Functions } from '#utils/syncfolders.js'

describe('utils/syncfolders function AddFolderAndAncestors()', () => {
  it('should include the input folder itself', () => {
    const affected = new Set<string>()
    Functions.AddFolderAndAncestors(affected, '/a/b/c/')
    expect(affected.has('/a/b/c/')).to.equal(true)
  })
  it('should include every intermediate ancestor', () => {
    const affected = new Set<string>()
    Functions.AddFolderAndAncestors(affected, '/a/b/c/')
    expect([...affected]).to.have.members(['/a/b/c/', '/a/b/', '/a/', '/'])
  })
  it('should include root in the ancestor chain', () => {
    const affected = new Set<string>()
    Functions.AddFolderAndAncestors(affected, '/a/b/c/')
    expect(affected.has('/')).to.equal(true)
  })
  it('should add only root when given root as input', () => {
    const affected = new Set<string>()
    Functions.AddFolderAndAncestors(affected, '/')
    expect([...affected]).to.deep.equal(['/'])
  })
  it('should add only the folder and root for a top-level folder', () => {
    const affected = new Set<string>()
    Functions.AddFolderAndAncestors(affected, '/solo/')
    expect([...affected]).to.have.members(['/solo/', '/'])
  })
  it('should leave existing entries in the set intact', () => {
    const affected = new Set<string>(['/other/'])
    Functions.AddFolderAndAncestors(affected, '/a/')
    expect(affected.has('/other/')).to.equal(true)
  })
  it('should be idempotent when called twice with the same input', () => {
    const affected = new Set<string>()
    Functions.AddFolderAndAncestors(affected, '/a/b/')
    const sizeAfterFirst = affected.size
    Functions.AddFolderAndAncestors(affected, '/a/b/')
    expect(affected.size).to.equal(sizeAfterFirst)
  })
})

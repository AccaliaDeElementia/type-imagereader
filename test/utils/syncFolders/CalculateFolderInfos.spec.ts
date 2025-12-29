'use sanity'

import { expect } from 'chai'
import { Functions } from '../../../utils/syncfolders'

describe('utils/syncfolders function CalculateFolderInfos()', () => {
  it('should handle empty input map gracefully', () => {
    expect(Functions.CalculateFolderInfos({}, [])).to.deep.equal([])
  })
  it('should handle empty input map with input list gracefully', () => {
    const folders = [{ path: '/', totalCount: 5, seenCount: 0 }]
    expect(Functions.CalculateFolderInfos({}, folders)).to.deep.equal([{ path: '/', totalCount: 5, seenCount: 0 }])
  })
  it('should handle empty input list gracefully', () => {
    const allFolders = {
      '/': { path: '/', totalCount: 5, seenCount: 0 },
    }
    expect(Functions.CalculateFolderInfos(allFolders, [])).to.deep.equal([{ path: '/', totalCount: 5, seenCount: 0 }])
  })
  it('should calculate correctly', () => {
    const allFolders = {
      '/': { path: '/', totalCount: 0, seenCount: 0 },
      '/foo/': { path: '/foo/', totalCount: 0, seenCount: 0 },
      '/foo/bar/': { path: '/foo/bar/', totalCount: 0, seenCount: 0 },
      '/baz/': { path: '/baz/', totalCount: 0, seenCount: 0 },
      '/quux/': { path: '/quux/', totalCount: 0, seenCount: 0 },
      '/quux/is/': { path: '/quux/is/', totalCount: 0, seenCount: 0 },
    }
    const folders = [
      { path: '/', totalCount: 1, seenCount: 1 },
      { path: '/foo/', totalCount: 10, seenCount: 1 },
      { path: '/foo/bar/', totalCount: 20, seenCount: 2 },
      { path: '/baz/', totalCount: 30, seenCount: 3 },
      { path: '/quux/', totalCount: 40, seenCount: 4 },
      { path: '/quux/is/', totalCount: 50, seenCount: 5 },
    ]
    const results = Functions.CalculateFolderInfos(allFolders, folders)
    expect(results).to.have.lengthOf(6)
    expect(results).to.deep.include({
      path: '/quux/is/',
      totalCount: 50,
      seenCount: 5,
    })
    expect(results).to.deep.include({
      path: '/quux/',
      totalCount: 90,
      seenCount: 9,
    })
    expect(results).to.deep.include({
      path: '/baz/',
      totalCount: 30,
      seenCount: 3,
    })
    expect(results).to.deep.include({
      path: '/foo/bar/',
      totalCount: 20,
      seenCount: 2,
    })
    expect(results).to.deep.include({
      path: '/foo/',
      totalCount: 30,
      seenCount: 3,
    })
    expect(results).to.deep.include({
      path: '/',
      totalCount: 151,
      seenCount: 16,
    })
  })
  it('should add missing parent folders correctly', () => {
    const allFolders = {
      '/': { path: '/', totalCount: 0, seenCount: 0 },
    }
    const folders = [
      { path: '/', totalCount: 1, seenCount: 1 },
      { path: '/foo/bar/baz/', totalCount: 20, seenCount: 2 },
    ]
    const results = Functions.CalculateFolderInfos(allFolders, folders)
    expect(results).to.have.lengthOf(4)
    expect(results).to.deep.include({
      path: '/foo/bar/baz/',
      totalCount: 20,
      seenCount: 2,
    })
    expect(results).to.deep.include({
      path: '/foo/bar/',
      totalCount: 20,
      seenCount: 2,
    })
    expect(results).to.deep.include({
      path: '/foo/',
      totalCount: 20,
      seenCount: 2,
    })
    expect(results).to.deep.include({ path: '/', totalCount: 21, seenCount: 3 })
  })
})

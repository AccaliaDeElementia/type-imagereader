'use sanity'

import { calculateFolderInfos } from '#sync/folderCounts.js'

describe('sync/folderCounts calculateFolderInfos()', () => {
  it('should handle empty input map gracefully', () => {
    expect(calculateFolderInfos({}, [])).toEqual([])
  })
  it('should handle empty input map with input list gracefully', () => {
    const folders = [{ path: '/', totalCount: 5, seenCount: 0 }]
    expect(calculateFolderInfos({}, folders)).toEqual([{ path: '/', totalCount: 5, seenCount: 0 }])
  })
  it('should handle empty input list gracefully', () => {
    const allFolders = {
      '/': { path: '/', totalCount: 5, seenCount: 0 },
    }
    expect(calculateFolderInfos(allFolders, [])).toEqual([{ path: '/', totalCount: 5, seenCount: 0 }])
  })
  it('should return 6 results for 6-folder input', () => {
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
    expect(calculateFolderInfos(allFolders, folders)).toHaveLength(6)
  })
  it('should calculate counts for leaf folder /quux/is/', () => {
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
    expect(calculateFolderInfos(allFolders, folders)).toContainEqual({
      path: '/quux/is/',
      totalCount: 50,
      seenCount: 5,
    })
  })
  it('should aggregate child counts into /quux/', () => {
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
    expect(calculateFolderInfos(allFolders, folders)).toContainEqual({
      path: '/quux/',
      totalCount: 90,
      seenCount: 9,
    })
  })
  it('should calculate counts for leaf folder /baz/', () => {
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
    expect(calculateFolderInfos(allFolders, folders)).toContainEqual({
      path: '/baz/',
      totalCount: 30,
      seenCount: 3,
    })
  })
  it('should calculate counts for leaf folder /foo/bar/', () => {
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
    expect(calculateFolderInfos(allFolders, folders)).toContainEqual({
      path: '/foo/bar/',
      totalCount: 20,
      seenCount: 2,
    })
  })
  it('should aggregate child counts into /foo/', () => {
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
    expect(calculateFolderInfos(allFolders, folders)).toContainEqual({
      path: '/foo/',
      totalCount: 30,
      seenCount: 3,
    })
  })
  it('should aggregate all child counts into root /', () => {
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
    expect(calculateFolderInfos(allFolders, folders)).toContainEqual({
      path: '/',
      totalCount: 151,
      seenCount: 16,
    })
  })
  it('should return 4 results when missing parent folders are synthesised', () => {
    const allFolders = { '/': { path: '/', totalCount: 0, seenCount: 0 } }
    const folders = [
      { path: '/', totalCount: 1, seenCount: 1 },
      { path: '/foo/bar/baz/', totalCount: 20, seenCount: 2 },
    ]
    expect(calculateFolderInfos(allFolders, folders)).toHaveLength(4)
  })
  it('should include leaf folder /foo/bar/baz/ with its own counts', () => {
    const allFolders = { '/': { path: '/', totalCount: 0, seenCount: 0 } }
    const folders = [
      { path: '/', totalCount: 1, seenCount: 1 },
      { path: '/foo/bar/baz/', totalCount: 20, seenCount: 2 },
    ]
    expect(calculateFolderInfos(allFolders, folders)).toContainEqual({
      path: '/foo/bar/baz/',
      totalCount: 20,
      seenCount: 2,
    })
  })
  it('should synthesise missing parent /foo/bar/ with aggregated counts', () => {
    const allFolders = { '/': { path: '/', totalCount: 0, seenCount: 0 } }
    const folders = [
      { path: '/', totalCount: 1, seenCount: 1 },
      { path: '/foo/bar/baz/', totalCount: 20, seenCount: 2 },
    ]
    expect(calculateFolderInfos(allFolders, folders)).toContainEqual({
      path: '/foo/bar/',
      totalCount: 20,
      seenCount: 2,
    })
  })
  it('should synthesise missing parent /foo/ with aggregated counts', () => {
    const allFolders = { '/': { path: '/', totalCount: 0, seenCount: 0 } }
    const folders = [
      { path: '/', totalCount: 1, seenCount: 1 },
      { path: '/foo/bar/baz/', totalCount: 20, seenCount: 2 },
    ]
    expect(calculateFolderInfos(allFolders, folders)).toContainEqual({
      path: '/foo/',
      totalCount: 20,
      seenCount: 2,
    })
  })
  it('should aggregate all child counts into root / when parents are missing', () => {
    const allFolders = { '/': { path: '/', totalCount: 0, seenCount: 0 } }
    const folders = [
      { path: '/', totalCount: 1, seenCount: 1 },
      { path: '/foo/bar/baz/', totalCount: 20, seenCount: 2 },
    ]
    expect(calculateFolderInfos(allFolders, folders)).toContainEqual({
      path: '/',
      totalCount: 21,
      seenCount: 3,
    })
  })
})

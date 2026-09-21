'use sanity'

import { calculateFolderInfos, type FolderInfo } from '#sync/folderCounts.js'

interface Scenario {
  allFolders: Record<string, FolderInfo>
  folders: FolderInfo[]
}

const everyFolderKnown: Scenario = {
  allFolders: {
    '/': { path: '/', totalCount: 0, seenCount: 0 },
    '/foo/': { path: '/foo/', totalCount: 0, seenCount: 0 },
    '/foo/bar/': { path: '/foo/bar/', totalCount: 0, seenCount: 0 },
    '/baz/': { path: '/baz/', totalCount: 0, seenCount: 0 },
    '/quux/': { path: '/quux/', totalCount: 0, seenCount: 0 },
    '/quux/is/': { path: '/quux/is/', totalCount: 0, seenCount: 0 },
  },
  folders: [
    { path: '/', totalCount: 1, seenCount: 1 },
    { path: '/foo/', totalCount: 10, seenCount: 1 },
    { path: '/foo/bar/', totalCount: 20, seenCount: 2 },
    { path: '/baz/', totalCount: 30, seenCount: 3 },
    { path: '/quux/', totalCount: 40, seenCount: 4 },
    { path: '/quux/is/', totalCount: 50, seenCount: 5 },
  ],
}

const parentsMissingFromMap: Scenario = {
  allFolders: { '/': { path: '/', totalCount: 0, seenCount: 0 } },
  folders: [
    { path: '/', totalCount: 1, seenCount: 1 },
    { path: '/foo/bar/baz/', totalCount: 20, seenCount: 2 },
  ],
}

interface ExpectedInfo extends FolderInfo {
  role: string
}

describe('sync/folderCounts calculateFolderInfos()', () => {
  it('should return no folder infos when both inputs are empty', () => {
    expect(calculateFolderInfos({}, [])).toEqual([])
  })
  it('should return the listed folder when the map is empty', () => {
    const folders = [{ path: '/', totalCount: 5, seenCount: 0 }]
    expect(calculateFolderInfos({}, folders)).toEqual([{ path: '/', totalCount: 5, seenCount: 0 }])
  })
  it('should return the mapped folder when the list is empty', () => {
    const allFolders = { '/': { path: '/', totalCount: 5, seenCount: 0 } }
    expect(calculateFolderInfos(allFolders, [])).toEqual([{ path: '/', totalCount: 5, seenCount: 0 }])
  })

  describe('when every folder is already in the map', () => {
    const expected: ExpectedInfo[] = [
      { role: 'leaf', path: '/quux/is/', totalCount: 50, seenCount: 5 },
      { role: 'aggregating', path: '/quux/', totalCount: 90, seenCount: 9 },
      { role: 'leaf', path: '/baz/', totalCount: 30, seenCount: 3 },
      { role: 'leaf', path: '/foo/bar/', totalCount: 20, seenCount: 2 },
      { role: 'aggregating', path: '/foo/', totalCount: 30, seenCount: 3 },
      { role: 'aggregating', path: '/', totalCount: 151, seenCount: 16 },
    ]
    it('should return one info per known folder', () => {
      expect(calculateFolderInfos(everyFolderKnown.allFolders, everyFolderKnown.folders)).toHaveLength(expected.length)
    })
    it.each(expected)(
      'should count $role folder $path as $totalCount total and $seenCount seen',
      ({ role: _role, ...info }: ExpectedInfo) => {
        expect(calculateFolderInfos(everyFolderKnown.allFolders, everyFolderKnown.folders)).toContainEqual(info)
      },
    )
  })

  describe('when parent folders are missing from the map', () => {
    const expected: ExpectedInfo[] = [
      { role: 'leaf', path: '/foo/bar/baz/', totalCount: 20, seenCount: 2 },
      { role: 'synthesised', path: '/foo/bar/', totalCount: 20, seenCount: 2 },
      { role: 'synthesised', path: '/foo/', totalCount: 20, seenCount: 2 },
      { role: 'aggregating', path: '/', totalCount: 21, seenCount: 3 },
    ]
    it('should synthesise an info for every missing ancestor', () => {
      expect(calculateFolderInfos(parentsMissingFromMap.allFolders, parentsMissingFromMap.folders)).toHaveLength(
        expected.length,
      )
    })
    it.each(expected)(
      'should count $role folder $path as $totalCount total and $seenCount seen',
      ({ role: _role, ...info }: ExpectedInfo) => {
        expect(calculateFolderInfos(parentsMissingFromMap.allFolders, parentsMissingFromMap.folders)).toContainEqual(
          info,
        )
      },
    )
  })
})

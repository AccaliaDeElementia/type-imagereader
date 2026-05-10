'use sanity'

import { getParentFolders } from '#utils/path.js'

describe('utils/Path getParentFolders', () => {
  it('should resolve to expected paths for root image', () => {
    expect(getParentFolders('/image.png')).toEqual(['/'])
  })
  it('should resolve to expected paths for deep image', () => {
    const input = '/foo/bar/baz/quux/xyzzy/image.png'
    const expected = ['/foo/bar/baz/quux/xyzzy/', '/foo/bar/baz/quux/', '/foo/bar/baz/', '/foo/bar/', '/foo/', '/']
    expect(getParentFolders(input)).toEqual(expected)
  })
})

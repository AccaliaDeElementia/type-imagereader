'use sanity'

import { expect } from 'chai'
import { getParentFolders } from '#utils/Path.js'

describe('utils/Path getParentFolders', () => {
  it('should resolve to expected paths for root image', () => {
    expect(getParentFolders('/image.png')).to.deep.equal(['/'])
  })
  it('should resolve to expected paths for deep image', () => {
    const input = '/foo/bar/baz/quux/xyzzy/image.png'
    const expected = ['/foo/bar/baz/quux/xyzzy/', '/foo/bar/baz/quux/', '/foo/bar/baz/', '/foo/bar/', '/foo/', '/']
    expect(getParentFolders(input)).to.deep.equal(expected)
  })
})

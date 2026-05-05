'use sanity'

import { expect } from 'chai'
import { GetParentFolders } from '#utils/Path.js'

describe('utils/Path function GetParentFolders', () => {
  it('should resolve to expected paths for root image', () => {
    expect(GetParentFolders('/image.png')).to.deep.equal(['/'])
  })
  it('should resolve to expected paths for deep image', () => {
    const input = '/foo/bar/baz/quux/xyzzy/image.png'
    const expected = ['/foo/bar/baz/quux/xyzzy/', '/foo/bar/baz/quux/', '/foo/bar/baz/', '/foo/bar/', '/foo/', '/']
    expect(GetParentFolders(input)).to.deep.equal(expected)
  })
})

'use sanity'

import { expect } from 'chai'
import { Functions } from '../../../routes/apiFunctions'

describe('routes/apiFunctions function GetPictureFolders', () => {
  it('should resolve to expected paths for root image', () => {
    expect(Functions.GetPictureFolders('/image.png')).to.deep.equal(['/'])
  })
  it('should resolve to expected paths for deep image', () => {
    const input = '/foo/bar/baz/quux/xyzzy/image.png'
    const expected = ['/foo/bar/baz/quux/xyzzy/', '/foo/bar/baz/quux/', '/foo/bar/baz/', '/foo/bar/', '/foo/', '/']
    expect(Functions.GetPictureFolders(input)).to.deep.equal(expected)
  })
})

'use sanity'

import { expect } from 'chai'
import { Functions } from '../../../utils/browserify-middleware'

describe('utils/browserify-middleware function GetPaths()', () => {
  it('replaces compileable extension .js', () => {
    const paths = Functions.GetPaths('foo.js')
    expect(paths).to.deep.equal(['foo.js', 'foo.ts', 'foo'])
  })
  it('replaces compileable extension .ts', () => {
    const paths = Functions.GetPaths('foo.ts')
    expect(paths).to.deep.equal(['foo.js', 'foo.ts', 'foo'])
  })
  it('ignores non compileable extension .qs', () => {
    const paths = Functions.GetPaths('foo.qs')
    expect(paths).to.deep.equal(['foo.qs.js', 'foo.qs.ts', 'foo.qs'])
  })
})

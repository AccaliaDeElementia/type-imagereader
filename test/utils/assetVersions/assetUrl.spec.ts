'use sanity'

import { assetUrl } from '#utils/assetVersions.js'

describe('utils/assetVersions assetUrl()', () => {
  it('should append a ?v= query parameter for known paths', () => {
    expect(assetUrl({ '/scripts/app.js': 'abc12345' }, '/scripts/app.js')).toBe('/scripts/app.js?v=abc12345')
  })
  it('should return the url unchanged for unknown paths', () => {
    expect(assetUrl({}, '/something/unknown.png')).toBe('/something/unknown.png')
  })
  it('should return the url unchanged when the versions map is empty', () => {
    expect(assetUrl({}, '/scripts/app.js')).toBe('/scripts/app.js')
  })
})

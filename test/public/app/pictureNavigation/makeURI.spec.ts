'use sanity'

import { Imports, Internals } from '#public/scripts/app/pictureNavigation.js'
import type { Picture } from '#contracts/listing.js'
import type { MockInstance } from 'vitest'

describe('public/app/pictures makeURI()', () => {
  const picture: Picture = {
    name: 'foobar.png',
    path: '/some/path/foobar.png',
    seen: false,
  }
  let getShowOriginalSizeStub: MockInstance = vi.fn()
  beforeEach(() => {
    getShowOriginalSizeStub = vi.spyOn(Imports, 'getShowOriginalSize').mockReturnValue(false)
  })
  it('should request a viewport scaled image when ShowOriginalSize is unset', () => {
    getShowOriginalSizeStub.mockReturnValue(false)
    expect(Internals.makeURI(1024, 768, picture)).toBe('/images/scaled/1024/768/some/path/foobar.png-image.webp')
  })
  it('should pass undefined dimensions through when ShowOriginalSize is unset', () => {
    getShowOriginalSizeStub.mockReturnValue(false)
    expect(Internals.makeURI(undefined, undefined, picture)).toBe(
      '/images/scaled/undefined/undefined/some/path/foobar.png-image.webp',
    )
  })
  it('should request the original resolution image when ShowOriginalSize is set', () => {
    getShowOriginalSizeStub.mockReturnValue(true)
    expect(Internals.makeURI(1024, 768, picture)).toBe('/images/original/some/path/foobar.png-image.webp')
  })
  it('should ignore the rendered dimensions when ShowOriginalSize is set', () => {
    getShowOriginalSizeStub.mockReturnValue(true)
    expect(Internals.makeURI(undefined, undefined, picture)).toBe('/images/original/some/path/foobar.png-image.webp')
  })
  it('should read the size preference once per call', () => {
    Internals.makeURI(1024, 768, picture)
    expect(getShowOriginalSizeStub.mock.calls.length).toBe(1)
  })
})

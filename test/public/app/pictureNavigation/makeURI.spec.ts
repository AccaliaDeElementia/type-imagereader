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
  let viewportSizeStub: MockInstance = vi.fn()
  beforeEach(() => {
    getShowOriginalSizeStub = vi.spyOn(Imports, 'getShowOriginalSize').mockReturnValue(false)
    viewportSizeStub = vi.spyOn(Imports, 'viewportSize').mockReturnValue({ width: 1024, height: 768 })
  })
  it('should request a viewport scaled image when ShowOriginalSize is unset', () => {
    getShowOriginalSizeStub.mockReturnValue(false)
    expect(Internals.makeURI(picture)).toBe('/images/scaled/1024/768/some/path/foobar.png-image.webp')
  })
  it('should size the request from the measured viewport', () => {
    viewportSizeStub.mockReturnValue({ width: 640, height: 480 })
    expect(Internals.makeURI(picture)).toBe('/images/scaled/640/480/some/path/foobar.png-image.webp')
  })
  it('should request the original resolution image when ShowOriginalSize is set', () => {
    getShowOriginalSizeStub.mockReturnValue(true)
    expect(Internals.makeURI(picture)).toBe('/images/original/some/path/foobar.png-image.webp')
  })
  // Actual size mode makes the image element as large as the picture, so the
  // measured viewport is irrelevant and must not be consulted.
  it('should not measure the viewport when ShowOriginalSize is set', () => {
    getShowOriginalSizeStub.mockReturnValue(true)
    Internals.makeURI(picture)
    expect(viewportSizeStub.mock.calls.length).toBe(0)
  })
  it('should read the size preference once per call', () => {
    Internals.makeURI(picture)
    expect(getShowOriginalSizeStub.mock.calls.length).toBe(1)
  })
})

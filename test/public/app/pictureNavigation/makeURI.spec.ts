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
  let getSizeModeStub: MockInstance = vi.fn()
  let viewportSizeStub: MockInstance = vi.fn()
  beforeEach(() => {
    getSizeModeStub = vi.spyOn(Imports, 'getSizeMode').mockReturnValue('fitScreen')
    viewportSizeStub = vi.spyOn(Imports, 'viewportSize').mockReturnValue({ width: 1024, height: 768 })
  })
  it('should bound both axes to the viewport in fitScreen mode', () => {
    getSizeModeStub.mockReturnValue('fitScreen')
    expect(Internals.makeURI(picture)).toBe('/images/scaled/1024/768/some/path/foobar.png-image.webp')
  })
  it('should leave height unbounded in fitWidth mode', () => {
    getSizeModeStub.mockReturnValue('fitWidth')
    expect(Internals.makeURI(picture)).toBe('/images/scaled/1024/auto/some/path/foobar.png-image.webp')
  })
  it('should leave width unbounded in fitHeight mode', () => {
    getSizeModeStub.mockReturnValue('fitHeight')
    expect(Internals.makeURI(picture)).toBe('/images/scaled/auto/768/some/path/foobar.png-image.webp')
  })
  it('should request the original resolution image in actualSize mode', () => {
    getSizeModeStub.mockReturnValue('actualSize')
    expect(Internals.makeURI(picture)).toBe('/images/original/some/path/foobar.png-image.webp')
  })
  it('should size the request from the measured viewport', () => {
    viewportSizeStub.mockReturnValue({ width: 640, height: 480 })
    expect(Internals.makeURI(picture)).toBe('/images/scaled/640/480/some/path/foobar.png-image.webp')
  })
  it('should not measure the viewport in actualSize mode', () => {
    getSizeModeStub.mockReturnValue('actualSize')
    Internals.makeURI(picture)
    expect(viewportSizeStub.mock.calls.length).toBe(0)
  })
  it('should read the size preference once per call', () => {
    Internals.makeURI(picture)
    expect(getSizeModeStub.mock.calls.length).toBe(1)
  })
})

'use sanity'

import { hasCoverImage, NO_COVER_IMAGE } from '#utils/helpers.js'

describe('utils/helpers hasCoverImage()', () => {
  it('should be true for a real cover path', () => {
    expect(hasCoverImage('/comics/book/page1.jpg')).toBe(true)
  })
  it('should be false for the no-cover sentinel written by syncMissingCoverImages', () => {
    expect(hasCoverImage(NO_COVER_IMAGE)).toBe(false)
  })
  it('should be false for null', () => {
    expect(hasCoverImage(null)).toBe(false)
  })
  it('should be false for undefined', () => {
    expect(hasCoverImage(undefined)).toBe(false)
  })
})

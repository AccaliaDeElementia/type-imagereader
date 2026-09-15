'use sanity'

import { AUTO_DIMENSION, parseRequestedDimension, scaledImagePath, UNBOUNDED } from '#contracts/scaledImage.js'

const HEIGHT_SEGMENT = 4

describe('Contracts: scaledImagePath()', () => {
  it('should bound both axes when both dimensions are numbers', () => {
    expect(scaledImagePath('/folder/pic.jpg', 1920, 1080)).toBe('/images/scaled/1920/1080/folder/pic.jpg-image.webp')
  })
  it('should spell an unbounded height as auto', () => {
    expect(scaledImagePath('/folder/pic.jpg', 1920, AUTO_DIMENSION)).toBe(
      '/images/scaled/1920/auto/folder/pic.jpg-image.webp',
    )
  })
  it('should spell an unbounded width as auto', () => {
    expect(scaledImagePath('/folder/pic.jpg', AUTO_DIMENSION, 1080)).toBe(
      '/images/scaled/auto/1080/folder/pic.jpg-image.webp',
    )
  })
  it('should emit a height segment the route parses back as unbounded', () => {
    const height = scaledImagePath('/pic.jpg', 1920, AUTO_DIMENSION).split('/')[HEIGHT_SEGMENT] ?? ''
    expect(parseRequestedDimension(height)).toBe(UNBOUNDED)
  })
})

'use sanity'

import { Pictures } from '#public/scripts/app/pictureState.js'
import { Internals } from '#public/scripts/app/pictureData.js'
import type { Picture } from '#contracts/listing.js'

const makePicture = (name: string, overrides: Partial<Picture> = {}): Picture => ({
  name,
  path: `/${name}`,
  seen: false,
  ...overrides,
})

describe('public/app/pictures setPictureIndices()', () => {
  beforeEach(() => {
    Pictures.pictures = []
  })

  // Sub-gap A: empty array must be a no-op
  it('should not throw when Pictures.pictures is empty', () => {
    Pictures.pictures = []
    Internals.setPictureIndices()
    expect(Pictures.pictures).toHaveLength(0)
  })

  // Sub-gap C: function contract — operates directly on Pictures.pictures state
  it('should assign index 0 to only picture in single-element array', () => {
    Pictures.pictures = [makePicture('only.png')]
    Internals.setPictureIndices()
    expect(Pictures.pictures[0]?.index).toBe(0)
  })

  it('should assign index 0 to first picture in multi-element array', () => {
    Pictures.pictures = [makePicture('a.png'), makePicture('b.png'), makePicture('c.png')]
    Internals.setPictureIndices()
    expect(Pictures.pictures[0]?.index).toBe(0)
  })

  it('should assign index 1 to second picture in multi-element array', () => {
    Pictures.pictures = [makePicture('a.png'), makePicture('b.png'), makePicture('c.png')]
    Internals.setPictureIndices()
    expect(Pictures.pictures[1]?.index).toBe(1)
  })

  it('should assign index 2 to third picture in multi-element array', () => {
    Pictures.pictures = [makePicture('a.png'), makePicture('b.png'), makePicture('c.png')]
    Internals.setPictureIndices()
    expect(Pictures.pictures[2]?.index).toBe(2)
  })
  ;[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].forEach((idx) => {
    it(`should assign index ${idx} to picture at position ${idx} in 10-element array`, () => {
      const pics: Array<ReturnType<typeof makePicture>> = []
      for (let i = 0; i < 10; i += 1) pics.push(makePicture(`pic${i}.png`))
      Pictures.pictures = pics
      Internals.setPictureIndices()
      expect(pics[idx]?.index).toBe(idx)
    })
  })

  it('should mutate picture objects in-place', () => {
    const pic = makePicture('a.png')
    Pictures.pictures = [pic]
    Internals.setPictureIndices()
    expect(pic.index).toBe(0)
  })

  it('should not replace the Pictures.pictures array reference', () => {
    const pics = [makePicture('a.png'), makePicture('b.png')]
    Pictures.pictures = pics
    Internals.setPictureIndices()
    expect(Pictures.pictures).toBe(pics)
  })

  // Sub-gap B: pre-existing index values must be overwritten
  it('should overwrite pre-existing index on first picture', () => {
    Pictures.pictures = [makePicture('a.png', { index: 99 }), makePicture('b.png', { index: 100 })]
    Internals.setPictureIndices()
    expect(Pictures.pictures[0]?.index).toBe(0)
  })

  it('should overwrite pre-existing index on second picture', () => {
    Pictures.pictures = [makePicture('a.png', { index: 99 }), makePicture('b.png', { index: 100 })]
    Internals.setPictureIndices()
    expect(Pictures.pictures[1]?.index).toBe(1)
  })

  it('should overwrite pre-existing index 500 on first picture', () => {
    const pics = [
      makePicture('a.png', { index: 500 }),
      makePicture('b.png', { index: 0 }),
      makePicture('c.png', { index: -1 }),
    ]
    Pictures.pictures = pics
    Internals.setPictureIndices()
    expect(pics[0]?.index).toBe(0)
  })
  it('should overwrite pre-existing index 0 on second picture', () => {
    const pics = [
      makePicture('a.png', { index: 500 }),
      makePicture('b.png', { index: 0 }),
      makePicture('c.png', { index: -1 }),
    ]
    Pictures.pictures = pics
    Internals.setPictureIndices()
    expect(pics[1]?.index).toBe(1)
  })
  it('should overwrite pre-existing index -1 on third picture', () => {
    const pics = [
      makePicture('a.png', { index: 500 }),
      makePicture('b.png', { index: 0 }),
      makePicture('c.png', { index: -1 }),
    ]
    Pictures.pictures = pics
    Internals.setPictureIndices()
    expect(pics[2]?.index).toBe(2)
  })
})

'use sanity'

import { expect } from 'chai'
import { Pictures } from '../../../../public/scripts/app/pictures'
import type { Picture } from '../../../../contracts/listing'

const makePicture = (name: string, overrides: Partial<Picture> = {}): Picture => ({
  name,
  path: `/${name}`,
  seen: false,
  ...overrides,
})

describe('public/app/pictures function SetPictureIndices()', () => {
  beforeEach(() => {
    Pictures.pictures = []
  })

  // Sub-gap A: empty array must be a no-op
  it('should not throw when Pictures.pictures is empty', () => {
    Pictures.pictures = []
    Pictures.SetPictureIndices()
    expect(Pictures.pictures).to.have.lengthOf(0)
  })

  // Sub-gap C: function contract — operates directly on Pictures.pictures state
  it('should assign index 0 to only picture in single-element array', () => {
    Pictures.pictures = [makePicture('only.png')]
    Pictures.SetPictureIndices()
    expect(Pictures.pictures[0]?.index).to.equal(0)
  })

  it('should assign index 0 to first picture in multi-element array', () => {
    Pictures.pictures = [makePicture('a.png'), makePicture('b.png'), makePicture('c.png')]
    Pictures.SetPictureIndices()
    expect(Pictures.pictures[0]?.index).to.equal(0)
  })

  it('should assign index 1 to second picture in multi-element array', () => {
    Pictures.pictures = [makePicture('a.png'), makePicture('b.png'), makePicture('c.png')]
    Pictures.SetPictureIndices()
    expect(Pictures.pictures[1]?.index).to.equal(1)
  })

  it('should assign index 2 to third picture in multi-element array', () => {
    Pictures.pictures = [makePicture('a.png'), makePicture('b.png'), makePicture('c.png')]
    Pictures.SetPictureIndices()
    expect(Pictures.pictures[2]?.index).to.equal(2)
  })

  it('should assign sequential indices to all pictures', () => {
    const pics = Array.from({ length: 10 }, (_, i) => makePicture(`pic${i}.png`))
    Pictures.pictures = pics
    Pictures.SetPictureIndices()
    pics.forEach((pic, idx) => {
      expect(pic.index).to.equal(idx)
    })
  })

  it('should mutate picture objects in-place', () => {
    const pic = makePicture('a.png')
    Pictures.pictures = [pic]
    Pictures.SetPictureIndices()
    expect(pic.index).to.equal(0)
  })

  it('should not replace the Pictures.pictures array reference', () => {
    const pics = [makePicture('a.png'), makePicture('b.png')]
    Pictures.pictures = pics
    Pictures.SetPictureIndices()
    expect(Pictures.pictures).to.equal(pics)
  })

  // Sub-gap B: pre-existing index values must be overwritten
  it('should overwrite pre-existing index on first picture', () => {
    Pictures.pictures = [makePicture('a.png', { index: 99 }), makePicture('b.png', { index: 100 })]
    Pictures.SetPictureIndices()
    expect(Pictures.pictures[0]?.index).to.equal(0)
  })

  it('should overwrite pre-existing index on second picture', () => {
    Pictures.pictures = [makePicture('a.png', { index: 99 }), makePicture('b.png', { index: 100 })]
    Pictures.SetPictureIndices()
    expect(Pictures.pictures[1]?.index).to.equal(1)
  })

  it('should overwrite all pre-existing indices regardless of prior values', () => {
    const pics = [
      makePicture('a.png', { index: 500 }),
      makePicture('b.png', { index: 0 }),
      makePicture('c.png', { index: -1 }),
    ]
    Pictures.pictures = pics
    Pictures.SetPictureIndices()
    pics.forEach((pic, idx) => {
      expect(pic.index).to.equal(idx)
    })
  })
})

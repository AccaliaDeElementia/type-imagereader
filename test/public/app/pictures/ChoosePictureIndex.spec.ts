'use sanity'

import { NavigateTo, Pictures } from '../../../../public/scripts/app/pictures'
import { expect } from 'chai'

describe('public/app/pictures function ChoosePictureIndex()', () => {
  beforeEach(() => {
    Pictures.pictures = Array.from({ length: 64 }).map((_, i) => ({
      path: `/some/path/${i}.png`,
      name: `${i}.png`,
      seen: false,
      index: i,
    }))
    Pictures.current = null
  })
  const tests: Array<[string, NavigateTo]> = [
    ['NavigateTo.First', NavigateTo.First],
    ['NavigateTo.PreviousUnread', NavigateTo.PreviousUnread],
    ['NavigateTo.Previous', NavigateTo.Previous],
    ['NavigateTo.Next', NavigateTo.Next],
    ['NavigateTo.NextUnread', NavigateTo.NextUnread],
    ['NavigateTo.Last', NavigateTo.Last],
  ]
  tests.forEach(([title, navi]) => {
    it(`${title}: should return invalid index for empty picture array`, () => {
      Pictures.pictures = []
      const result = Pictures.ChoosePictureIndex(navi, 9, [])
      expect(result).to.equal(-1)
    })
  })
  it('NavigateTo.First: should return index 0', () => {
    const result = Pictures.ChoosePictureIndex(NavigateTo.First, 999, [])
    expect(result).to.equal(0)
  })
  it('NavigateTo.PreviousUnread: should return invalid index with no unreads', () => {
    const result = Pictures.ChoosePictureIndex(NavigateTo.PreviousUnread, 999, [])
    expect(result).to.equal(-1)
  })
  it('NavigateTo.PreviousUnread: should return expected index with unreads', () => {
    const result = Pictures.ChoosePictureIndex(NavigateTo.PreviousUnread, 999, [
      ...Pictures.pictures.slice(16, 32),
      {
        path: `/some/path/test.png`,
        name: `test.png`,
        seen: false,
        index: 77,
      },
    ])
    expect(result).to.equal(77)
  })
  it('NavigateTo.Previous: should return invalid index with negative current image', () => {
    const result = Pictures.ChoosePictureIndex(NavigateTo.Previous, -23, [])
    expect(result).to.equal(-1)
  })
  it('NavigateTo.Previous: should return invalid index with zero current image', () => {
    const result = Pictures.ChoosePictureIndex(NavigateTo.Previous, 0, [])
    expect(result).to.equal(-1)
  })
  it('NavigateTo.Previous: should return expected index with positive current image', () => {
    const result = Pictures.ChoosePictureIndex(NavigateTo.Previous, 23, [])
    expect(result).to.equal(22)
  })
  it('NavigateTo.Previous: should return expected index with out of bounds positive current image', () => {
    const result = Pictures.ChoosePictureIndex(NavigateTo.Previous, 1000, [])
    expect(result).to.equal(999)
  })
  it('NavigateTo.Next: should return invalid index with max index current image', () => {
    const result = Pictures.ChoosePictureIndex(NavigateTo.Next, 63, [])
    expect(result).to.equal(-1)
  })
  it('NavigateTo.Next: should return invalid index with out of range index current image', () => {
    const result = Pictures.ChoosePictureIndex(NavigateTo.Next, 65535, [])
    expect(result).to.equal(-1)
  })
  it('NavigateTo.Next: should return expected index with in range current image', () => {
    const result = Pictures.ChoosePictureIndex(NavigateTo.Next, 17, [])
    expect(result).to.equal(18)
  })
  it('NavigateTo.Next: should return invalid index with negative index current image', () => {
    const result = Pictures.ChoosePictureIndex(NavigateTo.Next, -34, [])
    expect(result).to.equal(-33)
  })
  it('NavigateTo.NextUnread: should return invalid index with no unreads', () => {
    const result = Pictures.ChoosePictureIndex(NavigateTo.NextUnread, 999, [])
    expect(result).to.equal(-1)
  })
  it('NavigateTo.NextUnread: should return expected index with unreads', () => {
    const result = Pictures.ChoosePictureIndex(NavigateTo.NextUnread, 999, [
      {
        path: `/some/path/test.png`,
        name: `test.png`,
        seen: false,
        index: 77,
      },
      ...Pictures.pictures.slice(16, 32),
    ])
    expect(result).to.equal(77)
  })
  it('NavigateTo.Last: should return max index', () => {
    const result = Pictures.ChoosePictureIndex(NavigateTo.Last, 7, [])
    expect(result).to.equal(63)
  })
})

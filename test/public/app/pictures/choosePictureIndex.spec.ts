'use sanity'

import { Pictures } from '#public/scripts/app/pictures/state.js'
import { Internals, NavigateTo } from '#public/scripts/app/pictures/viewer.js'
describe('public/app/pictures choosePictureIndex()', () => {
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
      const result = Internals.choosePictureIndex(navi, 9, [])
      expect(result).toBe(-1)
    })
  })
  it('NavigateTo.First: should return index 0', () => {
    const result = Internals.choosePictureIndex(NavigateTo.First, 999, [])
    expect(result).toBe(0)
  })
  it('NavigateTo.PreviousUnread: should return invalid index with no unreads', () => {
    const result = Internals.choosePictureIndex(NavigateTo.PreviousUnread, 999, [])
    expect(result).toBe(-1)
  })
  it('NavigateTo.PreviousUnread: should return expected index with unreads', () => {
    const result = Internals.choosePictureIndex(NavigateTo.PreviousUnread, 999, [
      ...Pictures.pictures.slice(16, 32),
      {
        path: `/some/path/test.png`,
        name: `test.png`,
        seen: false,
        index: 77,
      },
    ])
    expect(result).toBe(77)
  })
  it('NavigateTo.Previous: should return invalid index with negative current image', () => {
    const result = Internals.choosePictureIndex(NavigateTo.Previous, -23, [])
    expect(result).toBe(-1)
  })
  it('NavigateTo.Previous: should return invalid index with zero current image', () => {
    const result = Internals.choosePictureIndex(NavigateTo.Previous, 0, [])
    expect(result).toBe(-1)
  })
  it('NavigateTo.Previous: should return expected index with positive current image', () => {
    const result = Internals.choosePictureIndex(NavigateTo.Previous, 23, [])
    expect(result).toBe(22)
  })
  it('NavigateTo.Previous: should return expected index with out of bounds positive current image', () => {
    const result = Internals.choosePictureIndex(NavigateTo.Previous, 1000, [])
    expect(result).toBe(999)
  })
  it('NavigateTo.Next: should return invalid index with max index current image', () => {
    const result = Internals.choosePictureIndex(NavigateTo.Next, 63, [])
    expect(result).toBe(-1)
  })
  it('NavigateTo.Next: should return invalid index with out of range index current image', () => {
    const result = Internals.choosePictureIndex(NavigateTo.Next, 65535, [])
    expect(result).toBe(-1)
  })
  it('NavigateTo.Next: should return expected index with in range current image', () => {
    const result = Internals.choosePictureIndex(NavigateTo.Next, 17, [])
    expect(result).toBe(18)
  })
  it('NavigateTo.Next: should return invalid index with negative index current image', () => {
    const result = Internals.choosePictureIndex(NavigateTo.Next, -34, [])
    expect(result).toBe(-33)
  })
  it('NavigateTo.NextUnread: should return invalid index with no unreads', () => {
    const result = Internals.choosePictureIndex(NavigateTo.NextUnread, 999, [])
    expect(result).toBe(-1)
  })
  it('NavigateTo.NextUnread: should return expected index with unreads', () => {
    const result = Internals.choosePictureIndex(NavigateTo.NextUnread, 999, [
      {
        path: `/some/path/test.png`,
        name: `test.png`,
        seen: false,
        index: 77,
      },
      ...Pictures.pictures.slice(16, 32),
    ])
    expect(result).toBe(77)
  })
  it('NavigateTo.Last: should return max index', () => {
    const result = Internals.choosePictureIndex(NavigateTo.Last, 7, [])
    expect(result).toBe(63)
  })
})

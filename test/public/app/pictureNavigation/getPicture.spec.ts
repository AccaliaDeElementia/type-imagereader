'use sanity'

import { Pictures } from '#public/scripts/app/pictureState.js'
import { getPicture, Internals, NavigateTo } from '#public/scripts/app/pictureNavigation.js'
import assert from 'node:assert'
import type { MockInstance } from 'vitest'

describe('public/app/pictures getPicture()', () => {
  let choosePictureIndexSpy: MockInstance = vi.fn()
  beforeEach(() => {
    Pictures.pictures = Array.from({ length: 64 }).map((_, i) => ({
      path: `/some/path/${i}.png`,
      name: `${i}.png`,
      seen: i < 16 || i >= 32,
      index: i,
    }))
    Pictures.current = {
      name: 'foo',
      path: 'bar',
      seen: true,
      index: 24,
    }
    choosePictureIndexSpy = vi.spyOn(Internals, 'choosePictureIndex').mockReturnValue(24)
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
    it(`${title}: should return undefined when current image null`, () => {
      Pictures.current = null
      const result = getPicture(navi)
      expect(result).toBe(undefined)
    })
    it(`${title}: should return undefined when current image index missing`, () => {
      Pictures.current = {
        name: 'foo',
        path: 'bar',
        seen: true,
      }
      const result = getPicture(navi)
      expect(result).toBe(undefined)
    })
    it(`${title}: should call choosePictureIndex once`, () => {
      getPicture(navi)
      expect(choosePictureIndexSpy.mock.calls.length).toBe(1)
    })
    it(`${title}: should call choosePictureIndex with 3 arguments`, () => {
      getPicture(navi)
      expect(choosePictureIndexSpy.mock.calls[0]).toHaveLength(3)
    })
    it(`${title}: should pass navigation option to choosePictureIndex`, () => {
      getPicture(navi)
      expect(choosePictureIndexSpy.mock.calls[0]?.[0]).toBe(navi)
    })
    it(`${title}: should pass current index to choosePictureIndex`, () => {
      assert(Pictures.current !== null)
      Pictures.current.index = 77
      getPicture(navi)
      expect(choosePictureIndexSpy.mock.calls[0]?.[1]).toBe(77)
    })
    it(`${title}: should pass empty unread array to choosePictureIndex when all pics read`, () => {
      for (const pic of Pictures.pictures) {
        pic.seen = true
      }
      getPicture(navi)
      expect(choosePictureIndexSpy.mock.calls[0]?.[2]).toEqual([])
    })
    it(`${title}: should pass expected unread array to choosePictureIndex when current before all unread`, () => {
      assert(Pictures.current !== null)
      Pictures.current.index = 3
      getPicture(navi)
      const pics = Pictures.pictures.slice(16, 32)
      expect(choosePictureIndexSpy.mock.calls[0]?.[2]).toEqual(pics)
    })
    it(`${title}: should pass expected unread array to choosePictureIndex when current after all unread`, () => {
      assert(Pictures.current !== null)
      Pictures.current.index = 45
      getPicture(navi)
      const pics = Pictures.pictures.slice(16, 32)
      expect(choosePictureIndexSpy.mock.calls[0]?.[2]).toEqual(pics)
    })
    it(`${title}: should pass expected unread array to choosePictureIndex when current between all unread`, () => {
      assert(Pictures.current !== null)
      for (const pic of Pictures.pictures) {
        pic.seen = !pic.seen
      }
      Pictures.current.index = 24
      getPicture(navi)
      const pics = [...Pictures.pictures.slice(32, 64), ...Pictures.pictures.slice(0, 16)]
      expect(choosePictureIndexSpy.mock.calls[0]?.[2]).toEqual(pics)
    })
    it(`${title}: should pass expected unread array to choosePictureIndex when current inside unread chunk`, () => {
      assert(Pictures.current !== null)
      Pictures.current.index = 24
      getPicture(navi)
      const pics = [...Pictures.pictures.slice(25, 32), ...Pictures.pictures.slice(16, 24)]
      expect(choosePictureIndexSpy.mock.calls[0]?.[2]).toEqual(pics)
    })
    it(`${title}: should return selected index picture`, () => {
      const [, , , , , pic] = Pictures.pictures
      assert(pic !== undefined)
      choosePictureIndexSpy.mockReturnValue(5)
      const result = getPicture(navi)
      expect(result).toEqual(pic)
    })
    it(`${title}: should return undefined for negative index picture`, () => {
      choosePictureIndexSpy.mockReturnValue(-9)
      const result = getPicture(navi)
      expect(result).toBe(undefined)
    })
    it(`${title}: should return undefiend for out of bounds index`, () => {
      choosePictureIndexSpy.mockReturnValue(65535)
      const result = getPicture(navi)
      expect(result).toBe(undefined)
    })
  })
})

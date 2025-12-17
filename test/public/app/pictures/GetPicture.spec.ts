'use sanity'

import Sinon from 'sinon'
import { NavigateTo, Pictures } from '../../../../public/scripts/app/pictures'
import { expect } from 'chai'
import assert from 'assert'

describe('public/app/pictures function GetPicture()', () => {
  let choosePictureIndexSpy = Sinon.stub()
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
    choosePictureIndexSpy = Sinon.stub(Pictures, 'ChoosePictureIndex').returns(24)
  })
  afterEach(() => {
    choosePictureIndexSpy.restore()
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
      const result = Pictures.GetPicture(navi)
      expect(result).to.equal(undefined)
    })
    it(`${title}: should return undefined when current image index missing`, () => {
      Pictures.current = {
        name: 'foo',
        path: 'bar',
        seen: true,
      }
      const result = Pictures.GetPicture(navi)
      expect(result).to.equal(undefined)
    })
    it(`${title}: should call ChoosePictureIndex to choose image Id`, () => {
      Pictures.GetPicture(navi)
      expect(choosePictureIndexSpy.callCount).to.equal(1)
      expect(choosePictureIndexSpy.firstCall.args).to.have.lengthOf(3)
    })
    it(`${title}: should pass navigation option to ChoosePictureIndex`, () => {
      Pictures.GetPicture(navi)
      expect(choosePictureIndexSpy.firstCall.args[0]).to.equal(navi)
    })
    it(`${title}: should pass current index to ChoosePictureIndex`, () => {
      assert(Pictures.current != null)
      Pictures.current.index = 77
      Pictures.GetPicture(navi)
      expect(choosePictureIndexSpy.firstCall.args[1]).to.equal(77)
    })
    it(`${title}: should pass empty unread array to ChoosePictureIndex when all pics read`, () => {
      for (const pic of Pictures.pictures) {
        pic.seen = true
      }
      Pictures.GetPicture(navi)
      expect(choosePictureIndexSpy.firstCall.args[2]).to.deep.equal([])
    })
    it(`${title}: should pass expected unread array to ChoosePictureIndex when current before all unread`, () => {
      assert(Pictures.current != null)
      Pictures.current.index = 3
      Pictures.GetPicture(navi)
      const pics = Pictures.pictures.slice(16, 32)
      expect(choosePictureIndexSpy.firstCall.args[2]).to.deep.equal(pics)
    })
    it(`${title}: should pass expected unread array to ChoosePictureIndex when current after all unread`, () => {
      assert(Pictures.current != null)
      Pictures.current.index = 45
      Pictures.GetPicture(navi)
      const pics = Pictures.pictures.slice(16, 32)
      expect(choosePictureIndexSpy.firstCall.args[2]).to.deep.equal(pics)
    })
    it(`${title}: should pass expected unread array to ChoosePictureIndex when current between all unread`, () => {
      assert(Pictures.current != null)
      for (const pic of Pictures.pictures) {
        pic.seen = !pic.seen
      }
      Pictures.current.index = 24
      Pictures.GetPicture(navi)
      const pics = [...Pictures.pictures.slice(32, 64), ...Pictures.pictures.slice(0, 16)]
      expect(choosePictureIndexSpy.firstCall.args[2]).to.deep.equal(pics)
    })
    it(`${title}: should pass expected unread array to ChoosePictureIndex when current inside unread chunk`, () => {
      assert(Pictures.current != null)
      Pictures.current.index = 24
      Pictures.GetPicture(navi)
      const pics = [...Pictures.pictures.slice(25, 32), ...Pictures.pictures.slice(16, 24)]
      expect(choosePictureIndexSpy.firstCall.args[2]).to.deep.equal(pics)
    })
    it('should return selected index picture', () => {
      const pic = Pictures.pictures[5]
      assert(pic != null)
      choosePictureIndexSpy.returns(5)
      const result = Pictures.GetPicture(navi)
      expect(result).to.deep.equal(pic)
    })
    it('should return undefined for negative index picture', () => {
      choosePictureIndexSpy.returns(-9)
      const result = Pictures.GetPicture(navi)
      expect(result).to.equal(undefined)
    })
    it('should return undefiend for out of bounds index', () => {
      choosePictureIndexSpy.returns(65535)
      const result = Pictures.GetPicture(navi)
      expect(result).to.equal(undefined)
    })
  })
})

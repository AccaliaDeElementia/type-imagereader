'use sanity'

import { JSDOM } from 'jsdom'
import { mountDom, unmountDom } from '#testutils/dom.js'
import { Internals } from '#public/scripts/app/pictureMarkup.js'
import { resetPubSub } from '#testutils/pubsub.js'
import type { Picture } from '#contracts/listing.js'
import type { MockInstance } from 'vitest'

describe('public/app/pictures makePicturesPage()', () => {
  let dom = new JSDOM('<html></html>', {})
  let makePictureCardSpy: MockInstance = vi.fn()
  beforeEach(() => {
    dom = new JSDOM('<html></html>', {
      url: 'http://127.0.0.1:2999',
    })
    mountDom(dom)
    resetPubSub()
    makePictureCardSpy = vi
      .spyOn(Internals, 'makePictureCard')
      .mockImplementation((..._args: unknown[]) => undefined)
      .mockImplementation(() => dom.window.document.createElement('div'))
  })
  afterEach(() => {
    vi.restoreAllMocks()
    unmountDom()
  })
  it('should return div element', () => {
    const page = Internals.makePicturesPage(666, [])
    expect(page).toBeInstanceOf(dom.window.HTMLDivElement)
  })
  it('should return page classed element', () => {
    const page = Internals.makePicturesPage(666, [])
    expect(page.classList.contains('page')).toBe(true)
  })
  it('should set page number on input pictures', () => {
    const pic: Picture = {
      name: '',
      path: '',
      seen: false,
    }
    Internals.makePicturesPage(69, [pic])
    expect(pic.page).toBe(69)
  })
  it('should call makePictureCard once per picture', () => {
    Internals.makePicturesPage(69, [{ name: '', path: '', seen: false }])
    expect(makePictureCardSpy.mock.calls.length).toBe(1)
  })
  it('should call makePictureCard with 1 argument', () => {
    Internals.makePicturesPage(69, [{ name: '', path: '', seen: false }])
    expect(makePictureCardSpy.mock.calls[0]).toHaveLength(1)
  })
  it('should pass the picture to makePictureCard', () => {
    const pic: Picture = { name: '', path: '', seen: false }
    Internals.makePicturesPage(69, [pic])
    expect(makePictureCardSpy.mock.calls[0]?.[0]).toBe(pic)
  })
  it('should save card element to picture on success', () => {
    const picture: Picture = { name: 'foo', path: '/foo/bar/baz.jpg', seen: false }
    const card = dom.window.document.createElement('div')
    makePictureCardSpy.mockReturnValue(card)
    Internals.makePicturesPage(69, [picture])
    expect(Object.keys(picture)).toContain('element')
  })
  it('should save the returned card as the picture element', () => {
    const picture: Picture = { name: 'foo', path: '/foo/bar/baz.jpg', seen: false }
    const card = dom.window.document.createElement('div')
    makePictureCardSpy.mockReturnValue(card)
    Internals.makePicturesPage(69, [picture])
    expect(picture.element).toBe(card)
  })
  it('should not set page number when card creation fails', () => {
    const pic: Picture = {
      name: '',
      path: '',
      seen: false,
    }
    makePictureCardSpy.mockReturnValue(undefined)
    Internals.makePicturesPage(69, [pic])
    expect(pic.page).toBe(undefined)
  })
  it('should add all cards to built page', () => {
    const pics = Array.from({ length: 50 }).map(
      (_, i): Picture => ({
        name: `${i}`,
        path: `${i}`,
        seen: false,
      }),
    )
    const page = Internals.makePicturesPage(1, pics)
    expect(page.children).toHaveLength(50)
  })
  it('should add card to built page', () => {
    const pic: Picture = {
      name: '',
      path: '',
      seen: false,
    }
    const card = dom.window.document.createElement('div')
    makePictureCardSpy.mockReturnValue(card)
    const page = Internals.makePicturesPage(69, [pic])
    expect(page.firstChild).toBe(card)
  })
})

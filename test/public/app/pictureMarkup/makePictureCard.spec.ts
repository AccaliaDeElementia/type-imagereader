'use sanity'

import { JSDOM } from 'jsdom'
import { mountDom, unmountDom } from '#testutils/dom.js'
import { Grid, Imports, Internals } from '#public/scripts/app/pictureMarkup.js'
import { cast } from '#testutils/typeGuards.js'
import { publishedData, resetPubSub } from '#testutils/pubsub.js'
import type { MockInstance } from 'vitest'

describe('public/app/pictures makePictureCard()', () => {
  let dom = new JSDOM('<html></html>', {})
  let publishStub: MockInstance = vi.fn()
  beforeEach(() => {
    dom = new JSDOM('<html></html>', {
      url: 'http://127.0.0.1:2999',
    })
    mountDom(dom)
    resetPubSub()
    publishStub = vi.spyOn(Imports, 'publish').mockImplementation((..._args: unknown[]) => undefined)
    const template = dom.window.document.createElement('div')
    template.innerHTML =
      '<template id="ImageCard><div class="card"><div class="card-body"><h5>placeholder</h5></div></div></template>'
    Grid.imageCard = cast<HTMLTemplateElement>(template.firstChild)
  })
  afterEach(() => {
    unmountDom()
  })
  it('should return an HTMLElement on failure', () => {
    Grid.imageCard = null
    const card = Internals.makePictureCard({
      name: 'foo',
      path: '/foo/bar/baz.jpg',
      seen: false,
    })
    expect(card).toBe(undefined)
  })
  it('should return an HTMLElement on success', () => {
    const card = Internals.makePictureCard({
      name: 'foo',
      path: '/foo/bar/baz.jpg',
      seen: false,
    })
    expect(card).toBeInstanceOf(dom.window.HTMLElement)
  })
  it('should set background image data attribute on success', () => {
    const card = Internals.makePictureCard({
      name: 'foo',
      path: '/foo/bar/baz.jpg',
      seen: false,
    })
    expect(card?.getAttribute('data-backgroundImage')).toBe('url("/images/preview/foo/bar/baz.jpg-image.webp")')
  })
  it('should add seen class when input is seen', () => {
    const card = Internals.makePictureCard({
      name: 'foo',
      path: '/foo/bar/baz.jpg',
      seen: true,
    })
    expect(card?.classList.contains('seen')).toBe(true)
  })
  it('should not add seen class when input is unseen', () => {
    const card = Internals.makePictureCard({
      name: 'foo',
      path: '/foo/bar/baz.jpg',
      seen: false,
    })
    expect(card?.classList.contains('seen')).toBe(false)
  })
  it('should set image title', () => {
    const card = Internals.makePictureCard({
      name: 'Foobar 9001',
      path: '/foo/bar/baz.jpg',
      seen: false,
    })
    expect(card?.querySelector('h5')?.innerHTML).toBe('Foobar 9001')
  })
  it('should register click handler', () => {
    const card = Internals.makePictureCard({
      name: 'Foobar 9001',
      path: '/foo/bar/baz.jpg',
      seen: false,
    })
    const evt = new dom.window.MouseEvent('click')
    card?.dispatchEvent(evt)
    expect(publishStub.mock.calls.some((c) => c[0] === 'Pictures:Change')).toBe(true)
  })
  it('should publish Pictures:Change once on click event', () => {
    const pic = { name: 'Foobar 9001', path: '/foo/bar/baz.jpg', seen: false }
    const card = Internals.makePictureCard(pic)
    card?.dispatchEvent(new dom.window.MouseEvent('click'))
    expect(publishStub.mock.calls.filter((c) => c[0] === 'Pictures:Change').length).toBe(1)
  })
  it('should pass the picture as Pictures:Change data on click event', () => {
    const pic = { name: 'Foobar 9001', path: '/foo/bar/baz.jpg', seen: false }
    const card = Internals.makePictureCard(pic)
    card?.dispatchEvent(new dom.window.MouseEvent('click'))
    expect(publishedData(publishStub, 'Pictures:Change')).toBe(pic)
  })
  it('should hide menu on click event', () => {
    const pic = {
      name: 'Foobar 9001',
      path: '/foo/bar/baz.jpg',
      seen: false,
    }
    const card = Internals.makePictureCard(pic)
    const evt = new dom.window.MouseEvent('click')
    card?.dispatchEvent(evt)
    expect(publishStub.mock.calls.filter((c) => c[0] === 'Menu:Hide').length).toBe(1)
  })
})

'use sanity'

import { JSDOM } from 'jsdom'
import { mountDom, unmountDom } from '#testutils/dom.js'
import { Pictures } from '#public/scripts/app/pictureState.js'
import { loadCurrentPageImages } from '#public/scripts/app/pictureMarkup.js'
import { resetPubSub } from '#testutils/pubsub.js'

describe('public/app/pictures loadCurrentPageImages()', () => {
  let dom = new JSDOM('<html></html>', {})
  beforeEach(() => {
    dom = new JSDOM('<html></html>', {
      url: 'http://127.0.0.1:2999',
    })
    mountDom(dom)
    resetPubSub()
    Pictures.mainImage = null
  })
  afterEach(() => {
    vi.restoreAllMocks()
    unmountDom()
  })
  it('should gracefully handle no tabs existing', () => {
    expect(() => {
      loadCurrentPageImages()
    }).not.toThrow()
  })
  it('should not throw when only hidden tab exists', () => {
    const container = dom.window.document.createElement('div')
    container.id = 'tabImages'
    const page = dom.window.document.createElement('div')
    page.classList.add('page')
    page.classList.add('hidden')
    container.appendChild(page)
    const card = dom.window.document.createElement('div')
    card.classList.add('card')
    card.setAttribute('data-backgroundImage', 'url("/images/preview.webp")')
    page.appendChild(card)
    dom.window.document.body.appendChild(container)
    expect(() => {
      loadCurrentPageImages()
    }).not.toThrow()
  })
  it('should not modify backgroundImage when only hidden tab exists', () => {
    const container = dom.window.document.createElement('div')
    container.id = 'tabImages'
    const page = dom.window.document.createElement('div')
    page.classList.add('page')
    page.classList.add('hidden')
    container.appendChild(page)
    const card = dom.window.document.createElement('div')
    card.classList.add('card')
    card.setAttribute('data-backgroundImage', 'url("/images/preview.webp")')
    page.appendChild(card)
    dom.window.document.body.appendChild(container)
    loadCurrentPageImages()
    expect(card.style.backgroundImage).toBe('')
  })
  it('should not throw when card is missing data-backgroundImage attribute', () => {
    const container = dom.window.document.createElement('div')
    container.id = 'tabImages'
    const page = dom.window.document.createElement('div')
    page.classList.add('page')
    container.appendChild(page)
    const card = dom.window.document.createElement('div')
    card.classList.add('card')
    page.appendChild(card)
    dom.window.document.body.appendChild(container)
    expect(() => {
      loadCurrentPageImages()
    }).not.toThrow()
  })
  it('should not modify backgroundImage when card is missing data-backgroundImage attribute', () => {
    const container = dom.window.document.createElement('div')
    container.id = 'tabImages'
    const page = dom.window.document.createElement('div')
    page.classList.add('page')
    container.appendChild(page)
    const card = dom.window.document.createElement('div')
    card.classList.add('card')
    page.appendChild(card)
    dom.window.document.body.appendChild(container)
    loadCurrentPageImages()
    expect(card.style.backgroundImage).toBe('')
  })
  it('should set backgroundImage style for non hidden page', () => {
    const container = dom.window.document.createElement('div')
    container.id = 'tabImages'
    dom.window.document.body.appendChild(container)
    const page = dom.window.document.createElement('div')
    page.classList.add('page')
    container.appendChild(page)
    const card = dom.window.document.createElement('div')
    card.classList.add('card')
    card.setAttribute('data-backgroundImage', 'url("/images/preview.webp")')
    page.appendChild(card)

    expect(card.style.backgroundImage).toBe('')
    loadCurrentPageImages()
    expect(card.style.backgroundImage).toBe('url("/images/preview.webp")')
  })
})

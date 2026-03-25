'use sanity'

import { expect } from 'chai'
import Sinon from 'sinon'

import { JSDOM } from 'jsdom'
import { Pictures } from '#public/scripts/app/pictures'
import { PubSub } from '#public/scripts/app/pubsub'
import { Cast } from '#testutils/TypeGuards'
import { resetPubSub } from '#testutils/PubSub'

const sandbox = Sinon.createSandbox()

describe('public/app/pictures function LoadCurrentPageImages()', () => {
  const existingWindow = global.window
  const existingDocument = global.document
  let dom = new JSDOM('<html></html>', {})
  const selectPageSpy = Sinon.stub().resolves()
  const loadingErrorSpy = Sinon.stub().resolves()
  beforeEach(() => {
    dom = new JSDOM('<html></html>', {
      url: 'http://127.0.0.1:2999',
    })
    global.window = Cast<Window & typeof globalThis>(dom.window)
    global.document = dom.window.document
    selectPageSpy.resetHistory()
    loadingErrorSpy.resetHistory()
    resetPubSub()
    PubSub.subscribers = {
      'PICTURES:SELECTPAGE': [selectPageSpy],
      'LOADING:ERROR': [loadingErrorSpy],
    }
    Pictures.mainImage = null
    Pictures.imageCard = null
  })
  afterEach(() => {
    sandbox.restore()
    global.window = existingWindow
    global.document = existingDocument
  })
  it('should gracefully handle no tabs existing', () => {
    expect(() => {
      Pictures.LoadCurrentPageImages()
    }).to.not.throw()
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
      Pictures.LoadCurrentPageImages()
    }).to.not.throw()
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
    Pictures.LoadCurrentPageImages()
    expect(card.style.backgroundImage).to.equal('')
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
      Pictures.LoadCurrentPageImages()
    }).to.not.throw()
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
    Pictures.LoadCurrentPageImages()
    expect(card.style.backgroundImage).to.equal('')
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

    expect(card.style.backgroundImage).to.equal('')
    Pictures.LoadCurrentPageImages()
    expect(card.style.backgroundImage).to.equal('url("/images/preview.webp")')
  })
})

'use sanity'

import { expect } from 'chai'
import { JSDOM } from 'jsdom'
import { render } from 'pug'
import { Cast } from '../../../testutils/TypeGuards'
import Sinon from 'sinon'
import { Pictures } from '../../../../public/scripts/app/pictures'
import { PubSub } from '../../../../public/scripts/app/pubsub'
import assert from 'assert'

const markup = `
html
  body
    div.selectUnreadAll
      div
        span.all Show All
        span.unread Show Unread
    div#mainMenu
    div#bigImage
      img.hidden
    div.tab-list
      ul
        li
          a(href="#tabImages") Pictures
    div#tabImages
    div#screenText
      div.statusBar.top
        div.left
        div.center
        div.right
      div.statusBar.bottom
        div.left
        div.center
        div.right
    template#ImageCard
      div.card
        div.card-body
          h5 placeholder
    template#PaginatorItem
      li.page-item
        a.page-link(href='#')
          span(aria-hidden='true')
    template#Paginator
      nav.pages
        ul.pagination
`

describe('public/app/pictures function ResetMarkup()', () => {
  const existingWindow = global.window
  const existingDocument = global.document
  let dom = new JSDOM(render(markup), {})
  const loadingErrorSpy = Sinon.stub().resolves()
  const loadingHideSpy = Sinon.stub().resolves()
  beforeEach(() => {
    dom = new JSDOM(render(markup), {
      url: 'http://127.0.0.1:2999',
    })
    global.window = Cast<Window & typeof globalThis>(dom.window)
    global.document = dom.window.document
    loadingErrorSpy.resetHistory()
    PubSub.subscribers = {
      'LOADING:ERROR': [loadingErrorSpy],
      'LOADING:HIDE': [loadingHideSpy],
    }
    PubSub.deferred = []
    Pictures.mainImage = null
    Pictures.imageCard = null
  })
  afterEach(() => {
    global.window = existingWindow
    global.document = existingDocument
  })
  after(() => {
    Sinon.restore()
  })
  it('should set mainImage node', () => {
    Pictures.ResetMarkup()
    expect(Pictures.mainImage).to.not.equal(null)
  })
  it('should set imageCard node', () => {
    Pictures.ResetMarkup()
    expect(Pictures.imageCard).to.not.equal(null)
  })
  it('should tolerate missing mainImage node', () => {
    const node = dom.window.document.querySelector('#bigImage')
    assert(node != null)
    node.parentElement?.removeChild(node)
    Pictures.ResetMarkup()
    expect(Pictures.mainImage).to.equal(null)
  })
  it('should tolerate missing imageCard node', () => {
    const node = dom.window.document.querySelector('#ImageCard')
    assert(node != null)
    node.parentElement?.removeChild(node)
    Pictures.ResetMarkup()
    expect(Pictures.imageCard).to.equal(null)
  })
  it('should remove existing .pages from #tabImages', () => {
    const tab = dom.window.document.querySelector('#tabImages')
    assert(tab != null)
    for (let i = 0; i < 15; i++) {
      const node = dom.window.document.createElement('div')
      node.classList.add('pages')
      tab.appendChild(node)
    }
    Pictures.ResetMarkup()
    expect(tab.children).to.have.lengthOf(0)
  })
  it('should remove existing .page nodes from #tabImages', () => {
    const tab = dom.window.document.querySelector('#tabImages')
    assert(tab != null)
    for (let i = 0; i < 15; i++) {
      const node = dom.window.document.createElement('div')
      node.classList.add('page')
      tab.appendChild(node)
    }
    Pictures.ResetMarkup()
    expect(tab.children).to.have.lengthOf(0)
  })
  it('should preserve existing non .page nodes from #tabImages', () => {
    const tab = dom.window.document.querySelector('#tabImages')
    assert(tab != null)
    for (let i = 0; i < 15; i++) {
      const node = dom.window.document.createElement('div')
      node.classList.add('foo')
      tab.appendChild(node)
    }
    Pictures.ResetMarkup()
    expect(tab.children).to.have.lengthOf(15)
  })
  const positions: Array<[string, string]> = [
    ['top', 'left'],
    ['top', 'center'],
    ['top', 'right'],
    ['bottom', 'left'],
    ['bottom', 'center'],
    ['bottom', 'right'],
  ]
  positions.forEach(([x, y]) => {
    it(`should clear ${x} ${y} status bar label`, () => {
      const node = dom.window.document.querySelector(`.statusBar.${x} .${y}`)
      assert(node != null)
      node.innerHTML = '<span>FOO</span>'
      Pictures.ResetMarkup()
      expect(node.innerHTML).to.equal('')
    })
  })
  it('should clear src of mainImage', () => {
    const img = dom.window.document.querySelector<HTMLImageElement>('#bigImage img')
    assert(img != null)
    img.src = 'https://127.0.0.1:42069/blaze.gif'
    Pictures.ResetMarkup()
    expect(img.src).to.equal('http://127.0.0.1:2999/') // not blank due to how jsdom handles URIs
  })
  it('should publish Loading:Hide on mainImage load event', () => {
    const img = dom.window.document.querySelector<HTMLImageElement>('#bigImage img')
    assert(img != null)
    const evt = new dom.window.Event('load')
    Pictures.ResetMarkup()
    expect(loadingHideSpy.called).to.equal(false)
    img.dispatchEvent(evt)
    expect(loadingHideSpy.called).to.equal(true)
  })
  it('should publish Loading:Error on mainImage error event with src set', () => {
    const img = dom.window.document.querySelector<HTMLImageElement>('#bigImage img')
    assert(img != null)
    const evt = new dom.window.ErrorEvent('error')
    Pictures.ResetMarkup()
    img.setAttribute('src', 'https://127.0.0.1:42069/blaze.gif')
    expect(loadingErrorSpy.called).to.equal(false)
    img.dispatchEvent(evt)
    expect(loadingErrorSpy.called).to.equal(true)
  })
  it('should not publish Loading:Error on mainImage error event with src empty', () => {
    const img = dom.window.document.querySelector<HTMLImageElement>('#bigImage img')
    assert(img != null)
    const evt = new dom.window.ErrorEvent('error')
    Pictures.ResetMarkup()
    img.setAttribute('src', '')
    img.dispatchEvent(evt)
    expect(loadingErrorSpy.called).to.equal(false)
  })
  it('should publish expected error message when load fails and no current image', () => {
    const img = dom.window.document.querySelector<HTMLImageElement>('#bigImage img')
    assert(img != null)
    const evt = new dom.window.ErrorEvent('error')
    Pictures.ResetMarkup()
    img.setAttribute('src', 'https://127.0.0.1:42069/blaze.gif')
    Pictures.current = null
    img.dispatchEvent(evt)
    expect(loadingErrorSpy.firstCall.args[0]).to.equal('Main Image Failed to Load: undefined')
  })
  it('should publish expected error message when load fails and invalid current image', () => {
    const img = dom.window.document.querySelector<HTMLImageElement>('#bigImage img')
    assert(img != null)
    const evt = new dom.window.ErrorEvent('error')
    Pictures.ResetMarkup()
    img.setAttribute('src', 'https://127.0.0.1:42069/blaze.gif')
    Pictures.current = { name: Cast<string>(null), path: '', seen: false }
    img.dispatchEvent(evt)
    expect(loadingErrorSpy.firstCall.args[0]).to.equal('Main Image Failed to Load: null')
  })
  it('should publish expected error message when load fails', () => {
    const img = dom.window.document.querySelector<HTMLImageElement>('#bigImage img')
    assert(img != null)
    const evt = new dom.window.ErrorEvent('error')
    Pictures.ResetMarkup()
    img.setAttribute('src', 'https://127.0.0.1:42069/blaze.gif')
    Pictures.current = { name: 'blaze.gif', path: '', seen: false }
    img.dispatchEvent(evt)
    expect(loadingErrorSpy.firstCall.args[0]).to.equal('Main Image Failed to Load: blaze.gif')
  })
})

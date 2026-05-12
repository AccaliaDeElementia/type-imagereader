'use sanity'

import { JSDOM } from 'jsdom'
import { mountDom, unmountDom } from '#testutils/dom.js'
import { render } from 'pug'
import { cast } from '#testutils/typeGuards.js'
import Sinon from 'sinon'
import { Pictures } from '#public/scripts/app/pictureState.js'
import { Grid, Imports, resetMarkup } from '#public/scripts/app/pictureMarkup.js'
import assert from 'node:assert'
import { publishedData, resetPubSub } from '#testutils/pubsub.js'

const sandbox = Sinon.createSandbox()

const markup = `
html
  body
    div#bigImage
      img.hidden
    div#tabImages
    template#ImageCard
      div.card
        div.card-body
          h5 placeholder
    div#screenText
      div.statusBar.top
        div.left
        div.center
        div.right
      div.statusBar.bottom
        div.left
        div.center
        div.right
`

describe('public/app/pictureMarkup resetMarkup()', () => {
  let dom = new JSDOM(render(markup), {})
  let publishStub = sandbox.stub()
  beforeEach(() => {
    dom = new JSDOM(render(markup), {
      url: 'http://127.0.0.1:2999',
    })
    mountDom(dom)
    resetPubSub()
    publishStub = sandbox.stub(Imports, 'publish')
    Pictures.mainImage = null
    Pictures.current = null
    Grid.imageCard = null
  })
  afterEach(() => {
    sandbox.restore()
    unmountDom()
  })

  it('should set mainImage node', () => {
    resetMarkup()
    expect(Pictures.mainImage).not.toBe(null)
  })
  it('should tolerate missing mainImage node', () => {
    const node = dom.window.document.querySelector('#bigImage')
    assert(node !== null)
    node.parentElement?.removeChild(node)
    resetMarkup()
    expect(Pictures.mainImage).toBe(null)
  })
  it('should set imageCard node', () => {
    resetMarkup()
    expect(Grid.imageCard).not.toBe(null)
  })
  it('should tolerate missing imageCard node', () => {
    const node = dom.window.document.querySelector('#ImageCard')
    assert(node !== null)
    node.parentElement?.removeChild(node)
    resetMarkup()
    expect(Grid.imageCard).toBe(null)
  })
  it('should remove existing .pages from #tabImages', () => {
    const tab = dom.window.document.querySelector('#tabImages')
    assert(tab !== null)
    for (let i = 0; i < 15; i += 1) {
      const node = dom.window.document.createElement('div')
      node.classList.add('pages')
      tab.appendChild(node)
    }
    resetMarkup()
    expect(tab.children).toHaveLength(0)
  })
  it('should remove existing .page nodes from #tabImages', () => {
    const tab = dom.window.document.querySelector('#tabImages')
    assert(tab !== null)
    for (let i = 0; i < 15; i += 1) {
      const node = dom.window.document.createElement('div')
      node.classList.add('page')
      tab.appendChild(node)
    }
    resetMarkup()
    expect(tab.children).toHaveLength(0)
  })
  it('should preserve existing non .page nodes from #tabImages', () => {
    const tab = dom.window.document.querySelector('#tabImages')
    assert(tab !== null)
    for (let i = 0; i < 15; i += 1) {
      const node = dom.window.document.createElement('div')
      node.classList.add('foo')
      tab.appendChild(node)
    }
    resetMarkup()
    expect(tab.children).toHaveLength(15)
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
      assert(node !== null)
      node.innerHTML = '<span>FOO</span>'
      resetMarkup()
      expect(node.innerHTML).toBe('')
    })
  })
  it('should clear src of mainImage', () => {
    const img = dom.window.document.querySelector<HTMLImageElement>('#bigImage img')
    assert(img !== null)
    img.src = 'https://127.0.0.1:42069/blaze.gif'
    resetMarkup()
    expect(img.src).toBe('http://127.0.0.1:2999/') // not blank due to how jsdom handles URIs
  })
  it('should publish Loading:Hide on mainImage load event', () => {
    const img = dom.window.document.querySelector<HTMLImageElement>('#bigImage img')
    assert(img !== null)
    const evt = new dom.window.Event('load')
    resetMarkup()
    expect(publishStub.withArgs('Loading:Hide').called).toBe(false)
    img.dispatchEvent(evt)
    expect(publishStub.withArgs('Loading:Hide').called).toBe(true)
  })
  it('should publish Loading:Error on mainImage error event with src set', () => {
    const img = dom.window.document.querySelector<HTMLImageElement>('#bigImage img')
    assert(img !== null)
    const evt = new dom.window.ErrorEvent('error')
    resetMarkup()
    img.setAttribute('src', 'https://127.0.0.1:42069/blaze.gif')
    expect(publishStub.withArgs('Loading:Error').called).toBe(false)
    img.dispatchEvent(evt)
    expect(publishStub.withArgs('Loading:Error').called).toBe(true)
  })
  it('should not publish Loading:Error on mainImage error event with src empty', () => {
    const img = dom.window.document.querySelector<HTMLImageElement>('#bigImage img')
    assert(img !== null)
    const evt = new dom.window.ErrorEvent('error')
    resetMarkup()
    img.setAttribute('src', '')
    img.dispatchEvent(evt)
    expect(publishStub.withArgs('Loading:Error').called).toBe(false)
  })
  it('should publish expected error message when load fails and no current image', () => {
    const img = dom.window.document.querySelector<HTMLImageElement>('#bigImage img')
    assert(img !== null)
    const evt = new dom.window.ErrorEvent('error')
    resetMarkup()
    img.setAttribute('src', 'https://127.0.0.1:42069/blaze.gif')
    Pictures.current = null
    img.dispatchEvent(evt)
    expect(publishedData(publishStub, 'Loading:Error')).toBe('Main Image Failed to Load: undefined')
  })
  it('should publish expected error message when load fails and invalid current image', () => {
    const img = dom.window.document.querySelector<HTMLImageElement>('#bigImage img')
    assert(img !== null)
    const evt = new dom.window.ErrorEvent('error')
    resetMarkup()
    img.setAttribute('src', 'https://127.0.0.1:42069/blaze.gif')
    Pictures.current = { name: cast<string>(null), path: '', seen: false }
    img.dispatchEvent(evt)
    expect(publishedData(publishStub, 'Loading:Error')).toBe('Main Image Failed to Load: null')
  })
  it('should publish expected error message when load fails', () => {
    const img = dom.window.document.querySelector<HTMLImageElement>('#bigImage img')
    assert(img !== null)
    const evt = new dom.window.ErrorEvent('error')
    resetMarkup()
    img.setAttribute('src', 'https://127.0.0.1:42069/blaze.gif')
    Pictures.current = { name: 'blaze.gif', path: '', seen: false }
    img.dispatchEvent(evt)
    expect(publishedData(publishStub, 'Loading:Error')).toBe('Main Image Failed to Load: blaze.gif')
  })
})

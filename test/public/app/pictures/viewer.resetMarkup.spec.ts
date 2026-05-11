'use sanity'

import { JSDOM } from 'jsdom'
import { mountDom, unmountDom } from '#testutils/dom.js'
import { render } from 'pug'
import { cast } from '#testutils/typeGuards.js'
import Sinon from 'sinon'
import { Pictures } from '#public/scripts/app/pictures/state.js'
import { resetMarkup } from '#public/scripts/app/pictures/viewer.js'
import { PubSub } from '#public/scripts/app/pubsub.js'
import assert from 'node:assert'
import { resetPubSub } from '#testutils/pubsub.js'

const sandbox = Sinon.createSandbox()

const markup = `
html
  body
    div#bigImage
      img.hidden
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

describe('public/app/pictures resetMarkup()', () => {
  let dom = new JSDOM(render(markup), {})
  const loadingErrorSpy = sandbox.stub().resolves()
  const loadingHideSpy = sandbox.stub().resolves()
  beforeEach(() => {
    dom = new JSDOM(render(markup), {
      url: 'http://127.0.0.1:2999',
    })
    mountDom(dom)
    loadingErrorSpy.resetHistory()
    loadingHideSpy.resetHistory()
    resetPubSub()
    PubSub.subscribers = {
      'LOADING:ERROR': [loadingErrorSpy],
      'LOADING:HIDE': [loadingHideSpy],
    }
    Pictures.mainImage = dom.window.document.querySelector<HTMLImageElement>('#bigImage img')
    Pictures.current = null
  })
  afterEach(() => {
    sandbox.restore()
    unmountDom()
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
    expect(loadingHideSpy.called).toBe(false)
    img.dispatchEvent(evt)
    expect(loadingHideSpy.called).toBe(true)
  })
  it('should publish Loading:Error on mainImage error event with src set', () => {
    const img = dom.window.document.querySelector<HTMLImageElement>('#bigImage img')
    assert(img !== null)
    const evt = new dom.window.ErrorEvent('error')
    resetMarkup()
    img.setAttribute('src', 'https://127.0.0.1:42069/blaze.gif')
    expect(loadingErrorSpy.called).toBe(false)
    img.dispatchEvent(evt)
    expect(loadingErrorSpy.called).toBe(true)
  })
  it('should not publish Loading:Error on mainImage error event with src empty', () => {
    const img = dom.window.document.querySelector<HTMLImageElement>('#bigImage img')
    assert(img !== null)
    const evt = new dom.window.ErrorEvent('error')
    resetMarkup()
    img.setAttribute('src', '')
    img.dispatchEvent(evt)
    expect(loadingErrorSpy.called).toBe(false)
  })
  it('should publish expected error message when load fails and no current image', () => {
    const img = dom.window.document.querySelector<HTMLImageElement>('#bigImage img')
    assert(img !== null)
    const evt = new dom.window.ErrorEvent('error')
    resetMarkup()
    img.setAttribute('src', 'https://127.0.0.1:42069/blaze.gif')
    Pictures.current = null
    img.dispatchEvent(evt)
    expect(loadingErrorSpy.firstCall.args[0]).toBe('Main Image Failed to Load: undefined')
  })
  it('should publish expected error message when load fails and invalid current image', () => {
    const img = dom.window.document.querySelector<HTMLImageElement>('#bigImage img')
    assert(img !== null)
    const evt = new dom.window.ErrorEvent('error')
    resetMarkup()
    img.setAttribute('src', 'https://127.0.0.1:42069/blaze.gif')
    Pictures.current = { name: cast<string>(null), path: '', seen: false }
    img.dispatchEvent(evt)
    expect(loadingErrorSpy.firstCall.args[0]).toBe('Main Image Failed to Load: null')
  })
  it('should publish expected error message when load fails', () => {
    const img = dom.window.document.querySelector<HTMLImageElement>('#bigImage img')
    assert(img !== null)
    const evt = new dom.window.ErrorEvent('error')
    resetMarkup()
    img.setAttribute('src', 'https://127.0.0.1:42069/blaze.gif')
    Pictures.current = { name: 'blaze.gif', path: '', seen: false }
    img.dispatchEvent(evt)
    expect(loadingErrorSpy.firstCall.args[0]).toBe('Main Image Failed to Load: blaze.gif')
  })
})

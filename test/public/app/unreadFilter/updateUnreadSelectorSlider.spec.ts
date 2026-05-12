'use sanity'

import { JSDOM } from 'jsdom'
import { mountDom, unmountDom } from '#testutils/dom.js'
import { Internals } from '#public/scripts/app/unreadFilter.js'
import { render } from 'pug'
import Sinon from 'sinon'
import assert from 'node:assert'

const sandbox = Sinon.createSandbox()

const markup = `html
  body
    div.selectUnreadAll
      div#slider4test
      `
describe('public/app/pictures setShowUnreadOnly()', () => {
  let dom = new JSDOM('<html></html>')
  let getShowUnreadOnlySpy = sandbox.stub()
  beforeEach(() => {
    dom = new JSDOM(render(markup))
    mountDom(dom)
    getShowUnreadOnlySpy = sandbox.stub(Internals, 'getShowUnreadOnly').returns(false)
  })
  afterEach(() => {
    sandbox.restore()
    unmountDom()
  })
  it('should handle missing target element gracefully', () => {
    const elem = dom.window.document.querySelector('body > div')
    elem?.parentElement?.removeChild(elem)
    expect(() => {
      Internals.updateUnreadSelectorSlider()
    }).not.toThrow()
  })
  it('should remove unread class from slider when value is false', () => {
    const elem = dom.window.document.querySelector('#slider4test')
    assert(elem !== null)
    elem.classList.add('unread')
    Internals.updateUnreadSelectorSlider()
    expect(elem.classList.contains('unread')).toBe(false)
  })
  it('should add all class from slider when value is false', () => {
    const elem = dom.window.document.querySelector('#slider4test')
    assert(elem !== null)
    Internals.updateUnreadSelectorSlider()
    expect(elem.classList.contains('all')).toBe(true)
  })
  it('should add unread class from slider when value is true', () => {
    getShowUnreadOnlySpy.returns(true)
    const elem = dom.window.document.querySelector('#slider4test')
    assert(elem !== null)
    Internals.updateUnreadSelectorSlider()
    expect(elem.classList.contains('unread')).toBe(true)
  })
  it('should remove all class from slider when value is true', () => {
    getShowUnreadOnlySpy.returns(true)
    const elem = dom.window.document.querySelector('#slider4test')
    assert(elem !== null)
    elem.classList.add('all')
    Internals.updateUnreadSelectorSlider()
    expect(elem.classList.contains('all')).toBe(false)
  })
})

'use sanity'

import { expect } from 'chai'

import { JSDOM } from 'jsdom'
import { Pictures } from '../../../../public/scripts/app/pictures'
import { Cast } from '../../../testutils/TypeGuards'
import { render } from 'pug'
import Sinon from 'sinon'
import assert from 'assert'

const markup = `html
  body
    div.selectUnreadAll
      div#slider4test
      `
describe('public/app/pictures function SetShowUnreadOnly()', () => {
  const existingWindow = global.window
  const existingDocument = global.document
  let dom = new JSDOM('<html></html>')
  let getShowUnreadOnlySpy = Sinon.stub()
  beforeEach(() => {
    dom = new JSDOM(render(markup))
    global.window = Cast<Window & typeof globalThis>(dom.window)
    global.document = dom.window.document
    getShowUnreadOnlySpy = Sinon.stub(Pictures, 'GetShowUnreadOnly').returns(false)
  })
  afterEach(() => {
    getShowUnreadOnlySpy.restore()
    global.window = existingWindow
    global.document = existingDocument
  })
  after(() => {
    Sinon.restore()
  })
  it('should handle missing target element gracefully', () => {
    const elem = dom.window.document.querySelector('body > div')
    elem?.parentElement?.removeChild(elem)
    expect(() => {
      Pictures.UpdateUnreadSelectorSlider()
    }).to.not.throw()
  })
  it('should remove unread class from slider when value is false', () => {
    const elem = dom.window.document.querySelector('#slider4test')
    assert(elem != null)
    elem.classList.add('unread')
    Pictures.UpdateUnreadSelectorSlider()
    expect(elem.classList.contains('unread')).to.equal(false)
  })
  it('should add all class from slider when value is false', () => {
    const elem = dom.window.document.querySelector('#slider4test')
    assert(elem != null)
    Pictures.UpdateUnreadSelectorSlider()
    expect(elem.classList.contains('all')).to.equal(true)
  })
  it('should add unread class from slider when value is true', () => {
    getShowUnreadOnlySpy.returns(true)
    const elem = dom.window.document.querySelector('#slider4test')
    assert(elem != null)
    Pictures.UpdateUnreadSelectorSlider()
    expect(elem.classList.contains('unread')).to.equal(true)
  })
  it('should remove all class from slider when value is true', () => {
    getShowUnreadOnlySpy.returns(true)
    const elem = dom.window.document.querySelector('#slider4test')
    assert(elem != null)
    elem.classList.add('all')
    Pictures.UpdateUnreadSelectorSlider()
    expect(elem.classList.contains('all')).to.equal(false)
  })
})
